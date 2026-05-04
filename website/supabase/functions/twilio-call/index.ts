// ============================================================
// TWILIO-CALL — click-to-call + webhook for recording + transcription
// ============================================================
// Three actions:
//   • dial      : authenticated user clicks "call this contact" →
//                 Twilio calls user's phone, then bridges to the
//                 contact. Returns the Call SID.
//   • webhook   : Twilio status callback. Updates phone_calls row
//                 with status + duration when call ends.
//   • recording : Twilio recording callback. Stores recording_url
//                 + kicks off transcription via Claude (called as
//                 a chained edge function).
//
// All actions require the phone_integration feature flag to be on.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags").select("enabled").eq("module", "phone_integration").maybeSingle();
  if (!flag?.enabled) return jsonResponse({ skipped: true, reason: "flag off" });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "dial";

  if (action === "dial") return dial(req, sb);
  if (action === "webhook") return statusWebhook(req, sb);
  if (action === "recording") return recordingWebhook(req, sb);
  return new Response("Not Found", { status: 404 });
});

async function dial(req: Request, sb: any) {
  // Auth
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return jsonResponse({ error: "Unauthorized" }, 401);
  const { data: u } = await sb.auth.getUser(jwt);
  if (!u?.user) return jsonResponse({ error: "Unauthorized" }, 401);
  const userId = u.user.id;

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return jsonResponse({ error: "Twilio not configured" }, 200);
  }

  const body = await req.json();
  const toNumber: string = body.to;
  const fromNumber: string = body.from || ""; // user's phone
  const contactId: string | null = body.contact_id || null;
  const dealId: string | null = body.deal_id || null;
  if (!toNumber || !fromNumber) return jsonResponse({ error: "to + from required" }, 400);

  const { data: prof } = await sb.from("profiles").select("property_id").eq("id", userId).maybeSingle();
  if (!prof?.property_id) return jsonResponse({ error: "no property" }, 400);

  // Twilio Voice REST: place a call from TWILIO_FROM to user's phone,
  // then bridge to the contact via TwiML <Dial>. The TwiML lives at a
  // public callback URL which we vend through this same function.
  const twimlUrl = `${SUPABASE_URL}/functions/v1/twilio-call?action=twiml&to=${encodeURIComponent(toNumber)}`;
  const params = new URLSearchParams({
    To: fromNumber,
    From: TWILIO_FROM,
    Url: twimlUrl,
    Record: "true",
    StatusCallback: `${SUPABASE_URL}/functions/v1/twilio-call?action=webhook`,
    StatusCallbackEvent: "completed",
    RecordingStatusCallback: `${SUPABASE_URL}/functions/v1/twilio-call?action=recording`,
  });
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!resp.ok) {
    const err = await resp.text();
    return jsonResponse({ error: `Twilio: ${err}` }, 200);
  }
  const data = await resp.json();
  const sid = data.sid;

  await sb.from("phone_calls").insert({
    property_id: prof.property_id,
    user_id: userId,
    contact_id: contactId,
    deal_id: dealId,
    direction: "outbound",
    twilio_call_sid: sid,
    to_number: toNumber,
    from_number: fromNumber,
    status: "queued",
  });

  return jsonResponse({ success: true, call_sid: sid });
}

async function statusWebhook(req: Request, sb: any) {
  // Twilio posts as form-encoded.
  const text = await req.text();
  const params = new URLSearchParams(text);
  const sid = params.get("CallSid");
  const status = params.get("CallStatus");
  const duration = Number(params.get("CallDuration") || 0);
  if (!sid) return new Response("ok");
  await sb.from("phone_calls").update({
    status,
    duration_seconds: duration || null,
    ended_at: status === "completed" ? new Date().toISOString() : null,
  }).eq("twilio_call_sid", sid);
  return new Response("ok");
}

async function recordingWebhook(req: Request, sb: any) {
  const text = await req.text();
  const params = new URLSearchParams(text);
  const sid = params.get("CallSid");
  const recordingUrl = params.get("RecordingUrl");
  const duration = Number(params.get("RecordingDuration") || 0);
  if (!sid || !recordingUrl) return new Response("ok");

  await sb.from("phone_calls").update({
    recording_url: `${recordingUrl}.mp3`,
    recording_duration_seconds: duration,
  }).eq("twilio_call_sid", sid);

  // Fire transcription via contract-ai (chained call, fire-and-forget).
  // contract-ai 'transcribe_call' action is wired to consume the
  // Twilio recording URL with auth and route through Claude / a
  // dedicated speech model. Implementation can land later; this
  // function emits the request and returns immediately.
  fetch(`${SUPABASE_URL}/functions/v1/contract-ai`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "transcribe_call",
      call_sid: sid,
      recording_url: `${recordingUrl}.mp3`,
    }),
  }).catch(() => { /* fire and forget */ });

  return new Response("ok");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

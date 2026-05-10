// ============================================================
// TRANSCRIBE-ACTIVITY EDGE FUNCTION
// ============================================================
// Ingests audio (recorded in browser or file uploaded), runs
// Whisper for the transcript, then Claude for structured
// extraction (activity type, summary, action items, sentiment,
// commitment score, contact updates, competitor mentions). The
// extracted output is dropped into:
//   - activity_recordings (the raw record + transcript + structure)
//   - activities (a regular timeline row)
//   - tasks (one row per action item)
//
// Gating:
//   • Enterprise-only. Recording + transcription is heavy
//     compute and a key differentiator we sell as part of the
//     enterprise tier. requireUser({ plan: 'enterprise' }) handles
//     the 403; developers bypass for QA.
//   • Per-user daily cap of 50 transcriptions, enforced via the
//     check_rate_limit() RPC (24h window).
//
// Inputs (POST JSON):
//   { recording_id: uuid }   - row already inserted by the client
//                              with status='uploaded' and audio_path
//                              pointing into the 'recordings' bucket
//
// Output:
//   { success, activity_id, action_item_count, summary }
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, corsHeaders, jsonResponse } from "../_shared/devGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const TRANSCRIBE_MODEL = Deno.env.get("WHISPER_MODEL") ?? "whisper-1";
const EXTRACT_MODEL = Deno.env.get("CLAUDE_EXTRACT_MODEL") ?? "claude-sonnet-4-6";

// Whisper API hard limit is 25MB. Keep a small buffer so a slightly
// chunky webm doesn't reject server-side after the user already
// uploaded it.
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
// Per-user daily transcription cap. Enterprise plan, but we still
// don't want a runaway script blowing up our OpenAI bill.
const DAILY_TRANSCRIBE_CAP = 50;

const EXTRACT_SYSTEM = `You convert a sales conversation transcript into structured data for a CRM. The transcript may be a sales call, a cold outreach voicemail, an in-person meeting, or a recorded note. Output JSON ONLY (no prose, no fences):

{
  "activity_type": "Call" | "Meeting" | "Email" | "Note" | "Follow Up",
  "summary": "<2-3 sentence summary>",
  "sentiment": "positive" | "neutral" | "negative",
  "commitment_score": <0-100, how strongly the prospect signaled buying intent>,
  "action_items": [
    { "title": "<short imperative>", "due_in_days": <int 0-30>, "priority": "High"|"Medium"|"Low" }
  ],
  "contact_updates": { "title"?: string, "email"?: string, "phone"?: string },
  "competitor_mentions": [ "<vendor name>" ]
}

Rules:
  - action_items: only include explicit commitments by the rep ("I'll send the proposal", "I'll follow up Friday"). Skip vague items.
  - contact_updates: only fields the prospect explicitly stated.
  - competitor_mentions: vendors the prospect named — not your own product.
  - If the transcript is too short or garbled to extract: still return the JSON with empty arrays / null.`;

interface Body { recording_id: string }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Enterprise plan gate. requireUser handles the 403 + a friendly
  // message naming the required plan. Developers bypass.
  const guard = await requireUser(req, { plan: "enterprise" });
  if (!guard.ok) return guard.response;
  const { userId } = guard;

  if (!OPENAI_API_KEY) return jsonResponse({ success: false, error: "OPENAI_API_KEY not configured" }, 500);
  if (!ANTHROPIC_API_KEY) return jsonResponse({ success: false, error: "ANTHROPIC_API_KEY not configured" }, 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }
  if (!body.recording_id) return jsonResponse({ success: false, error: "recording_id required" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Per-user daily rate limit. 24h sliding window via the existing
  // check_rate_limit RPC. Returns false when the user is over cap.
  try {
    const { data: allowed } = await sb.rpc("check_rate_limit", {
      p_scope: "transcribe_activity",
      p_identifier: userId,
      p_window_seconds: 24 * 60 * 60,
      p_max_hits: DAILY_TRANSCRIBE_CAP,
    });
    if (allowed === false) {
      return jsonResponse({
        success: false,
        error: "rate_limited",
        message: `You've hit today's cap of ${DAILY_TRANSCRIBE_CAP} transcriptions. Resets in 24 hours.`,
      }, 429);
    }
  } catch { /* RPC missing in dev; fail-open rather than block */ }

  // Load the recording row.
  const { data: rec, error: recErr } = await sb
    .from("activity_recordings")
    .select("*")
    .eq("id", body.recording_id)
    .maybeSingle();
  if (recErr || !rec) return jsonResponse({ success: false, error: "Recording not found" }, 404);
  if (rec.status === "promoted") {
    return jsonResponse({ success: true, already_promoted: true, activity_id: rec.activity_id });
  }

  // Mark transcribing so the UI can poll.
  await sb.from("activity_recordings").update({ status: "transcribing", updated_at: new Date().toISOString() }).eq("id", rec.id);

  try {
    // ─── Pull the audio bytes from Storage ──────────────────
    if (!rec.audio_path) throw new Error("recording has no audio_path");
    const { data: signed } = await sb.storage.from("recordings").createSignedUrl(rec.audio_path, 600);
    if (!signed?.signedUrl) throw new Error("Could not sign storage URL");
    const audioRes = await fetch(signed.signedUrl);
    if (!audioRes.ok) throw new Error(`Could not fetch audio: ${audioRes.status}`);
    const audioBlob = await audioRes.blob();
    if (audioBlob.size > MAX_AUDIO_BYTES) {
      throw new Error(`Audio file is ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB; max is 24MB. Split longer recordings into shorter clips.`);
    }

    // ─── Whisper transcription ──────────────────────────────
    const form = new FormData();
    const filename = rec.audio_path.split("/").pop() || "recording.webm";
    form.append("file", audioBlob, filename);
    form.append("model", TRANSCRIBE_MODEL);
    form.append("response_format", "json");
    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (!whisperRes.ok) {
      const t = await whisperRes.text();
      throw new Error(`Whisper error ${whisperRes.status}: ${t.slice(0, 200)}`);
    }
    const whisperJson = await whisperRes.json();
    const transcript: string = (whisperJson?.text as string) || "";
    if (!transcript || transcript.length < 10) throw new Error("Empty transcript");

    // ─── Claude structured extraction ───────────────────────
    // One retry on transient 5xx — the Anthropic API rarely flakes
    // but when it does a single retry usually succeeds.
    let claudeJson: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: EXTRACT_MODEL,
          max_tokens: 1024,
          system: EXTRACT_SYSTEM,
          messages: [{ role: "user", content: transcript.slice(0, 12000) }],
        }),
      });
      if (claudeRes.ok) { claudeJson = await claudeRes.json(); break; }
      const t = await claudeRes.text();
      if (claudeRes.status >= 500 && attempt === 0) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      throw new Error(`Claude error ${claudeRes.status}: ${t.slice(0, 200)}`);
    }
    const raw = claudeJson?.content?.[0]?.text || "{}";
    let extracted: Record<string, unknown> = {};
    try {
      extracted = JSON.parse(raw);
    } catch {
      // Strip code fences if Claude added them despite instructions.
      const clean = raw.replace(/^```(json)?\s*/i, "").replace(/\s*```$/i, "");
      try { extracted = JSON.parse(clean); } catch { extracted = {}; }
    }

    const activity_type = (extracted.activity_type as string) || "Note";
    const summary = (extracted.summary as string) || transcript.slice(0, 200);
    const sentiment = (extracted.sentiment as string) || "neutral";
    const commitment_score = typeof extracted.commitment_score === "number" ? extracted.commitment_score : 50;
    const action_items = Array.isArray(extracted.action_items) ? extracted.action_items : [];
    const contact_updates = (extracted.contact_updates as Record<string, unknown>) || {};
    const competitor_mentions = Array.isArray(extracted.competitor_mentions) ? extracted.competitor_mentions : [];

    // ─── Promote into activities + tasks ────────────────────
    const { data: activityRow, error: actErr } = await sb.from("activities").insert({
      property_id: rec.property_id,
      deal_id: rec.deal_id,
      activity_type,
      subject: `${activity_type}: ${summary.split(".")[0].slice(0, 80)}`,
      description: summary,
      occurred_at: rec.created_at,
      created_by: rec.user_id || userId,
      source: rec.source || "voice_note",
      recording_id: rec.id,
    }).select("id").single();
    if (actErr) throw actErr;

    let action_item_count = 0;
    if (action_items.length && rec.deal_id) {
      const today = new Date();
      const taskRows = action_items.slice(0, 10).map((it: any) => {
        const dueIn = Number(it.due_in_days) || 1;
        const dueDate = new Date(today.getTime() + dueIn * 86400_000).toISOString().split("T")[0];
        return {
          property_id: rec.property_id,
          deal_id: rec.deal_id,
          title: String(it.title || "Follow-up").slice(0, 200),
          due_date: dueDate,
          priority: ["High", "Medium", "Low"].includes(it.priority) ? it.priority : "Medium",
          status: "Pending",
          assigned_to: rec.user_id,
          created_by: rec.user_id || userId,
        };
      });
      const { error: taskErr } = await sb.from("tasks").insert(taskRows);
      if (!taskErr) action_item_count = taskRows.length;
    }

    // ─── Save the structured output back to the recording row ─
    await sb.from("activity_recordings").update({
      transcript,
      summary,
      detected_activity_type: activity_type,
      sentiment,
      commitment_score,
      action_items,
      contact_updates,
      competitor_mentions,
      activity_id: activityRow.id,
      status: "promoted",
      promoted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", rec.id);

    return jsonResponse({
      success: true,
      activity_id: activityRow.id,
      action_item_count,
      summary,
      transcript_length: transcript.length,
      sentiment,
      commitment_score,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sb.from("activity_recordings").update({
      status: "failed",
      error: msg.slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq("id", rec.id);
    return jsonResponse({ success: false, error: msg }, 500);
  }
});


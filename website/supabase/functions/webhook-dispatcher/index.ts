// ============================================================
// WEBHOOK-DISPATCHER (scheduled, every 5 minutes)
// ============================================================
// Pulls webhook_deliveries rows where status='pending', POSTs the
// payload to the subscription's URL with HMAC-SHA256 signature in
// the X-Rally-Signature header. Retries with exponential backoff
// up to 5 attempts, then marks failed.
//
// Triggered by Supabase scheduled functions with x-cron-secret.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags").select("enabled").eq("module", "webhooks").maybeSingle();
  if (!flag?.enabled) return jsonResponse({ skipped: true, reason: "flag off" });

  // Pull pending deliveries with their subscription details.
  const { data: deliveries } = await sb
    .from("webhook_deliveries")
    .select("*, subscription:subscription_id(url, secret, is_active)")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("enqueued_at", { ascending: true })
    .limit(BATCH_SIZE);

  const results: any[] = [];
  for (const d of deliveries || []) {
    if (!d.subscription?.is_active) {
      // Subscription deactivated mid-flight → cancel.
      await sb.from("webhook_deliveries")
        .update({ status: "failed", last_response_body: "subscription_inactive" })
        .eq("id", d.id);
      continue;
    }
    const r = await deliver(sb, d);
    results.push({ id: d.id, ...r });
  }
  return jsonResponse({ processed: results.length, results });
});

async function deliver(sb: any, d: any) {
  const body = JSON.stringify(d.payload);
  const sig = d.subscription.secret ? await hmacSha256(d.subscription.secret, body) : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Rally-Webhooks/1.0",
    "X-Rally-Event": d.event_type,
    "X-Rally-Delivery-Id": d.id,
  };
  if (sig) headers["X-Rally-Signature"] = sig;

  let status = 0;
  let respBody = "";
  try {
    const res = await fetch(d.subscription.url, { method: "POST", headers, body });
    status = res.status;
    respBody = (await res.text()).slice(0, 1000);
    const success = res.ok;
    await sb.from("webhook_deliveries").update({
      status: success ? "success" : (d.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending"),
      attempts: d.attempts + 1,
      last_attempt_at: new Date().toISOString(),
      last_response_status: status,
      last_response_body: respBody,
      delivered_at: success ? new Date().toISOString() : null,
    }).eq("id", d.id);
    if (success) {
      await sb.from("webhook_subscriptions")
        .update({ last_fired_at: new Date().toISOString(), last_status: status })
        .eq("id", d.subscription_id);
    }
    return { status, success };
  } catch (e) {
    await sb.from("webhook_deliveries").update({
      status: d.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
      attempts: d.attempts + 1,
      last_attempt_at: new Date().toISOString(),
      last_response_status: 0,
      last_response_body: String(e).slice(0, 500),
    }).eq("id", d.id);
    return { status: 0, error: String(e) };
  }
}

async function hmacSha256(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}

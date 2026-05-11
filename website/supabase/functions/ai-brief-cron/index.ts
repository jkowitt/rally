// ============================================================
// AI-BRIEF-CRON EDGE FUNCTION
// ============================================================
// Fan-out scheduler for the morning brief. Runs once a day from
// pg_cron and invokes ai-daily-brief once per recently-active
// user, so the brief is already warm when the rep opens the app.
//
// "Active" = signed in within the last 7 days. We don't care
// about plan — every authenticated user gets a brief; the
// transcribe + capture surface is what's plan-gated, not the
// brief itself.
//
// Each fan-out call uses the service-role key so requireUser
// accepts a `user_id` body field instead of a per-user JWT (the
// pattern the email delta-syncs already use).
//
// Auth: only the service-role caller can invoke this. We don't
// need requireUser; we check the bearer matches SERVICE_KEY.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/devGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Concurrent limit so we don't blast the Anthropic API.
const CONCURRENCY = 4;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (auth !== SERVICE_KEY) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const today = new Date().toISOString().split("T")[0];

  // Pull active users — joined on properties so we can skip orphans
  // and avoid generating briefs for accounts without a workspace.
  const { data: activeUsers } = await sb.from("profiles")
    .select("id, property_id, last_login")
    .not("property_id", "is", null)
    .gte("last_login", sevenDaysAgo);

  const users = activeUsers || [];
  if (users.length === 0) {
    return jsonResponse({ success: true, fanned_out: 0, note: "No active users in the window" });
  }

  // Skip users that already have today's brief — saves API spend on
  // re-runs of the cron and on users who already opened the app.
  // EXCEPT: if their brief is dirty (a new signal / recording /
  // task completion happened since it was generated), regen it.
  const { data: alreadyBriefed } = await sb.from("ai_briefs")
    .select("user_id, generated_at, dirty_since")
    .eq("brief_date", today)
    .eq("status", "ready");

  const cleanBriefedSet = new Set<string>();
  for (const r of (alreadyBriefed || [])) {
    const dirtyAt = r.dirty_since ? new Date(r.dirty_since as string).getTime() : 0;
    const generatedAt = r.generated_at ? new Date(r.generated_at as string).getTime() : 0;
    if (!dirtyAt || dirtyAt <= generatedAt) {
      cleanBriefedSet.add(r.user_id as string);
    }
    // Otherwise the brief is dirty — fall through and regenerate.
  }
  const todo = users.filter(u => !cleanBriefedSet.has(u.id));

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in concurrency-bounded waves rather than sequentially or
  // unbounded. CONCURRENCY=4 keeps Anthropic rate limits happy and
  // bounds the function's cold-call wall time at ~ ceil(N/4) * 12s.
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(async (u) => {
      // regenerate=true so dirty briefs get rebuilt; the cached-
      // brief short-circuit inside ai-daily-brief already skips
      // users whose brief is clean — this branch only includes
      // dirty + first-time-today users.
      const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-daily-brief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ user_id: u.id, regenerate: true }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`user=${u.id.slice(0, 8)} ${r.status}: ${t.slice(0, 100)}`);
      }
    }));
    for (const res of results) {
      if (res.status === "fulfilled") success++;
      else { failed++; errors.push(String(res.reason).slice(0, 200)); }
    }
  }

  return jsonResponse({
    success: true,
    candidates: users.length,
    fanned_out: todo.length,
    succeeded: success,
    failed,
    errors: errors.slice(0, 5),
  });
});

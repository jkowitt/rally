// ============================================================
// CLEANUP-RECORDINGS EDGE FUNCTION
// ============================================================
// Daily TTL job for the 'recordings' storage bucket. Audio files
// are heavy (a 30-min call ≈ 7-15MB); the transcript + summary +
// extracted action items are what the rep actually needs long-
// term. After 90 days we delete the audio file from storage but
// keep the database row + transcript + extracted structure.
//
// What gets purged:
//   • activity_recordings rows older than 90 days that still
//     have an audio_path. We delete the storage object and null
//     out audio_path on the row.
//   • The row itself is preserved; the transcript and extracted
//     fields stay queryable forever.
//
// Auth: service-role only. pg_cron invokes this once a day.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/devGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Configurable via env so we can tune retention without redeploying.
const RETENTION_DAYS = Number(Deno.env.get("RECORDING_RETENTION_DAYS") ?? "90");
const BATCH_SIZE = 100;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (auth !== SERVICE_KEY) return jsonResponse({ error: "Unauthorized" }, 401);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000).toISOString();

  let totalChecked = 0;
  let totalPurged = 0;
  let totalErrors = 0;
  const errors: string[] = [];

  // Page through old recordings in batches. The whole job is
  // idempotent — a partial failure leaves rows for the next run.
  while (true) {
    const { data: rows, error } = await sb.from("activity_recordings")
      .select("id, audio_path")
      .lt("created_at", cutoff)
      .not("audio_path", "is", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (error) {
      errors.push(`select: ${error.message}`);
      totalErrors++;
      break;
    }
    if (!rows || rows.length === 0) break;
    totalChecked += rows.length;

    // Storage delete takes an array of paths.
    const paths = rows.map(r => r.audio_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      const { error: delErr } = await sb.storage.from("recordings").remove(paths);
      if (delErr) {
        // Don't bail — the storage removal is best-effort. Move on
        // and try again tomorrow; the row stays as-is so the next
        // run will retry.
        errors.push(`storage: ${delErr.message}`);
        totalErrors++;
        break;
      }
    }

    const { error: updErr } = await sb.from("activity_recordings")
      .update({ audio_path: null, updated_at: new Date().toISOString() })
      .in("id", rows.map(r => r.id));
    if (updErr) {
      errors.push(`update: ${updErr.message}`);
      totalErrors++;
      break;
    }
    totalPurged += rows.length;

    if (rows.length < BATCH_SIZE) break;
  }

  return jsonResponse({
    success: true,
    retention_days: RETENTION_DAYS,
    checked: totalChecked,
    purged: totalPurged,
    errors: errors.slice(0, 5),
    error_count: totalErrors,
  });
});

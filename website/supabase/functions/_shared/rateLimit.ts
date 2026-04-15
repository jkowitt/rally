// ============================================================
// SHARED RATE LIMIT HELPER
// ============================================================
// Simple per-user, per-function sliding window enforcement for
// the Anthropic-calling edge functions. Backed by the
// ai_function_rate_limits table (migration 063).
//
// Usage:
//   import { enforceRateLimit, logRateLimitCall } from "../_shared/rateLimit.ts";
//
//   const gate = await enforceRateLimit(sb, {
//     userId,
//     functionName: "contract-ai",
//     limit: 60,               // max calls
//     windowMinutes: 60,       // per hour
//     developerBypass: true,   // developers are uncapped
//     developerRole: profile?.role,
//   });
//   if (!gate.ok) return gate.response;
//
//   // ... do the Claude call ...
//
//   await logRateLimitCall(sb, {
//     userId,
//     functionName: "contract-ai",
//     creditsCharged: 5,
//     metadata: { contract_id },
//   });
//
// The enforce call does NOT increment the counter — only the
// explicit logRateLimitCall after a successful Claude response
// does. This means failed Claude calls don't count against the
// user's quota, which is the user-friendly choice.
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 429) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

export interface RateLimitOptions {
  userId: string;
  functionName: string;
  /** Max calls allowed in the window. */
  limit: number;
  /** Window size in minutes. */
  windowMinutes: number;
  /** If true and developerRole === 'developer', bypass the limit. */
  developerBypass?: boolean;
  developerRole?: string | null;
}

export interface RateLimitResult {
  ok: boolean;
  response?: Response;
  currentCount?: number;
  remaining?: number;
}

/**
 * Check whether a user is allowed to make another call. Does not
 * mutate anything — safe to call in validation-only paths.
 */
export async function enforceRateLimit(
  sb: any,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    if (opts.developerBypass && opts.developerRole === "developer") {
      return { ok: true, remaining: Number.POSITIVE_INFINITY };
    }

    // Use the SQL helper (migration 063) for a simple count query.
    const { data: count, error } = await sb.rpc("count_ai_calls", {
      p_user_id: opts.userId,
      p_function_name: opts.functionName,
      p_window_minutes: opts.windowMinutes,
    });

    if (error) {
      // Fail OPEN on count errors — rate limits are a cost/abuse
      // control, not a security boundary. Better to allow a request
      // through than to 500 a legitimate user because our rate
      // limit table is temporarily unavailable.
      // We still log the error so it's visible.
      console.error("rate_limit_count_failed", error);
      return { ok: true };
    }

    const current = Number(count || 0);
    if (current >= opts.limit) {
      return {
        ok: false,
        currentCount: current,
        remaining: 0,
        response: json({
          success: false,
          error: "rate_limit_exceeded",
          function: opts.functionName,
          limit: opts.limit,
          window_minutes: opts.windowMinutes,
          current_count: current,
          retry_after_seconds: opts.windowMinutes * 60,
        }, 429),
      };
    }

    return {
      ok: true,
      currentCount: current,
      remaining: opts.limit - current,
    };
  } catch (err) {
    console.error("rate_limit_exception", err);
    // Fail open on unexpected errors.
    return { ok: true };
  }
}

/**
 * Record a successful (or attempted) AI function call. Does not
 * throw — logging failures are non-fatal.
 */
export async function logRateLimitCall(
  sb: any,
  opts: {
    userId: string;
    functionName: string;
    creditsCharged?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sb.from("ai_function_rate_limits").insert({
      user_id: opts.userId,
      function_name: opts.functionName,
      credits_charged: opts.creditsCharged || 0,
      metadata: opts.metadata || {},
    });
  } catch (err) {
    // Non-fatal — if we can't log, the user still gets their result.
    console.error("rate_limit_log_failed", err);
  }
}

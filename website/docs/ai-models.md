# AI Model Tiering — Rally / Loud CRM

This document explains **which Claude model each edge function uses and why**. When a new snapshot ships and you need to upgrade, use this as your map.

---

## The tiers

| Tier | Model ID | Use case | Cost signal |
|---|---|---|---|
| **Opus 4.6** | `claude-opus-4-6` | Quality-first, low-frequency, accuracy matters | Highest |
| **Sonnet 4.6** | `claude-sonnet-4-6` | Balanced cost for bulk / high-volume generation | Medium |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Background probes / high-frequency / latency-sensitive | Lowest |

**Defaults for new edge functions:** start on Sonnet 4.6. Promote to Opus only when accuracy matters enough to justify the cost. Drop to Haiku only for tight-latency background work.

---

## Current function → model map

### Opus 4.6 (quality-first)

| File | Function name | Purpose | Why Opus |
|---|---|---|---|
| `supabase/functions/digest-research/index.ts` | `digest-research` | Claude + web_search article generation for The Digest | Monthly cadence (≤12 calls/year). Long-form. Tool use benefits from Opus's planning quality. |
| `supabase/functions/contract-ai/index.ts` line 91 | `contract-ai` (callClaude) | Single-contract user-facing parse | User is watching. Extraction accuracy on sponsor benefits directly affects the CRM data quality. |
| `supabase/functions/contract-ai/index.ts` line 160 | `contract-ai` (callClaudeAdvanced) | Multi-turn contract editing + code assistant | Complex instructions + multi-turn. Sonnet drops instruction-following here. |

### Sonnet 4.6 (balanced cost)

| File | Function name | Purpose | Why Sonnet |
|---|---|---|---|
| `supabase/functions/automation-runner/index.ts` line 326 | `automation-runner` | Weekly LinkedIn post generation (7/week) | Short marketing copy (180-260 words). No tools. Ran weekly → annualized Opus cost ~5x higher for no quality win. |
| `supabase/functions/process-contract-batch/index.ts` line 307 | `process-contract-batch` | Bulk contract parsing throughput path | Can process 50+ contracts per run. Accuracy already validated in the single-contract Opus path (line 91 of contract-ai). Sonnet handles the known-good schema fine. |

### Haiku 4.5 (background probes)

| File | Function name | Purpose | Why Haiku |
|---|---|---|---|
| `supabase/functions/benchmark-updater/index.ts` | `benchmark-updater` | Nightly benchmark refresh | Runs every night. Structured JSON output. Latency matters for the cron window. |
| `supabase/functions/daily-intelligence/index.ts` | `daily-intelligence` | Daily intel summaries | High frequency. Simple summarization task. |
| `supabase/functions/code-analysis/index.ts` | `code-analysis` | Code analysis probes | Short inputs, simple JSON output. |
| `supabase/functions/claude-valuation/index.ts` | `claude-valuation` | VALORA background valuations | Small JSON responses. Called often. |

---

## How to upgrade models

1. **Check the [Claude model IDs](https://docs.claude.com/en/docs/about-claude/models)** for the latest snapshots.
2. **Grep for the model strings** to find every call site:
   ```bash
   rg 'claude-(opus|sonnet|haiku)-[0-9a-z-]+' website/supabase/functions/
   ```
3. **Upgrade per tier, not all at once.** A new Opus release doesn't mean you should move Haiku callers to it.
4. **Redeploy the affected functions:**
   ```bash
   cd website && supabase functions deploy <fn-name> --project-ref $SUPABASE_PROJECT_ID
   ```
5. **Update this doc.**

---

## When to reconsider a tier

**Promote to Opus if:**
- You're seeing hallucinations or schema drift in the output
- The function uses tools (web_search, computer use) — Opus's tool-use planning is noticeably better
- Call frequency is low enough that the cost delta is <$5/month

**Drop to Sonnet if:**
- You're running more than a few hundred calls/day
- The task is well-defined extraction or generation with no tools
- Accuracy is already proven upstream

**Drop to Haiku if:**
- The function is cron-triggered background work
- The task is simple classification / summarization / structured JSON
- Latency matters more than perfection

---

## Rate limiting

See `supabase/functions/_shared/rateLimit.ts`. The Anthropic-calling edge functions that take user input are wrapped in per-user sliding-window rate limits backed by the `ai_function_rate_limits` table (migration 063):

| Function | Limit | Window | Dev bypass |
|---|---|---|---|
| `digest-research` | 10 calls | 60 min | No (always capped) |
| `contract-ai` | 120 calls | 60 min | Yes |
| `process-contract-batch` | 10 calls | 60 min | Yes |

Rate limits **fail open** if the counter table is unreachable — they're a cost control, not a security boundary. Authentication is still enforced upstream.

---

## Anthropic API key

All functions read `ANTHROPIC_API_KEY` from edge function secrets. Rotate via:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref $SUPABASE_PROJECT_ID
```

After rotation, restart no functions — Deno re-reads env vars on each invocation.

---

## History

- **2026-04-15** — Sonnet 4 snapshots (`claude-sonnet-4-20250514`, `claude-sonnet-4-5-20250929`) deprecated. Moved all callers to named tags (`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`) and set this tiering policy.
- **Pre-2026-04** — Ad-hoc model selection per function. No rate limiting. Some functions on outdated `claude-3-haiku-20240307`.

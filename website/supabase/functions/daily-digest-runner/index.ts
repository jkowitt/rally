// ============================================================
// DAILY-DIGEST-RUNNER (scheduled, hourly)
// ============================================================
// Runs every hour. For each digest_subscription where:
//   - is_active = true
//   - send_hour_utc = current UTC hour
//   - today's weekday is in send_days
//   - last_sent_at < today
// it builds a personalized digest of:
//   - top 5 priority queue contacts
//   - active prospect signals
//   - stale deals (coaching nudges)
// and delivers via the chosen channel (email | slack).
//
// Triggered by Supabase scheduled functions with x-cron-secret.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") || "digests@example.com";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://app.example.com";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Not Found", { status: 404 });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await sb
    .from("feature_flags")
    .select("enabled")
    .eq("module", "daily_digests")
    .maybeSingle();
  if (!flag?.enabled) {
    return jsonResponse({ skipped: true, reason: "flag off" });
  }

  const now = new Date();
  const hour = now.getUTCHours();
  const dayName = DAY_NAMES[now.getUTCDay()];
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  const { data: subs } = await sb
    .from("digest_subscriptions")
    .select("*, profiles:user_id(id, full_name, email, property_id)")
    .eq("is_active", true)
    .eq("send_hour_utc", hour);

  const filtered = (subs || []).filter((s: any) =>
    (s.send_days || []).includes(dayName) &&
    (!s.last_sent_at || s.last_sent_at < todayStart)
  );

  const results: any[] = [];
  for (const sub of filtered) {
    try {
      const r = await deliverDigest(sb, sub);
      results.push({ id: sub.id, ...r });
      await sb.from("digest_subscriptions")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (e) {
      results.push({ id: sub.id, error: String(e) });
    }
  }
  return jsonResponse({ checked: subs?.length || 0, sent: results.length, results });
});

async function deliverDigest(sb: any, sub: any) {
  const propertyId = sub.profiles?.property_id || sub.property_id;
  if (!propertyId) return { skipped: true, reason: "no property" };

  // 1. Top 5 priority contacts
  const { data: priority } = await sb
    .from("contact_engagement_score")
    .select("contact_id, first_name, last_name, email, company, priority_score, opens_14d, replies_14d")
    .eq("property_id", propertyId)
    .gt("priority_score", 0)
    .order("priority_score", { ascending: false })
    .limit(5);

  // 2. Active signals (top 5)
  const { data: signals } = await sb
    .from("prospect_signals")
    .select("id, signal_type, severity, title, description, surfaced_at")
    .eq("property_id", propertyId)
    .is("dismissed_at", null)
    .is("acted_on_at", null)
    .order("surfaced_at", { ascending: false })
    .limit(5);

  // 3. Stale deals
  const { data: nudges } = await sb
    .from("coaching_nudges")
    .select("nudge_type, message, related_id")
    .eq("property_id", propertyId)
    .limit(8);

  const { html, text } = renderDigest({
    name: sub.profiles?.full_name || "there",
    priority: priority || [],
    signals: signals || [],
    nudges: nudges || [],
  });

  if (sub.channel === "email") {
    if (!RESEND_API_KEY) return { skipped: true, reason: "RESEND_API_KEY missing" };
    if (!sub.profiles?.email) return { skipped: true, reason: "no recipient email" };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: sub.profiles.email,
        subject: `Your daily prospecting digest`,
        html, text,
      }),
    });
    if (!res.ok) return { error: `Resend ${res.status}: ${await res.text()}` };
    return { delivered: true, channel: "email" };
  }

  if (sub.channel === "slack") {
    if (!sub.slack_webhook_url) return { skipped: true, reason: "no slack webhook" };
    const blocks = renderSlackBlocks({
      name: sub.profiles?.full_name || "there",
      priority: priority || [],
      signals: signals || [],
      nudges: nudges || [],
    });
    const res = await fetch(sub.slack_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Most webhook URLs only accept text + blocks (not actions),
      // but we ship link-buttons that work in any Slack channel via
      // url-only buttons. This gives the rep one-click jumps to the
      // right page without needing an interactive Slack app.
      body: JSON.stringify({ text, blocks }),
    });
    if (!res.ok) return { error: `Slack ${res.status}` };
    return { delivered: true, channel: "slack" };
  }

  return { skipped: true, reason: "unknown channel" };
}

function renderDigest(args: { name: string; priority: any[]; signals: any[]; nudges: any[] }) {
  const lines: string[] = [];
  lines.push(`Good morning, ${args.name}.`);
  lines.push("");
  if (args.priority.length > 0) {
    lines.push(`🔥 PRIORITY QUEUE (top ${args.priority.length}):`);
    for (const p of args.priority) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;
      lines.push(`  · ${name} @ ${p.company || ""} — score ${p.priority_score} (${p.opens_14d} opens · ${p.replies_14d} replies)`);
    }
    lines.push("");
  }
  if (args.signals.length > 0) {
    lines.push(`📡 ACTIVE SIGNALS (${args.signals.length}):`);
    for (const s of args.signals) {
      lines.push(`  · [${s.severity}] ${s.title}`);
    }
    lines.push("");
  }
  if (args.nudges.length > 0) {
    lines.push(`💡 NUDGES (${args.nudges.length}):`);
    for (const n of args.nudges) {
      lines.push(`  · ${n.message}`);
    }
    lines.push("");
  }
  lines.push(`Open the app: ${APP_BASE_URL}/app`);

  const text = lines.join("\n");
  const html = `<pre style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.5;color:#222;background:#fff;padding:16px;">${escapeHtml(text)}</pre>`;
  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// renderSlackBlocks: build a Block Kit message with header,
// priority/signals sections, and link-buttons that jump to the
// matching app page. Works in any incoming-webhook setup; doesn't
// require the interactive Slack app.
function renderSlackBlocks(args: { name: string; priority: any[]; signals: any[]; nudges: any[] }) {
  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `Good morning, ${args.name}` },
    },
  ];

  if (args.priority.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🔥 Priority queue (top ${args.priority.length})*\n` +
          args.priority.map(p => {
            const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;
            return `• *${name}* @ ${p.company || ""} — score ${p.priority_score}`;
          }).join("\n"),
      },
    });
    blocks.push({
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "Open priority queue" }, url: `${APP_BASE_URL}/app/crm/priority` },
      ],
    });
  }

  if (args.signals.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📡 Active signals (${args.signals.length})*\n` +
          args.signals.map(s => `• [${s.severity}] ${s.title}`).join("\n"),
      },
    });
    blocks.push({
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "Open signal radar" }, url: `${APP_BASE_URL}/app/crm/signals` },
      ],
    });
  }

  if (args.nudges.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💡 Nudges (${args.nudges.length})*\n` +
          args.nudges.slice(0, 6).map(n => `• ${n.message}`).join("\n"),
      },
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [
      { type: "mrkdwn", text: `<${APP_BASE_URL}/app|Open Rally>` },
    ],
  });

  return blocks;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

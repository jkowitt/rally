// Automation Runner — single edge function that handles all scheduled tasks
// Invoke with action parameter: daily_digest, trial_health, churn_scan, upgrade_scan,
// contract_expiry, weekly_report, send_queued_emails, generate_social_posts
//
// Schedule via Supabase pg_cron or external cron:
//   Daily 7am CT: action=daily_digest
//   Daily (any): action=trial_health, churn_scan, upgrade_scan, contract_expiry
//   Mondays 8am CT: action=weekly_report
//   Hourly: action=send_queued_emails
//   Sundays: action=generate_social_posts

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const body = await req.json()
    const action = body.action

    // Check master automation flag for non-digest actions
    const alwaysRun = ["daily_digest", "weekly_report"]
    if (!alwaysRun.includes(action)) {
      const { data: settings } = await sb.from("automation_settings").select("*").limit(1).maybeSingle()
      if (!settings?.master_automation_enabled) {
        await logEvent(sb, "operational", action, "skipped", { reason: "master_disabled" })
        return json({ skipped: true, reason: "master_disabled" })
      }
    }

    let result: any
    if (action === "daily_digest") result = await runDailyDigest(sb)
    else if (action === "weekly_report") result = await runWeeklyReport(sb)
    else if (action === "trial_health") result = await runTrialHealth(sb)
    else if (action === "churn_scan") result = await runChurnScan(sb)
    else if (action === "upgrade_scan") result = await runUpgradeScan(sb)
    else if (action === "contract_expiry") result = await runContractExpiry(sb)
    else if (action === "send_queued_emails") result = await sendQueuedEmails(sb)
    else if (action === "generate_social_posts") result = await generateSocialPosts(sb)
    else throw new Error("Unknown action: " + action)

    return json(result)
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })
}

async function logEvent(sb: any, category: string, eventType: string, status: string, payload: any = {}, errorMessage: string | null = null) {
  try {
    await sb.from("automation_log").insert({
      event_category: category,
      event_type: eventType,
      triggered_by: "automation",
      status,
      payload,
      error_message: errorMessage,
      executed_at: status === "sent" ? new Date().toISOString() : null,
    })
  } catch {}
}

// ─── Daily Digest (7am CT) ───
async function runDailyDigest(sb: any) {
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const [newSignups, hotLeads, churnRisks] = await Promise.all([
    sb.from("profiles").select("full_name, email, properties!profiles_property_id_fkey(name, plan)").gte("created_at", yesterday),
    sb.from("user_engagement_scores").select("*, profiles(full_name, email)").eq("tag", "hot"),
    sb.from("churn_risks").select("*, profiles(full_name, email)").is("resolved_at", null),
  ])

  // Get admin emails
  const { data: admins } = await sb.from("profiles").select("email").in("role", ["developer", "businessops", "admin"])

  for (const admin of admins || []) {
    if (!admin.email) continue
    await sb.functions.invoke("send-email", {
      body: {
        to: admin.email,
        subject: `Loud Legacy Daily — ${new Date().toLocaleDateString()}`,
        body: buildDigestHtml(newSignups.data || [], hotLeads.data || [], churnRisks.data || []),
      },
    })
  }
  await logEvent(sb, "operational", "daily_digest", "sent", { recipients: admins?.length || 0 })
  return { digestsSent: admins?.length || 0 }
}

function buildDigestHtml(signups: any[], hot: any[], risks: any[]) {
  return `<h2>Overnight: ${signups.length} new signups</h2>
<ul>${signups.map(s => `<li>${s.full_name || s.email} — ${s.properties?.plan || 'free'}</li>`).join("")}</ul>
<h2>Hot leads: ${hot.length}</h2>
<ul>${hot.map(h => `<li>${h.profiles?.full_name || h.profiles?.email} — Score ${h.score}</li>`).join("")}</ul>
<h2>Churn risks: ${risks.length}</h2>
<ul>${risks.map(r => `<li>${r.profiles?.full_name || r.profiles?.email} — ${r.reason}</li>`).join("")}</ul>`
}

// ─── Weekly Report (Monday 8am CT) ───
async function runWeeklyReport(sb: any) {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const [signups, conversions] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    sb.from("properties").select("*", { count: "exact", head: true }).neq("plan", "free"),
  ])
  const { data: admins } = await sb.from("profiles").select("email").in("role", ["developer", "businessops", "admin"])
  for (const admin of admins || []) {
    if (!admin.email) continue
    await sb.functions.invoke("send-email", {
      body: {
        to: admin.email,
        subject: `Loud Legacy Weekly — Week of ${new Date().toLocaleDateString()}`,
        body: `<h2>Weekly Summary</h2><p>New signups: ${signups.count || 0}</p><p>Total paying: ${conversions.count || 0}</p>`,
      },
    })
  }
  await logEvent(sb, "operational", "weekly_report", "sent", { recipients: admins?.length || 0 })
  return { sent: admins?.length || 0 }
}

// ─── Trial Health Scoring ───
async function runTrialHealth(sb: any) {
  const { data: freeProfiles } = await sb
    .from("profiles")
    .select("id, properties!profiles_property_id_fkey(id, plan)")
  const freeUsers = (freeProfiles || []).filter((p: any) => (p.properties?.plan || "free") === "free")

  let scored = 0
  for (const user of freeUsers) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const { count: logins } = await sb.from("login_history").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("login_at", sevenDaysAgo)
      const propertyId = user.properties?.id
      const { count: contracts } = propertyId ? await sb.from("contracts").select("*", { count: "exact", head: true }).eq("property_id", propertyId) : { count: 0 }

      const loginCount = logins || 0
      let score = 0
      if (loginCount > 5) score = 75
      else if (loginCount > 2) score = 50
      else if (loginCount > 0) score = 25
      if ((contracts || 0) > 0) score += 25
      score = Math.min(100, score)

      let tag = "ghost"
      if (score >= 75) tag = "hot"
      else if (score >= 40) tag = "warm"
      else if (score >= 10) tag = "cold"

      await sb.from("user_engagement_scores").upsert({
        user_id: user.id,
        score,
        tag,
        login_count_7d: loginCount,
        contracts_uploaded: contracts || 0,
        calculated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      scored++
    } catch {}
  }
  await logEvent(sb, "operational", "trial_health", "sent", { scored })
  return { scored }
}

// ─── Churn Risk Scan ───
async function runChurnScan(sb: any) {
  const twentyOneDaysAgo = new Date(Date.now() - 21 * 86400000).toISOString()
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, properties!profiles_property_id_fkey(plan)")
  const paid = (profiles || []).filter((p: any) => ["starter", "pro", "enterprise"].includes(p.properties?.plan))

  let flagged = 0
  for (const user of paid) {
    const { data: lastLogin } = await sb.from("login_history").select("login_at").eq("user_id", user.id).order("login_at", { ascending: false }).limit(1).maybeSingle()
    if (lastLogin && lastLogin.login_at < twentyOneDaysAgo) {
      await sb.from("churn_risks").insert({
        user_id: user.id,
        risk_level: "high",
        reason: "No login in 21+ days",
      })
      flagged++
    }
  }
  await logEvent(sb, "operational", "churn_scan", "sent", { flagged })
  return { flagged }
}

// ─── Upgrade Opportunity Scan ───
async function runUpgradeScan(sb: any) {
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, properties!profiles_property_id_fkey(id, plan)")
  const candidates = (profiles || []).filter((p: any) => {
    const plan = p.properties?.plan || "free"
    return plan === "free" || plan === "starter"
  })

  let flagged = 0
  for (const user of candidates) {
    const propertyId = user.properties?.id
    if (!propertyId) continue
    const { count: deals } = await sb.from("deals").select("*", { count: "exact", head: true }).eq("property_id", propertyId)
    const plan = user.properties?.plan || "free"
    const limit = plan === "free" ? 15 : 500
    if ((deals || 0) >= limit * 0.8) {
      await sb.from("upgrade_opportunities").insert({
        user_id: user.id,
        reason: `${deals} deals — ${Math.round(((deals || 0) / limit) * 100)}% of ${plan} limit`,
      })
      flagged++
    }
  }
  await logEvent(sb, "upgrade", "upgrade_scan", "sent", { flagged })
  return { flagged }
}

// ─── Contract Expiry Monitor ───
async function runContractExpiry(sb: any) {
  const windows = [
    { days: 90, label: "90 days" },
    { days: 60, label: "60 days" },
    { days: 30, label: "30 days" },
  ]
  let notified = 0
  for (const w of windows) {
    const target = new Date(Date.now() + w.days * 86400000).toISOString().slice(0, 10)
    const { data: contracts } = await sb
      .from("contracts")
      .select("id, brand_name, expiration_date, property_id, deal_id, properties!inner(id)")
      .eq("expiration_date", target)
    for (const c of contracts || []) {
      // Create in-app notification for property admins
      const { data: admins } = await sb.from("profiles").select("id, email").eq("property_id", c.property_id).in("role", ["admin", "developer"])
      for (const admin of admins || []) {
        await sb.from("admin_notifications").insert({
          recipient_id: admin.id,
          type: "contract_expiring",
          title: `${c.brand_name} contract expires in ${w.label}`,
          body: `Renewal window open — start the conversation now.`,
          metadata: { contract_id: c.id, deal_id: c.deal_id },
        })
      }
      notified++
    }
  }
  await logEvent(sb, "operational", "contract_expiry", "sent", { notified })
  return { notified }
}

// ─── Send Queued Emails ───
async function sendQueuedEmails(sb: any) {
  const { data: queued } = await sb
    .from("email_sends")
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_for", new Date().toISOString())
    .limit(100)

  let sent = 0, failed = 0
  for (const s of queued || []) {
    try {
      const { data: profile } = await sb.from("profiles").select("email, unsubscribed_marketing").eq("id", s.user_id).maybeSingle()
      if (!profile?.email || profile.unsubscribed_marketing) {
        await sb.from("email_sends").update({ status: "skipped" }).eq("id", s.id)
        continue
      }
      await sb.functions.invoke("send-email", {
        body: { to: profile.email, subject: s.subject, body: "Email content from sequence" },
      })
      await sb.from("email_sends").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", s.id)
      sent++
    } catch (err: any) {
      await sb.from("email_sends").update({ status: "failed" }).eq("id", s.id)
      await logEvent(sb, "email", "send_email", "failed", { send_id: s.id }, err.message)
      failed++
    }
  }
  await logEvent(sb, "email", "batch_send", "sent", { sent, failed })
  return { sent, failed }
}

// ─── Generate Social Posts (weekly) ───
async function generateSocialPosts(sb: any) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
  if (!apiKey) return { error: "ANTHROPIC_API_KEY not set" }

  const topics = [
    "Sponsorship fulfillment pain point",
    "AI contract parsing feature demonstration",
    "Industry stat or insight (conference events or minor league sports)",
    "Founder story / build in public moment",
    "Product tip or hidden feature",
    "Customer outcome (anonymized)",
    "Week opener — weekly outlook for sponsorship teams",
  ]

  const days = [1, 2, 3, 4, 5, 6] // Mon-Sat
  let generated = 0

  for (let i = 0; i < topics.length && i < days.length; i++) {
    const topic = topics[i]
    const prompt = `Write a LinkedIn post about "${topic}" targeted at conference/event organizers and minor league sports teams. Tone: professional, insightful, founder-voiced. 180-260 words. Include a specific takeaway. Do not include hashtags at the bottom. Return ONLY the post text.`

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      })
      const data = await resp.json()
      const content = data.content?.[0]?.text || ""

      // Schedule next week
      const nextMonday = new Date()
      const daysUntilMonday = (1 + 7 - nextMonday.getDay()) % 7 || 7
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday + (days[i] - 1))
      nextMonday.setHours(days[i] === 5 ? 9 : days[i] % 2 === 0 ? 12 : 8, 0, 0, 0)

      await sb.from("automation_social_posts").insert({
        content,
        post_type: "text",
        platform: "linkedin",
        topic,
        status: "draft",
        scheduled_for: nextMonday.toISOString(),
        generated_by: "automation",
      })
      generated++
    } catch {}
  }
  await logEvent(sb, "social", "generate_weekly_posts", "sent", { generated })
  return { generated }
}

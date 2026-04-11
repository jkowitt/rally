// ============================================================
// STRIPE-PRICING-SYNC
// ============================================================
// Creates or updates Stripe Price objects from database pricing.
// Called from /dev/pricing when the developer hits "Sync to Stripe"
// on a plan, addon, or credit pack.
//
// Requires developer role (via devGuard-like check).
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_PRODUCT_ID = Deno.env.get("STRIPE_PRODUCT_ID") ?? ""; // optional parent product

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Developer role check
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return new Response("Not Found", { status: 404 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRes } = await sb.auth.getUser(jwt);
  if (!userRes?.user) return new Response("Not Found", { status: 404 });
  const { data: profile } = await sb.from("profiles").select("role").eq("id", userRes.user.id).maybeSingle();
  if (profile?.role !== "developer") return new Response("Not Found", { status: 404 });

  try {
    const body = await req.json();
    if (!STRIPE_SECRET) return json({ success: false, error: "STRIPE_SECRET_KEY not configured" });

    if (body.action === "sync_plan") return await syncPlan(sb, body.plan_key);
    if (body.action === "sync_addon") return await syncAddon(sb, body.addon_key);
    if (body.action === "sync_credit_pack") return await syncCreditPack(sb, body.pack_key);
    if (body.action === "sync_all") return await syncAll(sb);

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return json({ success: false, error: String(err) });
  }
});

async function syncPlan(sb: any, planKey: string) {
  const { data: plan } = await sb.from("pricing_plans").select("*").eq("plan_key", planKey).single();
  if (!plan) return json({ success: false, error: "Plan not found" });
  if (plan.monthly_price_cents === 0 && plan.annual_price_cents === 0) {
    return json({ success: true, note: "Free plan — no Stripe price needed" });
  }

  const product = STRIPE_PRODUCT_ID || await getOrCreateProduct(`Loud Legacy ${plan.display_name}`);
  const updates: any = { updated_at: new Date().toISOString() };

  if (plan.monthly_price_cents > 0) {
    const priceId = await createStripePrice({
      product,
      amount: plan.monthly_price_cents,
      interval: "month",
      nickname: `${planKey}_monthly`,
    });
    updates.stripe_monthly_price_id = priceId;
  }
  if (plan.annual_price_cents > 0) {
    const priceId = await createStripePrice({
      product,
      amount: plan.annual_price_cents,
      interval: "year",
      nickname: `${planKey}_annual`,
    });
    updates.stripe_annual_price_id = priceId;
  }

  await sb.from("pricing_plans").update(updates).eq("id", plan.id);
  return json({ success: true, updates });
}

async function syncAddon(sb: any, addonKey: string) {
  const { data: addon } = await sb.from("addons").select("*").eq("addon_key", addonKey).single();
  if (!addon) return json({ success: false, error: "Addon not found" });
  const product = STRIPE_PRODUCT_ID || await getOrCreateProduct(`Loud Legacy Addon: ${addon.display_name}`);

  const updates: any = { updated_at: new Date().toISOString() };
  if (addon.monthly_price_cents > 0) {
    updates.stripe_monthly_price_id = await createStripePrice({
      product,
      amount: addon.monthly_price_cents,
      interval: "month",
      nickname: `addon_${addonKey}_monthly`,
    });
  }
  if (addon.annual_price_cents && addon.annual_price_cents > 0) {
    updates.stripe_annual_price_id = await createStripePrice({
      product,
      amount: addon.annual_price_cents,
      interval: "year",
      nickname: `addon_${addonKey}_annual`,
    });
  }
  await sb.from("addons").update(updates).eq("id", addon.id);
  return json({ success: true, updates });
}

async function syncCreditPack(sb: any, packKey: string) {
  const { data: pack } = await sb.from("ai_credit_packs").select("*").eq("pack_key", packKey).single();
  if (!pack) return json({ success: false, error: "Pack not found" });
  const product = STRIPE_PRODUCT_ID || await getOrCreateProduct(`Loud Legacy Credits: ${pack.display_name}`);

  const updates: any = { updated_at: new Date().toISOString() };
  if (pack.monthly_price_cents > 0) {
    updates.stripe_price_id = await createStripePrice({
      product,
      amount: pack.monthly_price_cents,
      interval: "month",
      nickname: `credits_${packKey}_monthly`,
    });
  }
  if (pack.one_time_price_cents > 0) {
    updates.stripe_one_time_price_id = await createStripePrice({
      product,
      amount: pack.one_time_price_cents,
      interval: null,
      nickname: `credits_${packKey}_onetime`,
    });
  }
  await sb.from("ai_credit_packs").update(updates).eq("id", pack.id);
  return json({ success: true, updates });
}

async function syncAll(sb: any) {
  const [plans, addons, packs] = await Promise.all([
    sb.from("pricing_plans").select("plan_key").eq("is_active", true),
    sb.from("addons").select("addon_key").eq("is_active", true),
    sb.from("ai_credit_packs").select("pack_key").eq("is_active", true),
  ]);

  let synced = 0, errors: any[] = [];
  for (const p of plans.data || []) {
    const r = await syncPlan(sb, p.plan_key);
    if ((await r.json()).success) synced++;
    else errors.push({ type: "plan", key: p.plan_key });
  }
  for (const a of addons.data || []) {
    const r = await syncAddon(sb, a.addon_key);
    if ((await r.json()).success) synced++;
    else errors.push({ type: "addon", key: a.addon_key });
  }
  for (const pk of packs.data || []) {
    const r = await syncCreditPack(sb, pk.pack_key);
    if ((await r.json()).success) synced++;
    else errors.push({ type: "pack", key: pk.pack_key });
  }
  return json({ success: errors.length === 0, synced, errors });
}

// ─── Stripe helpers ─────────────────────────────────────────
async function getOrCreateProduct(name: string) {
  // Just create a new product each time — Stripe dedupes by name is
  // not reliable. Caller should set STRIPE_PRODUCT_ID for a single-product setup.
  const form = new URLSearchParams({ name });
  const res = await fetch("https://api.stripe.com/v1/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const data = await res.json();
  return data.id;
}

async function createStripePrice({ product, amount, interval, nickname }: any) {
  const form = new URLSearchParams({
    product,
    unit_amount: String(amount),
    currency: "usd",
    nickname,
  });
  if (interval) {
    form.append("recurring[interval]", interval);
  }
  const res = await fetch("https://api.stripe.com/v1/prices", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe price create failed");
  return data.id;
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

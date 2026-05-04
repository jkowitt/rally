import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://loud-legacy.com";

const PLANS = {
  starter: { price_id: Deno.env.get("STRIPE_STARTER_PRICE_ID") ?? "", max_users: 10, modules: ['crm', 'sportify'] },
  pro: { price_id: Deno.env.get("STRIPE_PRO_PRICE_ID") ?? "", max_users: 999, modules: ['crm', 'sportify', 'valora', 'businessnow'] },
  enterprise: { price_id: Deno.env.get("STRIPE_ENTERPRISE_PRICE_ID") ?? "", max_users: 999, modules: ['crm', 'sportify', 'valora', 'businessnow'] },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    if (!STRIPE_SECRET) throw new Error("STRIPE_SECRET_KEY not configured. Add it to Supabase secrets.");

    const url = new URL(req.url);

    // Webhook handler (no auth needed)
    if (url.pathname.endsWith("/webhook")) {
      return handleWebhook(req, supabase);
    }

    const body = await req.json();
    const { action, property_id, plan, return_url } = body;

    if (action === "create_checkout") {
      const planConfig = PLANS[plan as keyof typeof PLANS];
      if (!planConfig?.price_id) throw new Error("Invalid plan or price not configured");

      // Get or create Stripe customer
      const { data: property } = await supabase.from("properties").select("stripe_customer_id, billing_email, name").eq("id", property_id).single();

      let customerId = property?.stripe_customer_id;
      if (!customerId) {
        const customerResp = await stripeRequest("POST", "/customers", {
          email: property?.billing_email || "",
          name: property?.name || "",
          metadata: { property_id },
        });
        customerId = customerResp.id;
        await supabase.from("properties").update({ stripe_customer_id: customerId }).eq("id", property_id);
      }

      // Create checkout session
      const session = await stripeRequest("POST", "/checkout/sessions", {
        customer: customerId,
        mode: "subscription",
        "line_items[0][price]": planConfig.price_id,
        "line_items[0][quantity]": "1",
        success_url: `${return_url || APP_URL}/app?upgraded=true`,
        cancel_url: `${return_url || APP_URL}/app/settings`,
        metadata: { property_id, plan },
        subscription_data: { metadata: { property_id, plan } },
      });

      return json({ url: session.url });
    } else if (action === "addon_checkout") {
      // Self-serve add-on checkout. Body: { property_id, addon_key, return_url }.
      // Creates a Stripe Checkout Session for the addon's stripe_price_id,
      // stashes a row in addon_checkout_sessions so the webhook can flip
      // property_addons on completion.
      const { addon_key } = body;
      if (!property_id || !addon_key) throw new Error("property_id + addon_key required");

      const { data: addon } = await supabase
        .from("addon_catalog")
        .select("key, name, purchase_mode, stripe_price_id, per_seat, unit_price_cents, billing_interval")
        .eq("key", addon_key)
        .maybeSingle();
      if (!addon) throw new Error("Add-on not found");
      if (addon.purchase_mode !== "self_serve") {
        throw new Error("This add-on is contact-sales only. Submit a request from the catalog.");
      }
      if (!addon.stripe_price_id) {
        throw new Error("Stripe price not configured for this add-on. Set stripe_price_id in addon_catalog.");
      }

      // Get or create Stripe customer
      const { data: property } = await supabase
        .from("properties")
        .select("stripe_customer_id, billing_email, name")
        .eq("id", property_id)
        .single();
      let customerId = property?.stripe_customer_id;
      if (!customerId) {
        const customerResp = await stripeRequest("POST", "/customers", {
          email: property?.billing_email || "",
          name: property?.name || "",
          metadata: { property_id },
        });
        customerId = customerResp.id;
        await supabase.from("properties")
          .update({ stripe_customer_id: customerId })
          .eq("id", property_id);
      }

      // For per-seat pricing, count active users on the property.
      let qty = "1";
      if (addon.per_seat) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("property_id", property_id);
        qty = String(Math.max(1, count || 1));
      }

      // Resolve the user invoking this for initiated_by attribution.
      const auth = req.headers.get("Authorization") || "";
      const jwt = auth.replace(/^Bearer\s+/i, "").trim();
      let initiatedBy: string | null = null;
      if (jwt) {
        const { data: u } = await supabase.auth.getUser(jwt);
        initiatedBy = u?.user?.id ?? null;
      }

      const session = await stripeRequest("POST", "/checkout/sessions", {
        customer: customerId,
        mode: "subscription",
        "line_items[0][price]": addon.stripe_price_id,
        "line_items[0][quantity]": qty,
        success_url: `${return_url || APP_URL}/app/settings#addons?addon=${addon_key}&result=success`,
        cancel_url: `${return_url || APP_URL}/app/settings#addons?addon=${addon_key}&result=cancelled`,
        "metadata[purchase_kind]": "addon",
        "metadata[property_id]": property_id,
        "metadata[addon_key]": addon_key,
      });

      // Stash the in-flight checkout so the webhook can flip the
      // property_addons row on completion.
      await supabase.from("addon_checkout_sessions").insert({
        stripe_session_id: session.id,
        property_id,
        addon_key,
        initiated_by: initiatedBy,
        amount_cents: addon.unit_price_cents,
        status: "pending",
      });

      return json({ url: session.url });
    } else if (action === "create_portal") {
      const { data: property } = await supabase.from("properties").select("stripe_customer_id").eq("id", property_id).single();
      if (!property?.stripe_customer_id) throw new Error("No billing account. Subscribe first.");

      const portalSession = await stripeRequest("POST", "/billing_portal/sessions", {
        customer: property.stripe_customer_id,
        return_url: return_url || `${APP_URL}/app`,
      });

      return json({ url: portalSession.url });
    } else {
      throw new Error("Unknown action: " + action);
    }
  } catch (err: any) {
    return json({ error: err.message }, 200);
  }
});

async function handleWebhook(req: Request, supabase: any) {
  const body = await req.text();
  const sigHeader = req.headers.get("stripe-signature") || "";

  // HMAC verification: required when STRIPE_WEBHOOK_SECRET is set.
  // Stripe's signature header is "t=<ts>,v1=<sig>,..." — we sign
  // "<ts>.<body>" with the webhook secret using HMAC-SHA256 and
  // constant-time-compare against v1. Tolerance: 5 minutes against
  // replay. If verification fails, log a security_event and 400.
  if (STRIPE_WEBHOOK_SECRET) {
    const ok = await verifyStripeSignature(sigHeader, body, STRIPE_WEBHOOK_SECRET);
    if (!ok) {
      try {
        await supabase.rpc("log_security_event", {
          p_event_type: "webhook_sig_fail",
          p_severity: "warn",
          p_property_id: null,
          p_user_id: null,
          p_source: "stripe-billing",
          p_message: "Stripe webhook signature verification failed",
          p_payload: { sig_present: !!sigHeader },
        });
      } catch { /* swallow logging errors */ }
      return new Response("Bad signature", { status: 400 });
    }
  }

  const event = JSON.parse(body);
  const type = event.type;
  const data = event.data?.object;

  if (type === "checkout.session.completed") {
    const purchaseKind = data.metadata?.purchase_kind;

    // Branch: this checkout was for an add-on, not a base plan.
    // Update addon_checkout_sessions → trigger flips property_addons
    // → useAddons subscriber sees the new addon in real time.
    if (purchaseKind === "addon") {
      const sessionId = data.id;
      await supabase.from("addon_checkout_sessions").update({
        status: "completed",
        stripe_subscription_id: data.subscription || null,
        completed_at: new Date().toISOString(),
      }).eq("stripe_session_id", sessionId);
      return new Response("ok");
    }

    const propertyId = data.metadata?.property_id;
    const plan = data.metadata?.plan;
    if (propertyId && plan) {
      const planConfig = PLANS[plan as keyof typeof PLANS];
      await supabase.from("properties").update({
        plan,
        stripe_subscription_id: data.subscription,
        plan_started_at: new Date().toISOString(),
        max_users: planConfig?.max_users || 10,
      }).eq("id", propertyId);

      // Enable modules for the plan
      if (planConfig?.modules) {
        for (const mod of planConfig.modules) {
          await supabase.from("feature_flags").upsert({ module: mod, enabled: true }, { onConflict: "module" });
        }
      }
    }
  } else if (type === "customer.subscription.deleted") {
    const propertyId = data.metadata?.property_id;
    if (propertyId) {
      await supabase.from("properties").update({
        plan: "free",
        stripe_subscription_id: null,
        max_users: 3,
      }).eq("id", propertyId);
    }
  } else if (type === "customer.subscription.updated") {
    const propertyId = data.metadata?.property_id;
    if (propertyId && data.cancel_at_period_end) {
      await supabase.from("properties").update({
        plan_expires_at: new Date(data.current_period_end * 1000).toISOString(),
      }).eq("id", propertyId);
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
}

// verifyStripeSignature — port of Stripe's recommended Node SDK
// signature verification, written for Deno's WebCrypto. Header format:
//   "t=1234567890,v1=hex_signature[,v0=...]"
// We sign "<t>.<rawBody>" with HMAC-SHA256, hex-compare against v1.
// 5-minute tolerance to defend against replay.
async function verifyStripeSignature(
  header: string,
  rawBody: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(",").map(p => p.trim());
  let timestamp = "";
  const sigs: string[] = [];
  for (const p of parts) {
    const [k, v] = p.split("=", 2);
    if (k === "t") timestamp = v;
    else if (k === "v1" && v) sigs.push(v);
  }
  if (!timestamp || sigs.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  // Constant-time compare against any of the v1 signatures.
  return sigs.some(s => timingSafeEqualHex(s, expected));
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return mismatch === 0;
}

async function stripeRequest(method: string, path: string, params: Record<string, string> = {}) {
  const body = new URLSearchParams(params).toString();
  const resp = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method !== "GET" ? body : undefined,
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

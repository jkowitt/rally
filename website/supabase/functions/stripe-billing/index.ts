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
  // In production, verify webhook signature with STRIPE_WEBHOOK_SECRET
  const event = JSON.parse(body);

  const type = event.type;
  const data = event.data?.object;

  if (type === "checkout.session.completed") {
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

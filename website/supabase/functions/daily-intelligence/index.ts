import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { property_id } = await req.json();

    // Gather data snapshot for intelligence briefing
    const [deals, events, fulfillment, metrics] = await Promise.all([
      supabaseClient.from("deals").select("*").eq("property_id", property_id),
      supabaseClient.from("events").select("*").eq("property_id", property_id).gte("event_date", new Date().toISOString()),
      supabaseClient.from("fulfillment_records").select("*, deals!inner(property_id)").eq("deals.property_id", property_id).eq("delivered", false),
      supabaseClient.from("business_metrics").select("*").eq("property_id", property_id).order("metric_date", { ascending: false }).limit(20),
    ]);

    const prompt = `You are an AI business intelligence assistant for a sports property's partnership sales team. Analyze the following data and produce a daily intelligence briefing.

Active Deals: ${JSON.stringify(deals.data?.slice(0, 20))}
Upcoming Events: ${JSON.stringify(events.data?.slice(0, 10))}
Pending Fulfillment: ${JSON.stringify(fulfillment.data?.slice(0, 15))}
Recent Metrics: ${JSON.stringify(metrics.data?.slice(0, 10))}

Return a JSON object with:
- summary: string (3-5 sentence executive summary)
- recommendations: array of { priority: "high"|"medium"|"low", action: string, module: string }
- alerts: array of { type: "renewal"|"fulfillment"|"opportunity", message: string }`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || "{}";

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      parsed = { summary: responseText, recommendations: [], alerts: [] };
    }

    // Store the intelligence log
    const { data: log, error } = await supabaseClient
      .from("daily_intelligence_log")
      .insert({
        property_id,
        run_date: new Date().toISOString().split("T")[0],
        module: "daily_briefing",
        summary: parsed.summary,
        recommendations: parsed.recommendations,
        data_snapshot: { deals_count: deals.data?.length, events_count: events.data?.length, pending_fulfillment: fulfillment.data?.length },
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ log, alerts: parsed.alerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

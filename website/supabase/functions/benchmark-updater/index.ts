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

    // Fetch existing benchmarks and recent valuations
    const [existingContext, recentValuations, trainingData] = await Promise.all([
      supabaseClient.from("claude_context").select("*").eq("property_id", property_id).eq("active", true),
      supabaseClient.from("valuations").select("*").eq("property_id", property_id).order("created_at", { ascending: false }).limit(50),
      supabaseClient.from("valuation_training_data").select("*").eq("property_id", property_id),
    ]);

    const prompt = `You are a sports media valuation benchmark analyst. Review the following valuation history and training data to update market benchmarks.

Recent Valuations: ${JSON.stringify(recentValuations.data?.slice(0, 20))}
Training Data: ${JSON.stringify(trainingData.data?.slice(0, 20))}
Current Benchmarks: ${JSON.stringify(existingContext.data?.slice(0, 10))}

Return a JSON object with:
- benchmarks: array of { context_type: string, content: object, source: string } representing updated market benchmarks
- changes_summary: string (what changed and why)`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
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
      parsed = { benchmarks: [], changes_summary: responseText };
    }

    // Deactivate old benchmarks and insert new ones
    if (parsed.benchmarks?.length > 0) {
      await supabaseClient
        .from("claude_context")
        .update({ active: false })
        .eq("property_id", property_id)
        .eq("active", true);

      const inserts = parsed.benchmarks.map((b: any) => ({
        property_id,
        context_type: b.context_type || "valuation_benchmark",
        content: b.content,
        source: b.source || "benchmark_updater",
        active: true,
      }));

      await supabaseClient.from("claude_context").insert(inserts);
    }

    return new Response(JSON.stringify({ updated: parsed.benchmarks?.length || 0, summary: parsed.changes_summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

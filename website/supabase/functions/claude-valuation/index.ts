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

    const { asset_id, property_id, broadcast_minutes, screen_share_percent, clarity_score, audience_size, cpp } = await req.json();

    // Fetch training data and benchmarks for context
    const { data: trainingData } = await supabaseClient
      .from("valuation_training_data")
      .select("*")
      .eq("property_id", property_id)
      .limit(50);

    const { data: benchmarks } = await supabaseClient
      .from("claude_context")
      .select("*")
      .eq("property_id", property_id)
      .eq("active", true);

    // Build prompt for Claude
    const prompt = `You are a sports media valuation expert. Given the following broadcast data for a sponsorship asset, calculate the Estimated Media Value (EMV).

Input:
- Broadcast minutes: ${broadcast_minutes}
- Screen share %: ${screen_share_percent}
- Clarity score (0-1): ${clarity_score}
- Audience size: ${audience_size}
- CPP (cost per point): ${cpp}

Historical training data: ${JSON.stringify(trainingData?.slice(0, 10))}
Market benchmarks: ${JSON.stringify(benchmarks?.slice(0, 5))}

Return a JSON object with:
- calculated_emv: number (your calculated EMV)
- reasoning: string (2-3 sentence explanation)
- confidence: string ("high", "medium", "low")`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || "{}";

    // Parse Claude's response
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      parsed = { calculated_emv: 0, reasoning: responseText, confidence: "low" };
    }

    // Store the valuation
    const { data: valuation, error } = await supabaseClient
      .from("valuations")
      .insert({
        property_id,
        asset_id,
        broadcast_minutes,
        screen_share_percent,
        clarity_score,
        audience_size,
        cpp,
        calculated_emv: parsed.calculated_emv,
        claude_suggested_emv: parsed.calculated_emv,
        claude_reasoning: parsed.reasoning,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ valuation, confidence: parsed.confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

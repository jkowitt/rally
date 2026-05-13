import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, message, property_name } = await req.json();

    if (!name || !email || !message) {
      throw new Error("Name, email, and message are required");
    }

    // Send notification email (configure with your email service)
    // For now, log the contact form submission
    console.log("Contact form submission:", { name, email, message, property_name });

    // If RESEND_API_KEY is configured, send email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Loud CRM <noreply@loud-legacy.com>",
          to: ["jason@loud-legacy.com"],
          subject: `Contact Form: ${name} - ${property_name || "General"}`,
          text: `Name: ${name}\nEmail: ${email}\nProperty: ${property_name || "N/A"}\n\nMessage:\n${message}`,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

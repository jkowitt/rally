import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supports Resend (recommended) or SendGrid
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@loud-legacy.com";
const FROM_NAME = Deno.env.get("FROM_NAME") ?? "Loud Legacy";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { to, subject, body, reply_to } = await req.json();
    if (!to || !subject || !body) throw new Error("Missing to, subject, or body");

    let result;

    if (RESEND_API_KEY) {
      // Resend.com API
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: body,
          reply_to: reply_to || undefined,
        }),
      });
      result = await resp.json();
      if (!resp.ok) throw new Error(result.message || "Resend error");
    } else if (SENDGRID_API_KEY) {
      // SendGrid API
      const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: Array.isArray(to) ? to.map((e: string) => ({ email: e })) : [{ email: to }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject,
          content: [{ type: "text/html", value: body }],
          reply_to: reply_to ? { email: reply_to } : undefined,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "SendGrid error");
      }
      result = { status: "sent" };
    } else {
      throw new Error("No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY.");
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

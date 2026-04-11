// ============================================================
// EMAIL-MARKETING-TRACK
// ============================================================
// Open pixel + click redirect. Must respond in < 100ms — we use
// fire-and-forget DB writes (no await) and return immediately.
//
// GET /?pixel=<tracking_pixel_id>        → 1x1 transparent GIF
// GET /?click=<tracking_token>&s=<send>  → 302 redirect
//
// No auth — these are public endpoints reachable from any email client.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// 1x1 transparent GIF, pre-encoded as Uint8Array
const GIF_BYTES = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pixel = url.searchParams.get("pixel");
  const click = url.searchParams.get("click");
  const sendId = url.searchParams.get("s");

  // ─── Open pixel ─────────────────────────────────────────────
  if (pixel) {
    // Fire-and-forget DB write — do not await
    recordOpen(pixel).catch(() => {});
    return new Response(GIF_BYTES, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }

  // ─── Click redirect ─────────────────────────────────────────
  if (click) {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    // Fetch target URL (blocking — we need it to redirect)
    const { data: link } = await sb
      .from("email_campaign_links")
      .select("original_url, campaign_id")
      .eq("tracking_token", click)
      .maybeSingle();

    // Fire-and-forget click recording
    if (link) {
      recordClick(click, sendId).catch(() => {});
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: link?.original_url || "https://loud-legacy.com",
      },
    });
  }

  return new Response("Not Found", { status: 404 });
});

async function recordOpen(pixelId: string) {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: send } = await sb
    .from("email_campaign_sends")
    .select("id, subscriber_id, campaign_id, first_opened_at, open_count")
    .eq("tracking_pixel_id", pixelId)
    .maybeSingle();
  if (!send) return;

  const now = new Date().toISOString();
  await sb
    .from("email_campaign_sends")
    .update({
      opened_at: now,
      first_opened_at: send.first_opened_at || now,
      open_count: (send.open_count || 0) + 1,
    })
    .eq("id", send.id);

  // Update subscriber engagement
  if (send.subscriber_id) {
    await sb
      .from("email_subscribers")
      .update({
        last_opened_at: now,
        total_opens: supabase_increment(1),
      } as any)
      .eq("id", send.subscriber_id);

    await sb.from("email_subscriber_events").insert({
      subscriber_id: send.subscriber_id,
      event_type: "opened",
      campaign_id: send.campaign_id,
    });
  }
}

async function recordClick(token: string, sendId: string | null) {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: link } = await sb
    .from("email_campaign_links")
    .select("*")
    .eq("tracking_token", token)
    .maybeSingle();
  if (!link) return;

  await sb
    .from("email_campaign_links")
    .update({ click_count: (link.click_count || 0) + 1 })
    .eq("id", link.id);

  if (sendId) {
    const { data: send } = await sb
      .from("email_campaign_sends")
      .select("id, subscriber_id, click_count")
      .eq("id", sendId)
      .maybeSingle();
    if (send) {
      const now = new Date().toISOString();
      await sb.from("email_campaign_sends").update({
        clicked_at: now,
        click_count: (send.click_count || 0) + 1,
      }).eq("id", send.id);

      if (send.subscriber_id) {
        await sb.from("email_subscribers").update({
          last_clicked_at: now,
        }).eq("id", send.subscriber_id);

        await sb.from("email_subscriber_events").insert({
          subscriber_id: send.subscriber_id,
          event_type: "clicked",
          campaign_id: link.campaign_id,
          metadata: { token },
        });
      }
    }
  }
}

// Placeholder — Supabase JS doesn't support SQL-level increment
// directly through the JS client. We read+write in recordOpen/Click.
function supabase_increment(_: number) {
  return undefined;
}

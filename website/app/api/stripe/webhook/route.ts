import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, getPlanByPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error("Stripe not configured");
    return NextResponse.json({ error: "Payment system not configured" }, { status: 503 });
  }

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  // Log the successful checkout
  await prisma.activityLog.create({
    data: {
      userId,
      action: "CHECKOUT_COMPLETED",
      entityType: "Subscription",
      entityId: session.subscription as string,
      details: {
        sessionId: session.id,
        plan: session.metadata?.plan,
        interval: session.metadata?.interval,
      },
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    // Try to find user by customer ID
    const existingSub = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!existingSub) {
      console.error("Cannot find user for subscription:", subscription.id);
      return;
    }
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? getPlanByPriceId(priceId) : null;

  // Map Stripe status to our status
  const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "TRIALING" | "UNPAID"> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE",
    trialing: "TRIALING",
    unpaid: "UNPAID",
  };

  const data = {
    status: statusMap[subscription.status] || "ACTIVE",
    planType: (planInfo?.plan || "PROFESSIONAL") as "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE",
    billingCycle: (planInfo?.interval?.toUpperCase() || "MONTHLY") as "MONTHLY" | "YEARLY",
    amount: subscription.items.data[0]?.price.unit_amount || 0,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    stripePriceId: priceId,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
  };

  // Find existing subscription or create new
  const existingSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data,
    });
  } else if (userId) {
    await prisma.subscription.create({
      data: {
        ...data,
        userId,
        platform: "HUB",
        currency: "USD",
      },
    });
  }

  // Grant platform access based on plan
  if (userId && subscription.status === "active") {
    const platforms = ["HUB", "VALORA", "BUSINESS_NOW", "LEGACY_CRM", "VENUEVR"] as const;

    for (const platform of platforms) {
      await prisma.platformAccess.upsert({
        where: {
          userId_platform: { userId, platform },
        },
        update: { enabled: true },
        create: {
          userId,
          platform,
          enabled: true,
        },
      });
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });

  // Optionally revoke platform access
  const userId = subscription.metadata?.userId;
  if (userId) {
    await prisma.platformAccess.updateMany({
      where: { userId },
      data: { enabled: false },
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!subscription) return;

  // Record the payment
  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amount: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      status: "SUCCEEDED",
      stripePaymentIntentId: invoice.payment_intent as string,
      invoiceUrl: invoice.hosted_invoice_url,
      receiptUrl: invoice.invoice_pdf,
      paidAt: new Date(),
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: subscription.userId,
      action: "PAYMENT_SUCCEEDED",
      entityType: "Payment",
      entityId: invoice.id,
      details: {
        amount: invoice.amount_paid,
        currency: invoice.currency,
      },
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!subscription) return;

  // Record the failed payment
  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amount: invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status: "FAILED",
      stripePaymentIntentId: invoice.payment_intent as string,
      failureMessage: "Payment failed",
    },
  });

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "PAST_DUE" },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: subscription.userId,
      action: "PAYMENT_FAILED",
      entityType: "Payment",
      entityId: invoice.id,
      details: {
        amount: invoice.amount_due,
        currency: invoice.currency,
      },
    },
  });
}

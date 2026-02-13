import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe, PLANS, ADDONS, type PlanKey, type AddonKey, type BillingInterval } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to subscribe" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan, interval = "monthly", addons = [] } = body as {
      plan: PlanKey;
      interval: BillingInterval;
      addons?: AddonKey[];
    };

    // Validate plan
    if (!plan || !PLANS[plan]) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    const selectedPlan = PLANS[plan];
    const planPrice = selectedPlan.prices[interval];
    const priceId = planPrice?.priceId;
    const amount = planPrice?.amount;

    // Enterprise plans require contact
    if (!priceId || amount === null || amount === undefined) {
      return NextResponse.json(
        { error: "Please contact sales for Enterprise pricing", redirect: "/contact" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscriptions: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let stripeCustomerId = user.subscriptions[0]?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Build line items
    const lineItems: Array<{ price: string; quantity: number }> = [];

    // Add main plan (if not free)
    if (amount > 0) {
      lineItems.push({ price: priceId, quantity: 1 });
    }

    // Add any selected add-ons
    for (const addon of addons) {
      if (ADDONS[addon]) {
        const addonPriceId = ADDONS[addon].prices.monthly.priceId;
        if (addonPriceId) {
          lineItems.push({ price: addonPriceId, quantity: 1 });
        }
      }
    }

    // For free plans, just activate the subscription directly
    if (lineItems.length === 0) {
      // Create free subscription record
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await prisma.subscription.create({
        data: {
          userId: user.id,
          platform: "HUB", // Main platform
          status: "ACTIVE",
          planType: "STARTER",
          billingCycle: interval.toUpperCase() as "MONTHLY" | "YEARLY",
          amount: 0,
          currency: "USD",
          stripeCustomerId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      // Grant platform access
      await prisma.platformAccess.upsert({
        where: {
          userId_platform: {
            userId: user.id,
            platform: "HUB",
          },
        },
        update: { enabled: true },
        create: {
          userId: user.id,
          platform: "HUB",
          enabled: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Free plan activated",
        redirect: "/dashboard",
      });
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?checkout=canceled`,
      metadata: {
        userId: user.id,
        plan,
        interval,
        addons: addons.join(","),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

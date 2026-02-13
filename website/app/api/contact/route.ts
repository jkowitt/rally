import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

export const dynamic = 'force-dynamic';

// Rate limiting - simple in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 requests
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Validation schema
const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  company: z.string().max(200).optional().default(""),
  inquiryType: z.enum(["demo", "sales", "support", "partnership", "press", "other"]),
  product: z.enum(["valora", "sportify", "business-now", "legacy-crm", "all"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Google Cloud reCAPTCHA Enterprise verification
    const recaptchaResult = await verifyRecaptchaToken(body.recaptchaToken || '', 'contact');
    if (!recaptchaResult.success) {
      return NextResponse.json(
        { error: "Security verification failed. Please try again." },
        { status: 403 }
      );
    }

    // Validate input
    const validationResult = contactSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, company, inquiryType, product, message } = validationResult.data;

    // Log the contact form submission
    // Note: CRMLead requires an authenticated user, so we store in ActivityLog
    const activity = await prisma.activityLog.create({
      data: {
        action: "CONTACT_FORM_SUBMISSION",
        entityType: "ContactForm",
        entityId: `contact_${Date.now()}`,
        details: {
          name,
          email,
          company: company || null,
          inquiryType,
          product,
          message,
          submittedAt: new Date().toISOString(),
          source: "WEBSITE",
        },
      },
    });

    // In production, send email notification here
    console.log(`New contact form submission from ${name} (${email})`);

    return NextResponse.json({
      success: true,
      message: "Thank you for reaching out! We'll get back to you within one business day.",
      submissionId: activity.id,
    });

  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

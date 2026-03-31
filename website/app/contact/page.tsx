"use client";

import { Header } from "@/components/ll/Header";
import { Footer } from "@/components/ll/Footer";
import { Section } from "@/components/ll/Section";
import { ContactForm } from "@/components/ll/ContactForm";

export default function ContactPage() {
  return (
    <main>
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-16 bg-off-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-6">
              Contact
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-charcoal leading-[1.1]">
              Let&apos;s talk.
            </h1>
            <p className="mt-6 text-lg text-warm-gray leading-relaxed">
              Whether you&apos;re interested in The Collective, exploring a
              partnership, or want to learn more about what we&apos;re building
              — we&apos;d like to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
          <div className="lg:col-span-2">
            <div className="space-y-10">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-warm-gray mb-3">
                  Email
                </h3>
                <p className="text-base text-charcoal">
                  jason@loud-legacy.com
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-warm-gray mb-3">
                  Location
                </h3>
                <p className="text-base text-charcoal">Chicago, IL</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-warm-gray mb-3">
                  Response Time
                </h3>
                <p className="text-sm text-warm-gray leading-relaxed">
                  We respond to all inquiries within 48 hours. For time-sensitive
                  matters, please note that in your message.
                </p>
              </div>
              <div className="pt-8 border-t border-stone-200">
                <p className="text-sm text-warm-gray leading-relaxed">
                  Interested in The Collective? Select &quot;The Collective&quot;
                  from the inquiry type dropdown and tell us a bit about
                  yourself and what you&apos;re looking for.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Footer />
    </main>
  );
}

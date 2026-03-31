"use client";

import { Header } from "@/components/ll/Header";
import { Footer } from "@/components/ll/Footer";
import { Section, SectionHeader } from "@/components/ll/Section";
import { FeatureGrid } from "@/components/ll/FeatureGrid";
import { CTABlock } from "@/components/ll/CTABlock";

const principles = [
  {
    title: "Platforms, Not Projects",
    description:
      "Everything we build is designed to grow, evolve, and create compounding value over time. We don't build one-off ideas — we build infrastructure for opportunity.",
  },
  {
    title: "Long-Term Thinking",
    description:
      "We optimize for outcomes that matter in five years, not five weeks. Every decision is made with durability and scale in mind.",
  },
  {
    title: "Intentional Execution",
    description:
      "We move with purpose. Every platform, every partnership, every experience is designed with a clear objective and a focus on real results.",
  },
  {
    title: "Real Outcomes",
    description:
      "We measure success by what actually happens — partnerships formed, deals closed, businesses built. Not impressions, not followers, not vanity metrics.",
  },
];

export default function AboutPage() {
  return (
    <main>
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-20 bg-off-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-6">
              About
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-charcoal leading-[1.1]">
              We build platforms that create lasting impact.
            </h1>
            <div className="mt-1 h-px w-12 bg-accent opacity-40" />
          </div>
        </div>
      </section>

      {/* Overview */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">
              Who We Are
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-charcoal leading-tight">
              Loud Legacy is a platform development company.
            </h2>
          </div>
          <div className="space-y-6 text-base md:text-lg leading-relaxed text-warm-gray">
            <p>
              We build platforms at the intersection of business, relationships,
              and long-term impact. Each initiative under Loud Legacy is designed
              to connect the right people, create real opportunity, and deliver
              outcomes that compound over time.
            </p>
            <p>
              Our first platform — The Collective — is live and active in
              Chicago, bringing together a curated network of business leaders,
              brands, and decision-makers through intentional experiences and
              strategic introductions.
            </p>
            <p>
              This is the beginning. Loud Legacy is building a series of
              platforms across business, sports, technology, and community —
              each one designed with the same principles of quality, intention,
              and execution.
            </p>
          </div>
        </div>
      </Section>

      {/* Vision */}
      <Section className="bg-stone-50">
        <SectionHeader
          label="Vision"
          title="Scale opportunity through intentional platforms."
          description="The world doesn't need more tools, more apps, or more noise. It needs better infrastructure for connection and opportunity. That's what Loud Legacy is building."
        />
      </Section>

      {/* Philosophy */}
      <Section>
        <SectionHeader
          label="Philosophy"
          title="How we think about building."
        />
        <FeatureGrid features={principles} columns={2} />
      </Section>

      {/* CTA */}
      <Section dark>
        <CTABlock
          headline="See what we're building."
          primaryLabel="Explore The Collective"
          primaryHref="/the-collective"
          secondaryLabel="Get In Touch"
          secondaryHref="/contact"
          dark
        />
      </Section>

      <Footer />
    </main>
  );
}

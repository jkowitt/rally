"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Header } from "@/components/ll/Header";
import { Footer } from "@/components/ll/Footer";
import { Section, SectionHeader } from "@/components/ll/Section";
import { FeatureGrid } from "@/components/ll/FeatureGrid";
import { CTABlock } from "@/components/ll/CTABlock";

const collectivePillars = [
  {
    title: "Curated Membership",
    description:
      "A vetted network of business leaders, founders, and decision-makers selected for their ability to create mutual value.",
  },
  {
    title: "Premium Experiences",
    description:
      "Intentionally designed events and gatherings that go beyond networking — built for real conversation and real opportunity.",
  },
  {
    title: "Strategic Introductions",
    description:
      "Warm, purposeful connections between members based on alignment, complementary strengths, and shared objectives.",
  },
];

export default function HomePage() {
  return (
    <main>
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center bg-off-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-32 md:py-40">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-6">
              Loud Legacy
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-charcoal leading-[1.08]">
              Building platforms that create opportunity.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-warm-gray leading-relaxed max-w-2xl">
              Loud Legacy develops platforms at the intersection of business,
              relationships, and long-term impact. Each initiative is designed to
              connect the right people and create meaningful outcomes.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/the-collective"
                className="inline-flex items-center px-7 py-3.5 text-sm font-semibold text-white bg-charcoal rounded-sm hover:bg-charcoal-light transition-colors"
              >
                Explore The Collective
              </Link>
              <Link
                href="#what-we-build"
                className="inline-flex items-center px-7 py-3.5 text-sm font-semibold text-charcoal border border-stone-300 rounded-sm hover:bg-stone-50 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="w-px h-12 bg-stone-300"
          />
        </div>
      </section>

      {/* WHAT WE BUILD */}
      <Section id="what-we-build">
        <SectionHeader
          label="What We Build"
          title="Platforms designed to connect people, ideas, and opportunity."
          description="We build platforms designed to connect people, ideas, and opportunity. Each initiative under Loud Legacy is focused on creating real outcomes through intentional structure and execution."
        />
      </Section>

      {/* THE COLLECTIVE — FEATURED */}
      <Section dark>
        <SectionHeader
          label="Now Live"
          title="The Collective"
          description="A private network built to create real business opportunities through curated relationships and experiences."
          dark
        />

        <div className="max-w-3xl mx-auto mb-16">
          <p className="text-base md:text-lg leading-relaxed text-warm-gray-light text-center">
            The Collective is the first platform launched under Loud Legacy.
            Built as a private network of business leaders, brands, and
            decision-makers, it is designed to facilitate meaningful connections
            that lead to partnerships, deals, and long-term growth.
          </p>
          <p className="mt-6 text-base md:text-lg leading-relaxed text-warm-gray-light text-center">
            Launching in Chicago, The Collective brings together a curated group
            of members and partners through intentional experiences, strategic
            introductions, and a shared focus on creating real opportunity.
          </p>
        </div>

        <FeatureGrid features={collectivePillars} dark />

        <div className="mt-16 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center px-7 py-3.5 text-sm font-semibold bg-white text-charcoal rounded-sm hover:bg-stone-100 transition-colors"
            >
              Request Access
            </Link>
            <Link
              href="/the-collective"
              className="inline-flex items-center px-7 py-3.5 text-sm font-semibold border border-white/20 text-white rounded-sm hover:bg-white/5 transition-colors"
            >
              Visit The Collective
            </Link>
          </div>
        </div>
      </Section>

      {/* WHY IT EXISTS */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            label="Why It Exists"
            title="Quality over volume. Intention over noise."
            center={false}
          />
          <p className="text-base md:text-lg leading-relaxed text-warm-gray">
            Most networks are built around volume, not value. Loud Legacy exists
            to build platforms that prioritize quality, intention, and real
            outcomes. The goal is simple: bring the right people together and
            create something meaningful.
          </p>
        </div>
      </Section>

      {/* WHAT'S NEXT */}
      <Section className="bg-stone-50">
        <SectionHeader
          label="What&apos;s Next"
          title="The Collective is the beginning."
          description="Loud Legacy is building a series of platforms across business, sports, technology, and community — designed to scale opportunity and create long-term impact."
        />
      </Section>

      {/* FINAL CTA */}
      <Section dark>
        <CTABlock
          headline="Built for those creating what's next."
          primaryLabel="Explore The Collective"
          primaryHref="/the-collective"
          secondaryLabel="Request Access"
          secondaryHref="/contact"
          dark
        />
      </Section>

      <Footer />
    </main>
  );
}

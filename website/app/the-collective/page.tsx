"use client";

import Link from "next/link";
import { Header } from "@/components/ll/Header";
import { Footer } from "@/components/ll/Footer";
import { Section, SectionHeader } from "@/components/ll/Section";
import { FeatureGrid } from "@/components/ll/FeatureGrid";
import { CTABlock } from "@/components/ll/CTABlock";

const pillars = [
  {
    title: "Curated Membership",
    description:
      "Every member is vetted and selected for their ability to contribute and create mutual value. This is not a community open to everyone — it is a network built for the right people.",
  },
  {
    title: "Premium Experiences",
    description:
      "From intimate dinners to exclusive events, every gathering is designed to create space for real conversation, authentic connection, and tangible opportunity.",
  },
  {
    title: "Strategic Introductions",
    description:
      "Connections are made with intention. Every introduction is based on alignment, complementary strengths, and a clear path to mutual benefit.",
  },
];

const whoItsFor = [
  {
    title: "Business Leaders & Founders",
    description:
      "Executives and entrepreneurs who understand the value of relationships and are looking for a more intentional way to build them.",
  },
  {
    title: "Brand & Agency Principals",
    description:
      "Decision-makers looking to connect with high-caliber partners, clients, and collaborators in a curated setting.",
  },
  {
    title: "Investors & Advisors",
    description:
      "Individuals who want proximity to deal flow, talent, and strategic opportunities through a trusted, private network.",
  },
];

const howItWorks = [
  {
    title: "Apply or Get Referred",
    description:
      "Membership begins with an application or a referral from a current member. Every applicant is reviewed for fit and mutual value.",
  },
  {
    title: "Get Connected",
    description:
      "Once accepted, members are strategically introduced to others in the network based on goals, industry, and opportunity alignment.",
  },
  {
    title: "Engage & Build",
    description:
      "Attend curated experiences, participate in intimate gatherings, and leverage the network to create real business outcomes.",
  },
];

export default function TheCollectivePage() {
  return (
    <main>
      <Header />

      {/* Hero */}
      <section className="relative pt-40 pb-24 bg-charcoal text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-light mb-6">
              The Collective
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Where the right relationships create real opportunity.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-warm-gray-light leading-relaxed max-w-2xl">
              A private network of business leaders, brands, and
              decision-makers — built to facilitate meaningful connections that
              lead to partnerships, deals, and long-term growth.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center px-7 py-3.5 text-sm font-semibold bg-white text-charcoal rounded-sm hover:bg-stone-100 transition-colors"
              >
                Request Access
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center px-7 py-3.5 text-sm font-semibold border border-white/20 text-white rounded-sm hover:bg-white/5 transition-colors"
              >
                How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What It Is */}
      <Section>
        <div className="max-w-3xl mx-auto text-center">
          <SectionHeader
            label="About The Collective"
            title="A private network built for real outcomes."
          />
          <div className="space-y-6 text-base md:text-lg leading-relaxed text-warm-gray">
            <p>
              The Collective is the first platform launched under Loud Legacy.
              It was built with a simple premise: the most valuable business
              opportunities come from trust, proximity, and intention — not
              volume.
            </p>
            <p>
              Launching in Chicago, The Collective brings together a carefully
              selected group of members and partners through curated
              experiences, strategic introductions, and a shared commitment to
              creating real value.
            </p>
          </div>
        </div>
      </Section>

      {/* Pillars */}
      <Section className="bg-stone-50">
        <SectionHeader
          label="The Foundation"
          title="Built on three pillars."
          description="Everything in The Collective is designed around these principles."
        />
        <FeatureGrid features={pillars} />
      </Section>

      {/* Who It's For */}
      <Section>
        <SectionHeader
          label="Membership"
          title="Who it&apos;s for."
          description="The Collective is designed for professionals who create value through relationships."
        />
        <FeatureGrid features={whoItsFor} />
      </Section>

      {/* How It Works */}
      <Section id="how-it-works" className="bg-stone-50">
        <SectionHeader
          label="Process"
          title="How it works."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorks.map((step, i) => (
            <div key={step.title} className="group">
              <span className="text-5xl font-bold text-stone-200 group-hover:text-accent transition-colors duration-300">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-base font-semibold text-charcoal mb-3">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-warm-gray">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section dark>
        <CTABlock
          headline="Built for those who create opportunity."
          primaryLabel="Request Access"
          primaryHref="/contact"
          secondaryLabel="Learn About Loud Legacy"
          secondaryHref="/about"
          dark
        />
      </Section>

      <Footer />
    </main>
  );
}

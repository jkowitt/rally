"use client";

import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export default function WhyLoudLegacyPage() {
  return (
    <main className="why-ll-page">
      <Header />

      {/* Hero */}
      <section className="why-ll-hero">
        <div className="container">
          <Image
            src="/logos/rally-logo-transparent-white.png"
            alt="Loud Legacy"
            width={180}
            height={46}
            className="why-ll-hero-logo"
            priority
          />
          <h1>Why Loud Legacy</h1>
          <p className="why-ll-hero-subtitle">
            Because everyone deserves a name, a voice, and a legacy that echoes.
          </p>
        </div>
      </section>

      {/* Main Statement */}
      <section className="why-ll-statement">
        <div className="container">
          <div className="why-ll-statement-inner">

            <p className="why-ll-lead">
              There are very few things in life you can truly control. You
              can&apos;t control the market. You can&apos;t control how other
              people see the world. You can&apos;t always choose where you start.
              But there is one thing you have a direct, undeniable impact on:
              the people around you and the legacy you leave behind.
            </p>

            <p>
              Loud Legacy was born from a single, foundational belief — that every
              person has the potential to do something great. Not in theory. Not
              someday. Right now. The problem has never been a shortage of talent or
              ambition. The problem is that too many people never get the platform,
              the tools, or the support system to turn that potential into something
              real. Too many legacies go unbuilt. Too many voices go unheard. Too
              many people stay in the background, not because they belong there, but
              because no one ever opened the door.
            </p>

            <p>
              That is what Loud Legacy exists to change.
            </p>

            <div className="why-ll-divider" />

            <p>
              Building something bigger than yourself is not a single act — it&apos;s
              a multi-pronged approach that touches every part of a person&apos;s
              life. It&apos;s about helping someone achieve true, lasting value —
              whether that means growing personally, advancing professionally,
              launching a business from nothing, or holding onto a family property
              and making sure it gets passed down from generation to generation
              without losing its worth along the way. Legacy is not just about what
              you build. It&apos;s about what endures.
            </p>

            <p>
              Loud Legacy is here to give the little guy a name and a voice in a
              world that too often overlooks them. It&apos;s about making sure that
              the people who have been operating in the background — the ones
              grinding without recognition, building without fanfare, creating
              without credit — are no longer invisible. We are pulling them to the
              front. We are amplifying what they&apos;ve already been doing. And we
              are building the infrastructure to make sure their work stands the
              test of time.
            </p>

            <div className="why-ll-divider" />

            <p>
              Rally, our fan engagement and loyalty platform, is the first major
              expression of this mission. It connects fans with the teams and
              communities they care about across collegiate athletics, the NBA, NFL,
              MLB, NHL, MLS, UWSL, and live entertainment — giving every property,
              from the biggest programs to the smallest markets, the same powerful
              tools to engage their audience, reward loyalty, and build something
              that lasts. No one gets left behind because of their size, their
              budget, or their zip code.
            </p>

            <p>
              But Rally is only the beginning.
            </p>

            <div className="why-ll-highlight">
              <h3>On the Horizon</h3>
              <p>
                Loud Legacy is expanding into industries far beyond sports.
                Business consulting, real estate, property management, and business
                management are all on the roadmap — each one designed with the same
                core principle: give people who have been underserved the platforms,
                knowledge, and tools they need to build, grow, and protect what
                matters most to them. Whether it&apos;s a first-generation business
                owner who needs guidance, a family trying to preserve generational
                wealth, or an entrepreneur who just needs someone to believe in the
                vision — Loud Legacy is building for all of them.
              </p>
            </div>

            <p className="why-ll-closing">
              Loud Legacy is here, and it will leave a lasting mark on multiple
              industries. Not because we&apos;re the loudest voice in the room, but
              because we&apos;re building something that makes everyone else&apos;s
              voice louder.
            </p>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="legal-cta">
        <div className="container">
          <h2>Be Part of the Legacy</h2>
          <p>Whether you&apos;re a fan, a team, or a business — there&apos;s a place for you here.</p>
          <div className="cta-actions">
            <Link href="/auth/signup" className="rally-btn rally-btn--primary rally-btn--large">
              Get Started
            </Link>
            <Link href="/contact" className="rally-btn rally-btn--secondary rally-btn--large">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

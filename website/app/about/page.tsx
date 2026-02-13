import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About Us - Loud Legacy",
  description: "Loud Legacy exists to help people show up with confidence, clarity, and presence. Built by operators who believe impact is created when people stop shrinking and start using their voice with intention.",
};

const team = [
  {
    name: "Founder & Vision",
    description: "Sets the philosophy, direction, and long-term mission. Ensures everything stays aligned with purpose, impact, and legacy."
  },
  {
    name: "Strategy & Content",
    description: "Builds frameworks, messaging, and educational content designed to help people think clearly and act boldly."
  },
  {
    name: "Community & Experiences",
    description: "Creates environments, workshops, and conversations where people practice using their voice in real-world situations."
  },
  {
    name: "Creative & Brand",
    description: "Brings the Loud Legacy identity to life through design, storytelling, and experience-driven execution."
  }
];

const timeline = [
  {
    phase: "The Spark",
    description: "An idea formed through lived experience and repeated conversations about confidence and communication."
  },
  {
    phase: "The Foundation",
    description: "Core beliefs and the Loud Legacy framework were defined, setting the tone for everything that followed."
  },
  {
    phase: "The Build",
    description: "Content, coaching, and tools began rolling out as the brand found its voice and audience."
  },
  {
    phase: "The Expansion",
    description: "Loud Legacy grew into a platform with programs, partnerships, and community-driven experiences."
  },
  {
    phase: "The Legacy Phase",
    description: "An ongoing evolution into an enduring ecosystem focused on long-term impact, leadership, and generational influence."
  },
];

const values = [
  {
    title: "Clarity",
    description: "We value clear thinking, honest communication, and intentional action."
  },
  {
    title: "Courage",
    description: "Growth requires speaking before comfort arrives. We choose action over hesitation."
  },
  {
    title: "Authenticity",
    description: "We do not teach performance. We help people show up as themselves with confidence."
  },
  {
    title: "Consistency",
    description: "Legacy is built through daily choices, not single moments."
  },
  {
    title: "Impact",
    description: "Everything we create should leave people stronger, more confident, and more capable."
  },
  {
    title: "Responsibility",
    description: "Using your voice carries weight. Influence should be used to build, uplift, and lead with integrity."
  }
];

export default function AboutPage() {
  return (
    <main>
      <Header />

      {/* Hero */}
      <section className="about-hero">
        <div className="container">
          <h1>Live loud. Create impact. Build a legacy.</h1>
          <p className="hero-subtitle">
            Loud Legacy exists to help people show up with confidence, clarity, and presence.
            We believe impact is created when people stop shrinking and start using their voice with intention.
          </p>
        </div>
      </section>

      {/* Who We Are */}
      <section className="about-story">
        <div className="container">
          <div className="story-content">
            <h2>Who we are</h2>
            <p>
              This is not about being louder than everyone else.
            </p>
            <p>
              It is about being clear, grounded, and impossible to ignore.
            </p>
            <p>
              We build tools and experiences that help operators, founders, and leaders
              communicate with confidence and run their businesses with intention. Legacy RE,
              Sportify, Business Now, and Legacy CRM are how we put this philosophy into action—software
              built for people who refuse to shrink.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="about-founder">
        <div className="container">
          <h2>Founder story</h2>
          <div className="founder-content">
            <p>
              Loud Legacy was born from a repeated pattern seen across leadership rooms,
              creative spaces, and everyday conversations.
            </p>
            <p className="founder-highlight">
              Capable people staying quiet when their voice mattered most.
            </p>
            <p>
              Not because they lacked talent or ideas. Because they doubted themselves.
            </p>
            <p>
              The founder watched confidence outperform competence again and again.
              The loudest voice was rarely the strongest. The clearest voice was.
            </p>
            <p>
              Loud Legacy was created to close that gap. It exists to help people develop
              confidence through action, sharpen their communication, and build something
              meaningful that lasts. A legacy shaped by intention, not volume.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="about-team">
        <div className="container">
          <h2>Our team</h2>
          <p className="team-intro">
            Loud Legacy is powered by a focused group of builders, strategists, and creatives
            who believe communication changes outcomes.
          </p>
          <div className="team-grid">
            {team.map((member) => (
              <div key={member.name} className="team-card">
                <h3>{member.name}</h3>
                <p>{member.description}</p>
              </div>
            ))}
          </div>
          <p className="hiring-note">
            The team grows intentionally. Every contributor is here for one reason: to help others show up fully.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="about-timeline">
        <div className="container">
          <h2>Our journey</h2>
          <div className="timeline">
            {timeline.map((item, index) => (
              <div key={item.phase} className="timeline-item">
                <span className="timeline-number">{index + 1}</span>
                <div className="timeline-content">
                  <span className="timeline-phase">{item.phase}</span>
                  <p className="timeline-description">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="about-values">
        <div className="container">
          <h2>What we believe</h2>
          <div className="values-grid">
            {values.map((value) => (
              <div key={value.title} className="value-card">
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <div className="container">
          <h2>Ready to show up fully?</h2>
          <p>Join operators who've stopped shrinking and started building their legacy.</p>
          <div className="cta-actions">
            <Link href="/contact" className="button button--primary">
              Get Started
            </Link>
            <Link href="/pricing" className="button button--secondary">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

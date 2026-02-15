"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

const inquiryTypes = [
  { value: "demo", label: "Schedule a demo" },
  { value: "sales", label: "Sales inquiry" },
  { value: "partnership", label: "Sponsorship or partnership" },
  { value: "support", label: "Support question" },
  { value: "other", label: "Other" },
];

const propertyTypes = [
  { value: "college", label: "College Athletic Department" },
  { value: "pro-team", label: "Professional Sports Team" },
  { value: "league", label: "League or Conference" },
  { value: "entertainment", label: "Entertainment / Live Events" },
  { value: "venue", label: "Venue Operator" },
  { value: "sponsor", label: "Brand / Sponsor" },
  { value: "other", label: "Other" },
];

const leagueOptions = [
  { value: "college", label: "College / NCAA" },
  { value: "nba", label: "NBA" },
  { value: "nfl", label: "NFL" },
  { value: "mlb", label: "MLB" },
  { value: "nhl", label: "NHL" },
  { value: "mls", label: "MLS" },
  { value: "uwsl", label: "UWSL" },
  { value: "entertainment", label: "Entertainment / Non-Sports" },
  { value: "multiple", label: "Multiple Leagues" },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    jobTitle: "",
    inquiryType: "demo",
    propertyType: "college",
    league: "college",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    const id = "recaptcha-enterprise-script";
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const getRecaptchaToken = useCallback(async (): Promise<string | null> => {
    if (!RECAPTCHA_SITE_KEY) return null;
    try {
      const grecaptcha = (window as unknown as { grecaptcha: { enterprise: { ready: (cb: () => void) => void; execute: (key: string, opts: { action: string }) => Promise<string> } } }).grecaptcha;
      return await new Promise<string>((resolve) => {
        grecaptcha.enterprise.ready(async () => {
          const token = await grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action: "contact" });
          resolve(token);
        });
      });
    } catch {
      return null;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const recaptchaToken = await getRecaptchaToken();

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, recaptchaToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <main className="rally-landing">
      <Header />

      <section className="contact-page">
        <div className="container">
          <div className="contact-grid">
            {/* Form */}
            <div className="contact-form-wrapper">
              <h1>Schedule a Demo</h1>
              <p className="contact-intro">
                See how Rally drives attendance, engagement, and sponsor ROI for your property. Fill out the form and our team will be in touch.
              </p>

              {submitted ? (
                <div className="contact-success">
                  <div className="success-icon">&#10003;</div>
                  <h2>Thanks for reaching out!</h2>
                  <p>We&apos;ll get back to you within one business day to schedule your demo.</p>
                  <Link href="/" className="rally-btn rally-btn--secondary">
                    Back to Home
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Your name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Work Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="you@organization.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="company">Organization *</label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        required
                        placeholder="Team, school, or company name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="jobTitle">Job Title</label>
                      <input
                        type="text"
                        id="jobTitle"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleChange}
                        placeholder="Your role"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="propertyType">Property Type</label>
                      <select
                        id="propertyType"
                        name="propertyType"
                        value={formData.propertyType}
                        onChange={handleChange}
                      >
                        {propertyTypes.map((pt) => (
                          <option key={pt.value} value={pt.value}>
                            {pt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="league">League / Segment</label>
                      <select
                        id="league"
                        name="league"
                        value={formData.league}
                        onChange={handleChange}
                      >
                        {leagueOptions.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="inquiryType">How can we help?</label>
                    <select
                      id="inquiryType"
                      name="inquiryType"
                      value={formData.inquiryType}
                      onChange={handleChange}
                    >
                      {inquiryTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Tell us about your property</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="What are you looking to achieve with fan engagement? Any specific challenges or goals?"
                    />
                  </div>

                  {error && (
                    <div className="form-error" role="alert">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="rally-btn rally-btn--primary rally-btn--large"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    style={{ width: '100%' }}
                  >
                    {isLoading ? "Sending..." : "Request a Demo"}
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar */}
            <div className="contact-sidebar">
              <div className="sidebar-card">
                <h3>What to expect</h3>
                <ul className="quick-links">
                  <li>A personalized walkthrough of Rally tailored to your property type and league</li>
                  <li>Live demo of the admin dashboard, fan experience, and analytics</li>
                  <li>Discussion of your specific goals, challenges, and use cases</li>
                </ul>
              </div>

              <div className="sidebar-card">
                <h3>Response time</h3>
                <p>We typically respond within <strong>one business day</strong>.</p>
                <p>For urgent inquiries, email <a href="mailto:sales@loud-legacy.com">sales@loud-legacy.com</a></p>
              </div>

              <div className="sidebar-card">
                <h3>Book directly</h3>
                <p>Skip the form and schedule time with our team.</p>
                <a
                  href="https://calendly.com/loud-legacy/demo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rally-btn rally-btn--secondary"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  Book a Demo Call
                </a>
              </div>

              <div className="sidebar-card">
                <h3>Explore first</h3>
                <ul className="quick-links">
                  <li><Link href="/platform">Platform overview</Link></li>
                  <li><Link href="/use-cases">Use cases</Link></li>
                  <li><Link href="/solutions/college">College solutions</Link></li>
                  <li><Link href="/solutions/professional">Pro sports solutions</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

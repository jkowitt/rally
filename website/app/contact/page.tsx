"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

const reasonOptions = [
  { value: "general", label: "General question" },
  { value: "support", label: "Help with my account" },
  { value: "feedback", label: "Feedback or suggestion" },
  { value: "property", label: "I represent a team or property" },
  { value: "partnership", label: "Partnership or sponsorship" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    reason: "general",
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
              <h1>Get in Touch</h1>
              <p className="contact-intro">
                Have a question, feedback, or just want to say what&apos;s up? We&apos;d love to hear from you.
              </p>

              {submitted ? (
                <div className="contact-success">
                  <div className="success-icon">&#10003;</div>
                  <h2>Message sent!</h2>
                  <p>We&apos;ll get back to you within one business day.</p>
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
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="you@email.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="reason">What&apos;s this about?</label>
                    <select
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                    >
                      {reasonOptions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Tell us what's on your mind..."
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
                    {isLoading ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar */}
            <div className="contact-sidebar">
              <div className="sidebar-card">
                <h3>Quick links</h3>
                <ul className="quick-links">
                  <li><Link href="/how-it-works">How Rally works</Link></li>
                  <li><Link href="/rewards">Rewards & tiers</Link></li>
                  <li><Link href="/leagues">Browse leagues</Link></li>
                </ul>
              </div>

              <div className="sidebar-card">
                <h3>Response time</h3>
                <p>We typically respond within <strong>one business day</strong>.</p>
                <p>For urgent help, email <a href="mailto:support@loud-legacy.com">support@loud-legacy.com</a></p>
              </div>

              <div className="sidebar-card">
                <h3>For teams & properties</h3>
                <p>If you represent a team, league, or venue — check out our property page or schedule a demo.</p>
                <Link href="/for-properties" className="rally-btn rally-btn--secondary" style={{ width: '100%', textAlign: 'center' }}>
                  For Teams & Properties
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

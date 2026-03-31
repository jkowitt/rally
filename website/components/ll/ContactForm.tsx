"use client";

import { useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    inquiry: "general",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full bg-charcoal flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-charcoal mb-2">Message received.</h3>
        <p className="text-warm-gray text-sm">
          We&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-warm-gray mb-2">
            Name
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 text-sm bg-white border border-stone-200 rounded-sm text-charcoal placeholder-warm-gray-light focus:outline-none focus:border-charcoal transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-warm-gray mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 text-sm bg-white border border-stone-200 rounded-sm text-charcoal placeholder-warm-gray-light focus:outline-none focus:border-charcoal transition-colors"
            placeholder="you@company.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-warm-gray mb-2">
            Company
          </label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full px-4 py-3 text-sm bg-white border border-stone-200 rounded-sm text-charcoal placeholder-warm-gray-light focus:outline-none focus:border-charcoal transition-colors"
            placeholder="Company name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-warm-gray mb-2">
            Inquiry Type
          </label>
          <select
            value={form.inquiry}
            onChange={(e) => setForm({ ...form, inquiry: e.target.value })}
            className="w-full px-4 py-3 text-sm bg-white border border-stone-200 rounded-sm text-charcoal focus:outline-none focus:border-charcoal transition-colors appearance-none"
          >
            <option value="general">General Inquiry</option>
            <option value="collective">The Collective</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-widest text-warm-gray mb-2">
          Message
        </label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-3 text-sm bg-white border border-stone-200 rounded-sm text-charcoal placeholder-warm-gray-light focus:outline-none focus:border-charcoal transition-colors resize-none"
          placeholder="Tell us what you're working on..."
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center px-8 py-3.5 text-sm font-semibold text-white bg-charcoal rounded-sm hover:bg-charcoal-light transition-colors"
      >
        Send Message
      </button>
    </form>
  );
}

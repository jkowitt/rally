"use client";

const stats = [
  { value: "4,200+", label: "Valuations Run", description: "Properties analyzed through Legacy RE" },
  { value: "89%", label: "Time Saved", description: "Average reduction in underwriting time" },
  { value: "50+", label: "Firms", description: "Investment firms using Legacy RE" },
  { value: "10", label: "Property Types", description: "Supported across all asset classes" },
];

const testimonials = [
  {
    quote: "What used to take our team 3 days now takes about 4 hours. The comps and underwriting flow together seamlessly.",
    author: "Managing Partner",
    org: "Regional CRE Firm",
    product: "Legacy RE"
  },
  {
    quote: "Valuations, comps, and underwriting in one place. I stopped switching between spreadsheets and it just works.",
    author: "Senior Analyst",
    org: "National Investment Group",
    product: "Legacy RE"
  },
  {
    quote: "The AI condition scoring changed how we look at properties. We catch things we used to miss in walkthroughs.",
    author: "VP of Acquisitions",
    org: "Multifamily REIT",
    product: "Legacy RE"
  }
];

export function SocialProof() {
  return (
    <section className="social-proof-section">
      <div className="container">
        {/* Stats */}
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-description">{stat.description}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="testimonials-section">
          <h3>What operators are saying</h3>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <blockquote>"{testimonial.quote}"</blockquote>
                <div className="testimonial-author">
                  <div className="author-info">
                    <span className="author-title">{testimonial.author}</span>
                    <span className="author-org">{testimonial.org}</span>
                  </div>
                  <span className="testimonial-product">{testimonial.product}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="trust-badges">
          <span>SOC 2 Compliant</span>
          <span>256-bit Encryption</span>
          <span>99.9% Uptime SLA</span>
          <span>GDPR Ready</span>
        </div>
      </div>
    </section>
  );
}

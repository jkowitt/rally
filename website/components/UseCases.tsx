"use client";

const useCases = [
  {
    title: "Commercial Real Estate",
    audience: "Investors, Analysts, Underwriters",
    description: "Analyze deals in hours instead of days. Get AI-powered valuations, automated comps, and financial projections that update in real time.",
    products: ["Legacy RE"],
    example: "A regional firm cut their deal analysis time from 3 days to 4 hours per property.",
    color: "#1B2A4A"
  },
  {
    title: "Brokerage & Advisory",
    audience: "Brokers, Advisors, Appraisers",
    description: "Build professional valuations for client meetings, back up your pricing with real data, and win more listings.",
    products: ["Legacy RE"],
    example: "A brokerage team increased their listing presentations by 40% using market data from Legacy RE.",
    color: "#D4A843"
  },
  {
    title: "Lending & Capital Markets",
    audience: "Lenders, Credit Analysts, Portfolio Managers",
    description: "Review deals consistently, verify borrower assumptions against market data, and make lending decisions with confidence.",
    products: ["Legacy RE"],
    example: "A lending team standardized underwriting across 200+ loan applications per year.",
    color: "#1B2A4A"
  }
];

export function UseCases() {
  return (
    <section className="use-cases-section">
      <div className="container">
        <div className="section-header">
          <h2>Built for how you actually work</h2>
          <p>Different industries. Same need: structure over chaos.</p>
        </div>

        <div className="use-cases-grid">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="use-case-card">
              <div className="use-case-header" style={{ borderLeftColor: useCase.color }}>
                <h3>{useCase.title}</h3>
                <span className="audience">{useCase.audience}</span>
              </div>
              <p className="use-case-description">{useCase.description}</p>
              <div className="products-used">
                {useCase.products.map((product) => (
                  <span key={product} className="product-tag">{product}</span>
                ))}
              </div>
              <div className="use-case-example">
                <span className="example-label">Real example:</span>
                <p>{useCase.example}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

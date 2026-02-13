"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
const industries = [
  { value: "real-estate", label: "Real Estate" },
  { value: "sports", label: "Sports & Athletics" },
  { value: "consulting", label: "Consulting" },
  { value: "events", label: "Events & Entertainment" },
  { value: "finance", label: "Finance & Investment" },
  { value: "technology", label: "Technology" },
  { value: "other", label: "Other" },
];

const companySize = [
  { value: "solo", label: "Just me" },
  { value: "small", label: "2-10 people" },
  { value: "medium", label: "11-50 people" },
  { value: "large", label: "51-200 people" },
  { value: "enterprise", label: "200+ people" },
];

const primaryProducts = [
  { value: "valora", label: "Legacy RE", description: "Real estate analysis & underwriting" },
  { value: "sportify", label: "Sportify", description: "Sports event management" },
  { value: "business-now", label: "Business Now", description: "Operations & consulting" },
  { value: "legacy-crm", label: "Legacy CRM", description: "Relationship management" },
  { value: "all", label: "All products", description: "Full platform access" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const session: any = null;
  const status: string = "unauthenticated";
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    industry: "",
    companySize: "",
    primaryProduct: "",
    goals: "",
  });

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  if (status === "loading") {
    return (
      <main className="onboarding-page">
        <div className="onboarding-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Save onboarding data
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      // Still redirect on error - onboarding is optional
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <main className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-card">
          {/* Progress */}
          <div className="onboarding-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
            <div className="progress-steps">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`progress-step ${s <= step ? "active" : ""} ${s < step ? "completed" : ""}`}
                  aria-current={s === step ? "step" : undefined}
                >
                  {s < step ? "✓" : s}
                </div>
              ))}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
            </div>
          </div>

          {/* Welcome */}
          <div className="onboarding-header">
            <h1>Welcome to Loud Legacy{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!</h1>
            <p>Let's personalize your experience. This only takes a minute.</p>
          </div>

          {/* Step 1: Industry & Size */}
          {step === 1 && (
            <div className="onboarding-step">
              <h2>Tell us about yourself</h2>

              <div className="form-group">
                <label htmlFor="industry">What industry are you in?</label>
                <select
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                >
                  <option value="">Select your industry</option>
                  {industries.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="companySize">How big is your team?</label>
                <select
                  id="companySize"
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                >
                  <option value="">Select team size</option>
                  {companySize.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="onboarding-actions">
                <button
                  onClick={() => setStep(2)}
                  className="button button--primary"
                  disabled={!formData.industry || !formData.companySize}
                >
                  Continue
                </button>
                <button onClick={handleSkip} className="button button--text">
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Product Selection */}
          {step === 2 && (
            <div className="onboarding-step">
              <h2>What brings you here?</h2>
              <p className="step-description">Select the product you're most interested in.</p>

              <div className="product-grid">
                {primaryProducts.map((product) => (
                  <button
                    key={product.value}
                    className={`product-option ${formData.primaryProduct === product.value ? "selected" : ""}`}
                    onClick={() => setFormData({ ...formData, primaryProduct: product.value })}
                    aria-pressed={formData.primaryProduct === product.value}
                  >
                    <span className="product-name">{product.label}</span>
                    <span className="product-description">{product.description}</span>
                  </button>
                ))}
              </div>

              <div className="onboarding-actions">
                <button onClick={() => setStep(1)} className="button button--secondary">
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="button button--primary"
                  disabled={!formData.primaryProduct}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="onboarding-step">
              <h2>What do you want to achieve?</h2>
              <p className="step-description">Tell us your goals so we can help you get there faster.</p>

              <div className="form-group">
                <label htmlFor="goals">Your goals (optional)</label>
                <textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  placeholder="e.g., Streamline our property analysis, manage more events efficiently, build better client relationships..."
                  rows={4}
                />
              </div>

              <div className="onboarding-actions">
                <button onClick={() => setStep(2)} className="button button--secondary">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="button button--primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Setting up..." : "Get started"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

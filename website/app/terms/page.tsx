"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <Header />

      {/* Hero */}
      <section className="legal-header">
        <div className="container">
          <h1>Terms of Service</h1>
          <p className="legal-subtitle">
            Please read these terms carefully before using the Loud Legacy
            platform and services.
          </p>
          <p className="legal-updated">Last updated: February 3, 2026</p>
        </div>
      </section>

      {/* Content */}
      <div className="legal-content">
        <div className="container">

          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Loud Legacy platform, website, and
              associated products (collectively, the "Services"), you agree to be
              bound by these Terms of Service ("Terms"). If you are using the
              Services on behalf of an organization, you represent and warrant
              that you have the authority to bind that organization to these
              Terms.
            </p>
            <p>
              If you do not agree to these Terms, you may not access or use our
              Services. We reserve the right to modify these Terms at any time.
              Continued use of the Services after changes are posted constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Description of Services</h2>
            <p>
              Loud Legacy provides a suite of business software products designed
              for operators, founders, and growing teams. Our platform includes:
            </p>
            <ul>
              <li>
                <strong>Legacy RE:</strong> Real estate intelligence and property
                valuation tools
              </li>
              <li>
                <strong>Sportify:</strong> Event and sports facility management
                platform
              </li>
              <li>
                <strong>Loud Works:</strong> Workforce management and HR
                operations tools
              </li>
              <li>
                <strong>Business Now:</strong> Business operations, invoicing,
                and financial management
              </li>
              <li>
                <strong>Legacy CRM:</strong> Customer relationship management
                system
              </li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of
              our Services at any time, with or without notice. We will make
              reasonable efforts to notify users of significant changes.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Account Registration</h2>
            <p>
              To access certain features of our Services, you must create an
              account. When you register, you agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>
                Keep your password secure and confidential and not share it with
                third parties
              </li>
              <li>
                Accept responsibility for all activity that occurs under your
                account
              </li>
              <li>
                Notify us immediately of any unauthorized use of your account
              </li>
            </ul>
            <p>
              You must be at least 16 years old to create an account. We reserve
              the right to suspend or terminate accounts that violate these Terms
              or that we reasonably believe are being used fraudulently.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Subscription Plans and Payment</h2>
            <p>
              Loud Legacy offers both free and paid subscription plans. By
              selecting a paid plan, you agree to the following:
            </p>

            <h3>Billing</h3>
            <ul>
              <li>
                Paid plans are billed in advance on a monthly or annual basis,
                depending on your selection
              </li>
              <li>
                All fees are quoted in U.S. dollars unless otherwise stated
              </li>
              <li>
                You authorize us to charge your designated payment method for all
                applicable fees
              </li>
            </ul>

            <h3>Renewals</h3>
            <p>
              Your subscription will automatically renew at the end of each
              billing period unless you cancel before the renewal date. You may
              cancel your subscription at any time through your account settings
              or by contacting our support team.
            </p>

            <h3>Price Changes</h3>
            <p>
              We reserve the right to adjust pricing for our Services. Any price
              changes will take effect at the start of your next billing cycle.
              We will provide at least 30 days' notice of any price increases.
            </p>

            <h3>Refunds</h3>
            <p>
              Fees are generally non-refundable except where required by law. If
              you believe you have been charged in error, please contact our
              support team within 14 days of the charge. For more details, see
              our{" "}
              <Link href="/payments">Payment Information</Link> page.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Acceptable Use</h2>
            <p>
              You agree to use our Services only for lawful purposes and in
              accordance with these Terms. You shall not:
            </p>
            <ul>
              <li>
                Use the Services in any way that violates applicable local, state,
                national, or international law
              </li>
              <li>
                Attempt to gain unauthorized access to any part of the Services,
                other accounts, or computer systems
              </li>
              <li>
                Transmit any viruses, malware, or other harmful code through the
                platform
              </li>
              <li>
                Use the Services to send unsolicited communications (spam) or
                engage in phishing
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Services
              </li>
              <li>
                Scrape, crawl, or use automated means to access the Services
                without our written permission
              </li>
              <li>
                Reverse engineer, decompile, or disassemble any aspect of the
                Services
              </li>
              <li>
                Reproduce, duplicate, copy, sell, or resell any part of the
                Services without express written permission
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Intellectual Property</h2>
            <p>
              The Services and all content, features, and functionality
              (including but not limited to software, text, graphics, logos,
              icons, images, and design) are owned by Loud Legacy and are
              protected by copyright, trademark, patent, and other intellectual
              property laws.
            </p>

            <h3>Our License to You</h3>
            <p>
              Subject to these Terms, we grant you a limited, non-exclusive,
              non-transferable, revocable license to access and use the Services
              for your internal business purposes during the term of your
              subscription.
            </p>

            <h3>Your Content</h3>
            <p>
              You retain ownership of all data, content, and materials you upload
              or create through our Services ("Your Content"). By using the
              Services, you grant us a limited license to host, store, and
              process Your Content solely for the purpose of providing the
              Services to you.
            </p>
            <p>
              You represent and warrant that you have all necessary rights to
              Your Content and that it does not infringe on any third party's
              intellectual property rights.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Loud Legacy and
              its officers, directors, employees, and agents shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages, including but not limited to:
            </p>
            <ul>
              <li>Loss of profits, data, business opportunities, or goodwill</li>
              <li>Service interruption or system failure</li>
              <li>
                Cost of procurement of substitute goods or services
              </li>
              <li>
                Any damages resulting from unauthorized access to or alteration
                of your data
              </li>
            </ul>
            <p>
              In no event shall our total liability to you exceed the amount you
              paid to us in the twelve (12) months preceding the event giving
              rise to the claim. Some jurisdictions do not allow the exclusion or
              limitation of certain damages, so some of the above limitations
              may not apply to you.
            </p>
          </section>

          <section className="legal-section" id="ai-disclaimer">
            <h2>8. Artificial Intelligence Disclaimer</h2>
            <p>
              Our Legacy RE platform incorporates artificial intelligence ("AI")
              and machine learning technologies to assist with property
              valuations, comparable sales analysis, market trend analysis, and
              property condition assessments. By using these features, you
              acknowledge and agree to the following:
            </p>

            <h3>AI Is Not a Perfect Science</h3>
            <p>
              <strong>Artificial intelligence-powered property analysis is not a
              perfect science. Rather, it is a tool designed to help guide those
              in the real estate industry.</strong> AI-generated valuations,
              estimates, comparable sales analyses, market trend projections, and
              property condition assessments are approximations based on
              available data and algorithms. They are not substitutes for
              professional appraisals, licensed property inspections, or
              independent due diligence.
            </p>

            <h3>No Guarantee of Accuracy</h3>
            <p>
              While we strive to provide useful and reasonably accurate
              estimates, we make no representations or warranties regarding the
              accuracy, completeness, reliability, or timeliness of any AI-generated
              output. Actual property values, market conditions, and property
              conditions may differ materially from the estimates provided by
              our platform. Factors including but not limited to local market
              fluctuations, property-specific conditions not visible in available
              data, zoning changes, environmental factors, and economic shifts
              may cause actual outcomes to vary significantly from AI predictions.
            </p>

            <h3>Professional Advice Recommended</h3>
            <p>
              You should not rely solely on AI-generated valuations or analyses
              when making real estate investment, purchasing, selling, or
              financing decisions. We strongly recommend consulting with
              licensed real estate professionals, certified appraisers,
              property inspectors, and financial advisors before making any
              real estate decisions. Loud Legacy is not a licensed appraisal
              firm and does not provide certified property appraisals.
            </p>

            <h3>Third-Party Data Limitations</h3>
            <p>
              AI analyses may incorporate data from third-party providers
              (including public property records and comparable sales
              databases). We do not control the accuracy or completeness of
              third-party data. Errors, delays, or gaps in source data may
              affect the quality of AI-generated results.
            </p>

            <h3>User Responsibility</h3>
            <p>
              By using our AI-powered features, you accept full responsibility
              for any decisions made based on AI-generated information. Loud
              Legacy shall not be held liable for any losses, damages, or
              claims arising from reliance on AI-generated valuations,
              analyses, or recommendations.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Usage-Based Billing and Property Record Lookups</h2>
            <p>
              Certain features of our platform, including real comparable sales
              data and public property record lookups, are subject to
              usage-based billing. Each lookup counts against your plan's
              monthly quota. If you exceed your plan's included lookups,
              additional lookups may incur an overage charge as displayed in
              your account settings before each pull. By initiating a lookup,
              you authorize the applicable charge.
            </p>
            <p>
              Cached data served from our database (previously retrieved records
              and evaluations) does not count toward your lookup quota and
              incurs no additional charge.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Disclaimer of Warranties</h2>
            <p>
              The Services are provided on an "as is" and "as available" basis
              without warranties of any kind, whether express or implied,
              including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, and
              non-infringement.
            </p>
            <p>
              We do not warrant that the Services will be uninterrupted, secure,
              or error-free, that defects will be corrected, or that the
              Services are free of viruses or other harmful components.
            </p>
            <p>
              Without limiting the foregoing, we specifically disclaim any
              warranty that AI-generated property valuations, comparable sales
              analyses, market trend assessments, or condition evaluations will
              be accurate, complete, or suitable for any particular purpose
              including but not limited to property purchases, sales,
              financing, insurance, or investment decisions.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Loud Legacy and
              its officers, directors, employees, contractors, agents, and
              affiliates from and against any claims, liabilities, damages,
              losses, and expenses (including reasonable attorneys' fees) arising
              out of or related to:
            </p>
            <ul>
              <li>Your use of the Services</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of a third party</li>
              <li>Your Content uploaded to or processed through the Services</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>12. Termination</h2>
            <p>
              We may suspend or terminate your access to the Services at any
              time, with or without cause, and with or without notice. Reasons
              for termination may include, but are not limited to:
            </p>
            <ul>
              <li>Breach of these Terms</li>
              <li>Non-payment of subscription fees</li>
              <li>Fraudulent or illegal activity</li>
              <li>Extended inactivity (accounts inactive for more than 12 months)</li>
              <li>Request by law enforcement or government agencies</li>
            </ul>
            <p>
              Upon termination, your right to use the Services will immediately
              cease. You may export your data within 30 days of account closure.
              After this period, we may permanently delete your data.
            </p>
            <p>
              Sections of these Terms that by their nature should survive
              termination (including intellectual property, limitation of
              liability, indemnification, and governing law) will remain in
              effect.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the State of Delaware, without regard to its conflict
              of law principles.
            </p>
            <p>
              Any disputes arising out of or relating to these Terms or the
              Services shall first be attempted to be resolved through good-faith
              negotiation. If the dispute cannot be resolved within 30 days, it
              shall be submitted to binding arbitration administered by the
              American Arbitration Association in accordance with its Commercial
              Arbitration Rules.
            </p>
            <p>
              You agree that any dispute resolution proceedings will be conducted
              on an individual basis and not in a class, consolidated, or
              representative action. You waive any right to participate in a
              class action lawsuit or class-wide arbitration.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision will be limited or eliminated to the
              minimum extent necessary so that these Terms will otherwise remain
              in full force and effect.
            </p>
          </section>

          <section className="legal-section">
            <h2>15. Contact Information</h2>
            <p>
              If you have questions about these Terms of Service, please contact
              us:
            </p>
            <ul className="legal-contact-list">
              <li><strong>Email:</strong> legal@loud-legacy.com</li>
              <li><strong>General Inquiries:</strong> hello@loud-legacy.com</li>
              <li>
                <strong>Contact Form:</strong>{" "}
                <Link href="/contact">loud-legacy.com/contact</Link>
              </li>
            </ul>
          </section>

        </div>
      </div>

      {/* CTA */}
      <section className="legal-cta">
        <div className="container">
          <h2>Questions about our terms?</h2>
          <p>Our team is happy to clarify anything. Reach out anytime.</p>
          <div className="cta-actions">
            <Link href="/contact" className="button button--primary">
              Contact Us
            </Link>
            <Link href="/privacy" className="button button--secondary">
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

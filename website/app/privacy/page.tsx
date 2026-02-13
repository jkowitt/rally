"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <Header />

      {/* Hero */}
      <section className="legal-header">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p className="legal-subtitle">
            Your privacy matters. This policy explains how Loud Legacy collects,
            uses, and protects your personal information.
          </p>
          <p className="legal-updated">Last updated: February 3, 2026</p>
        </div>
      </section>

      {/* Content */}
      <div className="legal-content">
        <div className="container">

          <section className="legal-section">
            <h2>1. Introduction</h2>
            <p>
              Loud Legacy ("we," "our," or "us") operates the loud-legacy.com
              website and associated platform products including Legacy RE, Sportify,
              Loud Works, Business Now, and Legacy CRM. This Privacy Policy
              describes how we collect, use, disclose, and safeguard your
              information when you visit our website or use our services.
            </p>
            <p>
              By accessing or using our services, you agree to the collection and
              use of information in accordance with this policy. If you do not
              agree with the terms of this policy, please do not access our
              services.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>

            <h3>Personal Information You Provide</h3>
            <p>We may collect personal information that you voluntarily provide when you:</p>
            <ul>
              <li>Register for an account on our platform</li>
              <li>Subscribe to a paid plan</li>
              <li>Fill out a contact form or request a demo</li>
              <li>Sign up for our newsletter or blog updates</li>
              <li>Participate in surveys, promotions, or events</li>
              <li>Communicate with us via email or support channels</li>
            </ul>
            <p>This information may include your name, email address, phone number, company name, job title, billing address, and payment information.</p>

            <h3>Information Collected Automatically</h3>
            <p>When you access our services, we may automatically collect certain information, including:</p>
            <ul>
              <li>Device information (browser type, operating system, device type)</li>
              <li>IP address and approximate geographic location</li>
              <li>Pages visited, time spent on pages, and navigation paths</li>
              <li>Referring website or source that led you to our platform</li>
              <li>Usage patterns and feature interactions within our products</li>
            </ul>

            <h3>Information from Third Parties</h3>
            <p>
              We may receive information about you from third-party sources such as
              business partners, marketing partners, social media platforms, and
              data enrichment providers. This helps us maintain accurate records
              and improve our services.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li>Providing, maintaining, and improving our platform and products</li>
              <li>Processing transactions and managing your subscription</li>
              <li>Sending administrative communications (account updates, security alerts, billing notices)</li>
              <li>Responding to your inquiries and providing customer support</li>
              <li>Personalizing your experience and delivering relevant content</li>
              <li>Analyzing usage trends to improve functionality and user experience</li>
              <li>Sending marketing communications (with your consent, where required)</li>
              <li>Detecting, preventing, and addressing fraud, abuse, or security issues</li>
              <li>Complying with legal obligations and enforcing our terms</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies, web beacons, and similar tracking technologies to
              collect and store information about your interactions with our
              services.
            </p>

            <h3>Types of Cookies We Use</h3>
            <ul>
              <li>
                <strong>Essential Cookies:</strong> Required for the operation of our
                platform. These include cookies that enable you to log in, navigate the
                site, and use core features.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how visitors
                interact with our website by collecting information about pages
                visited, time on site, and navigation patterns.
              </li>
              <li>
                <strong>Functional Cookies:</strong> Allow us to remember your
                preferences (such as language or region) and provide enhanced
                personalized features.
              </li>
              <li>
                <strong>Marketing Cookies:</strong> Used to track visitors across
                websites to display relevant advertisements and measure campaign
                effectiveness.
              </li>
            </ul>
            <p>
              You can manage your cookie preferences through your browser settings.
              Please note that disabling certain cookies may affect the functionality
              of our services.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Third-Party Services</h2>
            <p>
              We may share your information with trusted third-party service
              providers who assist us in operating our platform, conducting our
              business, or serving our users. These providers include:
            </p>
            <ul>
              <li>
                <strong>Payment Processors:</strong> We use Stripe to process
                payments securely. Your payment information is handled directly by
                Stripe and is subject to their{" "}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Analytics Providers:</strong> We use analytics services to
                understand platform usage and improve our products.
              </li>
              <li>
                <strong>Email Service Providers:</strong> We use third-party email
                services to send transactional and marketing communications.
              </li>
              <li>
                <strong>Cloud Infrastructure:</strong> Our services are hosted on
                secure cloud infrastructure with industry-standard protections.
              </li>
              <li>
                <strong>Customer Support Tools:</strong> We use support platforms to
                manage and respond to your inquiries efficiently.
              </li>
            </ul>
            <p>
              We do not sell your personal information to third parties. We may
              share aggregated, non-identifiable data for research and analysis
              purposes.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information against unauthorized access,
              alteration, disclosure, or destruction. These measures include:
            </p>
            <ul>
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Regular security assessments and vulnerability testing</li>
              <li>Access controls and authentication requirements for staff</li>
              <li>Secure data backup and disaster recovery procedures</li>
              <li>Employee training on data protection and privacy practices</li>
            </ul>
            <p>
              While we strive to use commercially acceptable means to protect your
              personal information, no method of transmission over the internet or
              electronic storage is 100% secure. We cannot guarantee absolute
              security.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Your Rights and Choices</h2>
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul>
              <li>
                <strong>Access:</strong> Request a copy of the personal information
                we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> Request that we correct inaccurate or
                incomplete information.
              </li>
              <li>
                <strong>Deletion:</strong> Request that we delete your personal
                information, subject to certain exceptions.
              </li>
              <li>
                <strong>Portability:</strong> Request a copy of your data in a
                structured, machine-readable format.
              </li>
              <li>
                <strong>Opt-Out:</strong> Unsubscribe from marketing communications
                at any time using the link in our emails.
              </li>
              <li>
                <strong>Restriction:</strong> Request that we limit the processing
                of your personal information in certain circumstances.
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us using the
              information provided in the Contact section below. We will respond to
              your request within 30 days.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is
              active or as needed to provide our services. We may also retain and
              use your information as necessary to comply with legal obligations,
              resolve disputes, and enforce our agreements.
            </p>
            <p>
              When your account is closed, we will retain your data for up to 30
              days to allow for account recovery. After this period, your data will
              be securely deleted or anonymized, unless longer retention is required
              by law.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under the age of 16. We
              do not knowingly collect personal information from children. If we
              become aware that we have collected personal information from a child
              under 16, we will take steps to delete that information promptly. If
              you believe a child has provided us with personal information, please
              contact us.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Artificial Intelligence and Automated Analysis</h2>

            <h3>AI-Powered Property Valuations</h3>
            <p>
              Our Legacy RE platform uses artificial intelligence and machine
              learning technologies, including third-party AI services (such as
              OpenAI), to provide property valuation estimates, comparable sales
              analysis, market trend analysis, and property condition assessments.
            </p>

            <h3>Data Used in AI Analysis</h3>
            <p>When you use our AI-powered features, we may process the following data:</p>
            <ul>
              <li>Property address, type, size, age, and physical characteristics</li>
              <li>Publicly available property records and recent sales data in the surrounding area</li>
              <li>Market trend data for the relevant geographic region</li>
              <li>Uploaded property photographs for condition assessment</li>
              <li>Financial inputs you provide (rent rolls, operating expenses, income data)</li>
            </ul>

            <h3>Third-Party Data Services</h3>
            <p>
              We use third-party data providers, including RentCast, to obtain
              verified comparable sales and public property records. When you
              opt in to pull public records or real comparable sales, your
              property search data (address, city, state) is transmitted to these
              providers. Each provider is subject to their own privacy policy.
            </p>

            <h3>Data Caching and Reuse</h3>
            <p>
              Property data retrieved from third-party sources is cached on our
              servers to improve service quality and reduce redundant data
              lookups. This cached data may be used to serve future requests
              from you or other users searching in the same area. Cached data
              expires periodically (30-90 days) and is automatically refreshed
              when a new lookup is performed.
            </p>

            <h3>AI Accuracy Disclaimer</h3>
            <p>
              <strong>AI-generated valuations and analyses are estimates only and
              should not be relied upon as definitive property appraisals.</strong>{" "}
              Artificial intelligence is not a perfect science. Our AI tools are
              designed to assist and guide real estate professionals, not to
              replace professional judgment, licensed appraisals, or due
              diligence. Actual property values may differ significantly from
              AI-generated estimates due to factors not captured by available
              data. See our{" "}
              <Link href="/terms">Terms of Service</Link> for full disclaimers.
            </p>

            <h3>Evaluation Activity Logging</h3>
            <p>
              We maintain an activity log of all property evaluations performed
              on the platform, including which features were used (public records,
              comparable sales, market trends, image analysis) and the resulting
              estimates. This data is used for platform improvement, billing
              accuracy, and audit purposes. It is not shared with third parties
              for marketing purposes.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes
              in our practices, technology, legal requirements, or other factors. We
              will notify you of any material changes by posting the updated policy
              on this page and updating the "Last updated" date.
            </p>
            <p>
              We encourage you to review this policy periodically. Your continued
              use of our services after changes are posted constitutes your
              acceptance of the updated policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our
              data practices, please contact us:
            </p>
            <ul className="legal-contact-list">
              <li><strong>Email:</strong> privacy@loud-legacy.com</li>
              <li><strong>General Inquiries:</strong> hello@loud-legacy.com</li>
              <li>
                <strong>Contact Form:</strong>{" "}
                <Link href="/contact">loud-legacy.com/contact</Link>
              </li>
            </ul>
            <p>
              We will make every effort to respond to your inquiry within 30
              business days.
            </p>
          </section>

        </div>
      </div>

      {/* CTA */}
      <section className="legal-cta">
        <div className="container">
          <h2>Have questions about your data?</h2>
          <p>Our team is here to help with any privacy-related concerns.</p>
          <div className="cta-actions">
            <Link href="/contact" className="button button--primary">
              Contact Us
            </Link>
            <Link href="/terms" className="button button--secondary">
              Terms of Service
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

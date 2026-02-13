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
            Your privacy matters. This policy explains how Rally and Loud Legacy
            collect, use, and protect your personal information across our fan
            engagement platform, mobile app, and website.
          </p>
          <p className="legal-updated">Last updated: February 13, 2026</p>
        </div>
      </section>

      {/* Content */}
      <div className="legal-content">
        <div className="container">

          <section className="legal-section">
            <h2>1. Introduction</h2>
            <p>
              Loud Legacy, LLC (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates
              the Rally fan engagement platform, including the Rally mobile application
              (available on iOS and Android), the Rally website, and the Rally
              administration panel (collectively, the &ldquo;Services&rdquo;). This Privacy
              Policy describes how we collect, use, disclose, and safeguard your
              information when you use any of our Services.
            </p>
            <p>
              Rally is a fan engagement and loyalty platform that connects fans with
              collegiate and professional sports teams across the NCAA, NBA, NFL, MLB,
              NHL, MLS, and UWSL. Our platform enables location-based event check-ins,
              interactive gameday experiences, loyalty points and rewards, and
              personalized content delivery.
            </p>
            <p>
              By accessing or using our Services, you agree to the collection and use
              of information in accordance with this policy. If you do not agree with
              the terms of this policy, please do not access our Services.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>

            <h3>Account Information</h3>
            <p>When you create a Rally account, we collect:</p>
            <ul>
              <li>Full name and display handle</li>
              <li>Email address</li>
              <li>Password (stored in hashed form only; we never store plaintext passwords)</li>
              <li>Favorite teams and sports preferences</li>
              <li>School or team affiliation</li>
            </ul>

            <h3>Location Data</h3>
            <p>
              With your permission, Rally collects your precise geographic location to
              enable core features of our platform:
            </p>
            <ul>
              <li>
                <strong>Event Check-In:</strong> We verify your proximity to a venue
                (within approximately 0.25 miles) to confirm attendance at live events
                and award check-in points.
              </li>
              <li>
                <strong>Pre-Check-In Monitoring:</strong> If you pre-check in for an
                upcoming event, we may monitor your location in the background to
                automatically complete your check-in when you arrive at the venue. You
                can cancel a pre-check-in at any time.
              </li>
              <li>
                <strong>Geofencing:</strong> We use geofence technology to detect when
                you enter or exit the vicinity of an event venue.
              </li>
            </ul>
            <p>
              You can disable location services at any time through your device
              settings. Disabling location services will prevent venue-based check-ins
              but will not affect remote tune-in features or other non-location
              functionality.
            </p>

            <h3>Activity and Engagement Data</h3>
            <p>We collect information about how you interact with Rally, including:</p>
            <ul>
              <li>Events attended (check-ins and remote tune-ins)</li>
              <li>Points earned and redeemed</li>
              <li>Loyalty tier status and progression</li>
              <li>Responses to in-app engagements (polls, trivia, predictions)</li>
              <li>Reward redemption history and codes</li>
              <li>Push notification interactions</li>
            </ul>

            <h3>Device and Usage Information</h3>
            <p>We automatically collect certain technical information, including:</p>
            <ul>
              <li>Device type, operating system, and version</li>
              <li>App version</li>
              <li>IP address and approximate geographic region</li>
              <li>Pages and screens visited, session duration, and navigation paths</li>
              <li>Crash reports and performance data</li>
            </ul>

            <h3>Shipping Information</h3>
            <p>
              If you redeem a reward that requires shipping fulfillment, we collect
              your mailing address and phone number solely for delivery purposes.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and improve the Rally platform and mobile app</li>
              <li>Verify your location for event check-ins and award loyalty points</li>
              <li>Deliver personalized gameday engagements, trivia, polls, and predictions</li>
              <li>Process reward redemptions and facilitate fulfillment (in-person, digital, or shipping)</li>
              <li>Track your loyalty points balance, tier status, and earning history</li>
              <li>Send push notifications about events, engagements, and rewards relevant to your followed teams</li>
              <li>Display targeted sponsor content and ads based on your event attendance and team interests</li>
              <li>Provide property administrators with aggregate analytics on fan engagement</li>
              <li>Send administrative communications (account verification, password resets, security alerts)</li>
              <li>Detect, prevent, and address fraud, abuse, or security issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Sponsor Content and Advertising</h2>
            <p>
              Rally delivers sponsor activations and advertisements to fans during
              live events. This is a core part of the fan engagement experience.
              Here is how it works:
            </p>
            <ul>
              <li>
                <strong>At-Venue Ads:</strong> If you are checked in at a venue, you
                may receive sponsor content targeted to in-person attendees.
              </li>
              <li>
                <strong>Remote Viewer Ads:</strong> If you are tuned in remotely (e.g.,
                watching on TV), you may receive sponsor content targeted to remote
                viewers.
              </li>
              <li>
                <strong>Impression Tracking:</strong> We log when sponsor content is
                displayed to you and whether you interact with it. This data is shared
                with sponsors in aggregate form only (e.g., &ldquo;500 fans saw this
                ad, 120 interacted&rdquo;). Your individual identity is not shared with
                sponsors.
              </li>
              <li>
                <strong>Points for Interaction:</strong> You may earn loyalty points
                for interacting with sponsor content. This is always optional.
              </li>
            </ul>
            <p>
              We do not sell your personal information to advertisers or sponsors.
              Sponsors receive only aggregate, de-identified engagement metrics.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Cookies and Tracking Technologies</h2>
            <p>
              On our website, we use cookies and similar technologies to:
            </p>
            <ul>
              <li>
                <strong>Essential Cookies:</strong> Enable login, navigation, and core
                website functionality.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how visitors
                interact with our website to improve the user experience.
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings and
                preferences across sessions.
              </li>
            </ul>
            <p>
              In the Rally mobile app, we use local device storage to maintain your
              authentication session, cache team data, and store your notification
              preferences. We do not use third-party advertising cookies in the
              mobile app.
            </p>
            <p>
              You can manage cookie preferences through your browser settings.
              Disabling essential cookies may affect website functionality.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Third-Party Services</h2>
            <p>
              We use trusted third-party services to operate Rally. These providers
              process your data only as necessary to perform their services:
            </p>
            <ul>
              <li>
                <strong>Cloud Hosting:</strong> Our servers are hosted on secure cloud
                infrastructure (Railway) with industry-standard protections.
              </li>
              <li>
                <strong>Push Notifications:</strong> We use Expo and platform-native
                push notification services (Apple Push Notification Service, Firebase
                Cloud Messaging) to deliver notifications to your device.
              </li>
              <li>
                <strong>Location Services:</strong> We use device-native location APIs
                (CoreLocation on iOS, Location Services on Android) to determine your
                position. Location data is sent to our servers only during check-in
                operations.
              </li>
              <li>
                <strong>Analytics:</strong> We use analytics tools to understand
                platform usage patterns and improve our products.
              </li>
              <li>
                <strong>Email Services:</strong> We use third-party providers for
                transactional emails (verification codes, password resets).
              </li>
            </ul>
            <p>
              We do not sell your personal information to any third party. We may
              share aggregated, non-identifiable data for research and analysis
              purposes.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Data Shared with Property Administrators</h2>
            <p>
              Teams and schools (&ldquo;property administrators&rdquo;) that you follow or
              attend events for have access to certain aggregate data through their
              Rally admin panel:
            </p>
            <ul>
              <li>Total number of fans checked in at events (venue vs. remote)</li>
              <li>Aggregate engagement metrics (poll responses, trivia participation rates)</li>
              <li>Reward redemption statistics</li>
              <li>Sponsor impression and interaction counts</li>
            </ul>
            <p>
              Property administrators do not have access to your individual personal
              information (email, location coordinates, etc.) unless you directly
              interact with them through a redemption that requires identity
              verification (e.g., showing a redemption code at a venue counter).
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information:
            </p>
            <ul>
              <li>Passwords are hashed using bcrypt and never stored in plaintext</li>
              <li>Authentication tokens (JWT) expire after 7 days and use server-side secrets</li>
              <li>All data in transit is encrypted via TLS/SSL</li>
              <li>Rate limiting protects against brute-force attacks on login and verification endpoints</li>
              <li>Role-based access controls restrict admin functionality to authorized users</li>
              <li>Redemption codes use an unambiguous character set to prevent fraud</li>
            </ul>
            <p>
              While we strive to use commercially acceptable means to protect your
              information, no method of transmission over the internet or electronic
              storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Your Rights and Choices</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul>
              <li>
                <strong>Access:</strong> View your profile, points history, redemption
                history, and team interests at any time through the app.
              </li>
              <li>
                <strong>Correction:</strong> Update your name, handle, email, team
                preferences, and notification settings through your account.
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your account and
                associated data by contacting us. We will process your request within
                30 days.
              </li>
              <li>
                <strong>Location Opt-Out:</strong> Disable location services at any
                time through your device settings. You can still use remote tune-in
                and non-location features.
              </li>
              <li>
                <strong>Push Notification Opt-Out:</strong> Disable push notifications
                through your device settings or your Rally account preferences.
              </li>
              <li>
                <strong>Marketing Opt-Out:</strong> Toggle email updates off in your
                account settings at any time.
              </li>
              <li>
                <strong>Data Portability:</strong> Request a copy of your data in a
                structured format by contacting us.
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us at the address listed below.
              We will respond within 30 days.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is
              active. Specific retention periods include:
            </p>
            <ul>
              <li>
                <strong>Account Data:</strong> Retained until you request deletion.
                After deletion, data is removed within 30 days.
              </li>
              <li>
                <strong>Points and Redemption History:</strong> Retained for the
                lifetime of your account to maintain accurate loyalty records.
              </li>
              <li>
                <strong>Check-In Location Data:</strong> We store the fact that you
                checked in and your distance from the venue. Precise GPS coordinates
                are not retained after the check-in is processed.
              </li>
              <li>
                <strong>Engagement Interactions:</strong> Retained for analytics
                purposes. Individual interactions are associated with your user ID.
              </li>
              <li>
                <strong>Analytics Events:</strong> Capped at the most recent 1,000
                events per property and periodically pruned.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>11. Children&apos;s Privacy</h2>
            <p>
              Rally is intended for users aged 13 and older. We do not knowingly
              collect personal information from children under 13. If we become aware
              that a child under 13 has created an account, we will take steps to
              delete that account and associated data promptly.
            </p>
            <p>
              Users between the ages of 13 and 17 should have parental or guardian
              consent before creating a Rally account. If you are a parent or guardian
              and believe your child has provided us with personal information without
              your consent, please contact us.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. State-Specific Rights</h2>

            <h3>California Residents (CCPA)</h3>
            <p>
              If you are a California resident, you have the right to: (a) know what
              personal information we collect about you and how it is used; (b) request
              deletion of your personal information; (c) opt out of the sale of your
              personal information (we do not sell your data); and (d) not be
              discriminated against for exercising your rights. To make a request,
              contact us at privacy@loud-legacy.com.
            </p>

            <h3>European Residents (GDPR)</h3>
            <p>
              If you are located in the European Economic Area, you have additional
              rights including the right to access, rectify, port, and erase your
              personal data, as well as the right to restrict or object to processing.
              Our legal basis for processing your data includes: performance of our
              contract with you (providing the Services), your consent (location data,
              push notifications), and our legitimate interests (security, analytics,
              improving our platform).
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you
              of material changes by posting the updated policy on this page, updating
              the &ldquo;Last updated&rdquo; date, and where appropriate, sending a
              push notification or email.
            </p>
            <p>
              Your continued use of Rally after changes are posted constitutes your
              acceptance of the updated policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, your data,
              or our privacy practices, please contact us:
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

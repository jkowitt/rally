-- ============================================================
-- MIGRATION 066 — TERMS OF SERVICE v2 (DIGEST OPT-IN LANGUAGE)
-- ============================================================
-- Inserts a new version of the Terms of Service that:
--
--   1. Covers the auto-opt-in to The Digest for new users
--   2. Explains how to unsubscribe (email footer + account settings)
--   3. Clarifies that transactional emails (security, billing) cannot
--      be turned off, only marketing
--   4. Makes explicit that users will be required to acknowledge
--      these Terms by checkbox before continuing into the app
--
-- Because the document content has changed, every existing user
-- will be shown the LegalGate again on their next login and must
-- re-accept. That's intentional and legally required — we can't
-- unilaterally opt users into a new policy without their consent.
--
-- To roll back: delete the v2 row or just flip its is_active flag.
-- Users will fall back to v1 on the next load.
-- ============================================================

-- Build the new Terms content as plain text. Rendered inside the
-- LegalGate component with white-space: pre-wrap so the formatting
-- is preserved.

-- Ensure the column exists for older schemas that pre-date it.
-- Migration 001 only has type, version, content, effective_date.
alter table legal_documents add column if not exists is_active boolean default true;

insert into legal_documents (type, version, content, effective_date, is_active)
values (
  'terms_of_service',
  '2.0',
  $$LOUD LEGACY VENTURES — TERMS OF SERVICE
Version 2.0 — Effective 2026-04-15

By creating an account on Loud Legacy (the "Platform"), you agree to these Terms of Service ("Terms"). Please read them in full.

1. SERVICE DESCRIPTION

Loud Legacy Ventures ("we", "us", or "Loud Legacy") operates the Platform, a software-as-a-service CRM and operating suite for sponsorship sales teams, event organizers, nonprofits, real estate operators, media companies, and other partnership-driven businesses. The Platform includes but is not limited to: CRM pipeline management, contract parsing, AI-assisted prospect research, email marketing, newsletter publishing, and integrations with third-party services.

2. ACCOUNT REGISTRATION

To use the Platform you must provide accurate account information. You are responsible for keeping your login credentials confidential and for all activity under your account. You must be at least 18 years of age to register.

3. PAYMENT & PLANS

Free and paid plans are available. Paid plans auto-renew at the end of each billing cycle unless cancelled. Overage charges for AI credits, contract parses, or other metered usage will be billed to your payment method on file. You can cancel, downgrade, or request a refund under the conditions published on our pricing page.

4. ACCEPTABLE USE

You agree not to:
  - Use the Platform to send spam, unsolicited marketing, or anything that violates CAN-SPAM, CASL, GDPR, or other anti-spam / privacy laws in your jurisdiction
  - Upload content that infringes third-party rights (copyright, trademark, publicity)
  - Attempt to bypass rate limits, authentication, or billing controls
  - Resell, sublicense, or white-label the Platform without a written agreement with us
  - Scrape, crawl, or extract data from the Platform beyond what the UI or official API permits

5. AI FEATURES

Certain Platform features use large language models (including Claude by Anthropic) to generate text, analyze contracts, and produce research. Outputs from these features may be inaccurate, incomplete, or biased. You are responsible for reviewing AI-generated content before using it in customer-facing communications, legal documents, or financial decisions. We do not guarantee the correctness of any AI output.

6. EMAIL COMMUNICATIONS

6.1 TRANSACTIONAL EMAILS (CANNOT BE OPTED OUT)

We will send you transactional emails related to your account, including:
  - Account creation, login, and password reset
  - Billing notices, invoices, and payment failures
  - Security alerts and policy updates
  - Service announcements affecting your account access

These emails cannot be turned off as long as you maintain an active account. Unsubscribing from marketing emails does not stop transactional emails.

6.2 THE DIGEST — MARKETING NEWSLETTER (AUTO-SUBSCRIBED, EASY OPT-OUT)

When you create an account, you are automatically subscribed to The Digest by Loud Legacy Ventures, our monthly editorial newsletter. The Digest covers sponsorship trends, industry analysis, product updates, and other content relevant to partnership-driven businesses. Issues are typically published once per month.

By accepting these Terms, you consent to:
  - Receiving The Digest by email at the address tied to your account
  - Receiving occasional platform announcements about new features, pricing changes, and customer stories

You may opt out of all marketing emails at any time by:
  (a) Clicking the "Unsubscribe" link at the bottom of any email you receive from us. This is a one-click unsubscribe — you will be removed from the Digest list immediately and will stop receiving further marketing.
  (b) Visiting your account at /app/settings and toggling the "Email Preferences" section to Unsubscribed.
  (c) Emailing founder@loud-legacy.com with the subject line "Unsubscribe" and your account email address.

Opting out of marketing emails does not affect your access to the Platform or any transactional emails described in section 6.1.

6.3 EMAILS YOU SEND FROM THE PLATFORM

The Platform includes features that let you send email campaigns to your own subscribers (for example, your CRM contacts, your prospect lists, or your newsletter audience). You are solely responsible for:
  - Obtaining valid consent from everyone you email
  - Honoring unsubscribe requests within ten (10) business days
  - Complying with all applicable anti-spam laws in the jurisdictions where your recipients are located
  - Not using the Platform to send deceptive, fraudulent, or harassing content

If we receive a credible complaint about emails you sent through the Platform, or if your campaigns generate an unacceptable bounce or complaint rate, we may suspend your email sending privileges without refund.

7. DATA & PRIVACY

Your use of the Platform is also governed by our Privacy Policy, which is a separate document you must also accept. We do not sell your personal data or your contacts' personal data to third parties. We may use aggregated and anonymized usage data to improve the Platform.

8. INTELLECTUAL PROPERTY

You retain ownership of all content you upload to the Platform (your contacts, contracts, campaigns, articles, etc.). You grant us a limited license to host, store, transmit, and display your content solely for the purpose of providing the Platform to you. We retain all rights to the Platform software, design, and brand.

9. TERMINATION

You may cancel your account at any time via /app/settings. Upon cancellation, your access continues until the end of the current billing period. After that, your data is retained for 30 days and then permanently deleted. You can request earlier deletion by emailing founder@loud-legacy.com.

We may suspend or terminate accounts that violate these Terms, abuse the Platform, or pose a security risk. If we terminate your account for cause, you are not entitled to a refund of any pre-paid fees.

10. DISCLAIMERS

The Platform is provided "as is" and "as available." We make no warranties, express or implied, about the Platform's fitness for a particular purpose, uptime, accuracy of AI outputs, or compatibility with your workflows. You use the Platform at your own risk.

11. LIMITATION OF LIABILITY

To the maximum extent permitted by law, Loud Legacy Ventures will not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability to you for any claim will not exceed the amount you paid us in the twelve (12) months preceding the claim.

12. CHANGES TO THESE TERMS

We may update these Terms from time to time. When we do, we will increment the version number and require you to review and re-accept the new version before continuing to use the Platform. Continued use after a version bump without accepting the new Terms will result in suspended access until you accept.

13. GOVERNING LAW

These Terms are governed by the laws of the State of New York, USA, without regard to conflict-of-laws principles.

14. CONTACT

Questions, complaints, or requests related to these Terms should be sent to:
  Loud Legacy Ventures
  Email: founder@loud-legacy.com

By checking the confirmation box and clicking "Accept & Continue," you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. Your acceptance is recorded in our database with a timestamp and the version number above.
$$,
  now(),
  true
)
on conflict do nothing;

-- Mark previous versions as inactive so the LegalGate always shows
-- the latest version first. (If is_active isn't used in the UI, this
-- is still a useful audit signal.)
update legal_documents
set is_active = false
where type = 'terms_of_service' and version != '2.0';

-- Force every existing user to re-accept the new version on their
-- next login. Flip terms_accepted to false for everyone who currently
-- has it true.
update profiles
set terms_accepted = false,
    terms_accepted_at = null
where terms_accepted = true;

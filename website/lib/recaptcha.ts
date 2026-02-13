/**
 * Google Cloud reCAPTCHA Enterprise verification
 *
 * Setup:
 * 1. Enable reCAPTCHA Enterprise API in Google Cloud Console
 * 2. Create a reCAPTCHA key (website type) at:
 *    https://console.cloud.google.com/security/recaptcha
 * 3. Set these environment variables:
 *    - NEXT_PUBLIC_RECAPTCHA_SITE_KEY  (client-side, loaded by forms)
 *    - RECAPTCHA_PROJECT_ID            (Google Cloud project ID)
 *    - GOOGLE_CLOUD_API_KEY            (API key with reCAPTCHA Enterprise access)
 *
 * If the env vars are not set, verification is skipped gracefully.
 */

interface RecaptchaAssessment {
  tokenProperties: {
    valid: boolean;
    action: string;
    createTime: string;
  };
  riskAnalysis: {
    score: number; // 0.0 (bot) to 1.0 (human)
    reasons: string[];
  };
  event: {
    token: string;
    siteKey: string;
    expectedAction: string;
  };
}

/**
 * Returns true if reCAPTCHA Enterprise is configured.
 */
export function isRecaptchaConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY &&
    process.env.RECAPTCHA_PROJECT_ID &&
    process.env.GOOGLE_CLOUD_API_KEY
  );
}

/**
 * Verify a reCAPTCHA Enterprise token server-side.
 *
 * @param token - The reCAPTCHA token from the client
 * @param expectedAction - The action name (e.g. "signup", "contact")
 * @param minScore - Minimum acceptable score (default 0.5)
 * @returns { success, score, reasons } or { success: true } if reCAPTCHA is not configured
 */
export async function verifyRecaptchaToken(
  token: string,
  expectedAction: string,
  minScore = 0.5
): Promise<{ success: boolean; score?: number; reasons?: string[] }> {
  // If reCAPTCHA is not configured, skip verification (graceful fallback)
  if (!isRecaptchaConfigured()) {
    return { success: true };
  }

  const projectId = process.env.RECAPTCHA_PROJECT_ID!;
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY!;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

  if (!token) {
    return { success: false, score: 0, reasons: ['missing_token'] };
  }

  try {
    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: {
          token,
          siteKey,
          expectedAction,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error('reCAPTCHA Enterprise API error:', res.status, await res.text());
      // On API error, allow the request through (fail open) so forms still work
      return { success: true };
    }

    const assessment: RecaptchaAssessment = await res.json();

    // Check token validity
    if (!assessment.tokenProperties?.valid) {
      return {
        success: false,
        score: 0,
        reasons: ['invalid_token'],
      };
    }

    // Check action matches
    if (assessment.tokenProperties.action !== expectedAction) {
      return {
        success: false,
        score: 0,
        reasons: ['action_mismatch'],
      };
    }

    const score = assessment.riskAnalysis?.score ?? 0;
    const reasons = assessment.riskAnalysis?.reasons ?? [];

    return {
      success: score >= minScore,
      score,
      reasons,
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    // Fail open on network errors so forms remain functional
    return { success: true };
  }
}

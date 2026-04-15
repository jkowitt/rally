import { useState } from 'react'
import { signupForDigest, INDUSTRIES } from '@/services/digestIssueService'

/**
 * Signup form widget used on the landing page and inside the
 * Digest archive/article pages.
 *
 * Props:
 *   - source: 'landing_page' | 'archive_page' | 'article_footer'
 *   - compact: smaller layout for inline use (optional)
 *   - brandLight: if true, uses the Digest brand colors (off-white
 *     bg + coral CTA). If false, uses the dark theme (bg-bg-card
 *     + accent). Defaults to brand-light since this is a Digest
 *     component.
 */
export default function DigestSignupForm({ source = 'landing_page', compact = false, brandLight = true }) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [industry, setIndustry] = useState('general')
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!email) return
    setStatus('submitting')
    setErrorMsg('')
    const r = await signupForDigest({
      email,
      firstName: firstName || undefined,
      industryInterest: industry,
      source,
    })
    if (r.success) {
      setStatus('success')
      setEmail('')
      setFirstName('')
    } else {
      setStatus('error')
      setErrorMsg(r.error || 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <div
        style={brandLight ? {
          background: '#F1EFE8',
          border: '1px solid #d4d0c3',
          borderRadius: '2px',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Georgia, serif',
        } : {}}
        className={brandLight ? '' : 'bg-bg-card border border-success/30 rounded-lg p-5 text-center'}
      >
        <div style={brandLight ? { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#D85A30' } : {}}
             className={brandLight ? '' : 'text-[10px] font-mono uppercase tracking-widest text-success'}>
          ✓ Subscribed
        </div>
        <p style={brandLight ? { fontSize: '14px', color: '#1a1a18', marginTop: '8px' } : {}}
           className={brandLight ? '' : 'text-sm text-text-primary mt-1'}>
          Check your inbox for a welcome email.
        </p>
      </div>
    )
  }

  // Brand-light styling (coral CTA on off-white)
  if (brandLight) {
    return (
      <form onSubmit={submit} style={{ fontFamily: 'Georgia, serif' }}>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name (optional)"
            style={{
              background: 'transparent',
              border: '1px solid #d4d0c3',
              borderRadius: '2px',
              padding: '12px 14px',
              fontSize: '15px',
              fontFamily: 'Georgia, serif',
              color: '#1a1a18',
              outline: 'none',
            }}
          />
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              background: 'transparent',
              border: '1px solid #d4d0c3',
              borderRadius: '2px',
              padding: '12px 14px',
              fontSize: '15px',
              fontFamily: 'Georgia, serif',
              color: '#1a1a18',
              outline: 'none',
            }}
          />
          {!compact && (
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              style={{
                background: 'transparent',
                border: '1px solid #d4d0c3',
                borderRadius: '2px',
                padding: '12px 14px',
                fontSize: '15px',
                fontFamily: 'Georgia, serif',
                color: '#1a1a18',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {INDUSTRIES.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          )}
          <button
            type="submit"
            disabled={status === 'submitting' || !email}
            style={{
              background: '#D85A30',
              color: '#F1EFE8',
              border: 'none',
              padding: '14px 20px',
              fontSize: '15px',
              fontFamily: 'Georgia, serif',
              fontWeight: 600,
              borderRadius: '2px',
              cursor: status === 'submitting' || !email ? 'not-allowed' : 'pointer',
              opacity: status === 'submitting' || !email ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {status === 'submitting' ? 'Subscribing…' : 'Subscribe to The Digest'}
          </button>
          {status === 'error' && (
            <div style={{ fontSize: '12px', color: '#D85A30', textAlign: 'center' }}>{errorMsg}</div>
          )}
          <div style={{ fontSize: '11px', color: '#7a7a75', textAlign: 'center', marginTop: '4px' }}>
            One email a month. Unsubscribe anytime.
          </div>
        </div>
      </form>
    )
  }

  // Dark theme variant (for the main landing page)
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === 'submitting' || !email}
          className="bg-accent text-bg-primary font-semibold px-5 py-2.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
        >
          {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <div className="text-[11px] text-danger">{errorMsg}</div>
      )}
      <div className="text-[10px] text-text-muted">
        One email a month. No spam. Unsubscribe anytime.
      </div>
    </form>
  )
}

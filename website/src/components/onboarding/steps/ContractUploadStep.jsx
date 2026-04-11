import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { parsePdfText } from '@/lib/claude'
import { trackEvent } from '@/services/onboardingService'

const PROCESSING_STEPS = [
  'Reading contract...',
  'Extracting benefits...',
  'Matching assets...',
  'Organizing data...',
]

export default function ContractUploadStep({ onNext, onSkip }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [extracted, setExtracted] = useState(null)
  const [showBenefits, setShowBenefits] = useState(0)

  async function processFile(text) {
    setUploading(true)
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      setProcessingStep(i)
      await new Promise(r => setTimeout(r, 800))
    }
    try {
      const result = await parsePdfText(text)
      const parsed = result?.parsed
      if (parsed) {
        setExtracted(parsed)
        // Animate benefit reveal
        const count = parsed.benefits?.length || 0
        for (let i = 1; i <= count; i++) {
          await new Promise(r => setTimeout(r, 200))
          setShowBenefits(i)
        }
        // Save the contract
        await supabase.from('contracts').insert({
          property_id: profile?.property_id,
          brand_name: parsed.brand_name || 'New Contract',
          contract_number: parsed.contract_number,
          effective_date: parsed.effective_date,
          expiration_date: parsed.expiration_date,
          total_value: parsed.total_value,
          contract_text: text.slice(0, 50000),
        })
        trackEvent('contract_uploaded_during_onboarding', { benefits_count: count })
      }
    } catch (err) {
      toast({ title: 'Parsing failed', description: err.message, type: 'error' })
    }
    setUploading(false)
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      await processFile(text)
    } catch {
      toast({ title: 'Could not read file', type: 'error' })
    }
  }

  async function handleSample() {
    const sample = `SPONSORSHIP AGREEMENT
Between: Acme Financial Services, Inc.
And: Sample Property

Contract Value: $125,000
Effective: January 1, 2026
Expires: December 31, 2026

Benefits:
- LED scoreboard signage (4 per game, 30 seconds each)
- Public address announcements (2 per game)
- Social media mentions (10 per month on Instagram and Twitter)
- VIP hospitality suite access (8 guests per game)
- Radio spot advertising (15 per season)
- Premium parking pass (2 passes)
- Branded merchandise rights
- Naming rights to concession stand

Contact: Sarah Johnson, VP Marketing
Email: sarah@acmefinancial.com
Phone: (555) 123-4567`
    await processFile(sample)
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-2">⚡</div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">Watch AI extract your contract benefits</h2>
        <p className="text-xs sm:text-sm text-text-secondary">Upload any sponsor contract. Our AI reads it and extracts every benefit in seconds.</p>
      </div>

      {!uploading && !extracted && (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-accent/50 rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all"
          >
            <div className="text-3xl mb-2">📄</div>
            <div className="text-sm text-text-primary font-medium mb-1">Drop your contract here</div>
            <div className="text-[10px] text-text-muted">PDF, Word, or TXT</div>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileUpload} />
          </div>
          <div className="text-center">
            <div className="text-[10px] text-text-muted mb-2">or</div>
            <button onClick={handleSample} className="text-xs text-accent hover:underline">
              Try with a sample contract →
            </button>
          </div>
        </>
      )}

      {uploading && (
        <div className="bg-bg-card border border-accent/30 rounded-lg p-6 text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-3 border-accent border-t-transparent rounded-full mx-auto" />
          <div className="text-sm text-text-primary font-medium">{PROCESSING_STEPS[processingStep]}</div>
          <div className="w-full bg-bg-surface rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-accent transition-all duration-500" style={{ width: `${((processingStep + 1) / PROCESSING_STEPS.length) * 100}%` }} />
          </div>
        </div>
      )}

      {extracted && (
        <div className="bg-bg-card border border-success/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-success text-lg">✓</span>
            <span className="text-sm font-semibold text-text-primary">Contract parsed successfully</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><div className="text-[9px] text-text-muted uppercase">Brand</div><div className="text-text-primary font-medium">{extracted.brand_name || '—'}</div></div>
            <div><div className="text-[9px] text-text-muted uppercase">Total Value</div><div className="text-accent font-medium">${(extracted.total_value || 0).toLocaleString()}</div></div>
          </div>
          <div>
            <div className="text-[9px] text-text-muted uppercase mb-1">Extracted Benefits ({extracted.benefits?.length || 0})</div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {(extracted.benefits || []).slice(0, showBenefits).map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] animate-in fade-in slide-in-from-left-1 duration-300">
                  <span className="text-success shrink-0">✓</span>
                  <span className="text-text-secondary">{b.description || b.benefit_description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {extracted && (
          <button onClick={onNext} className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            See my extracted benefits →
          </button>
        )}
        {!extracted && !uploading && (
          <button onClick={onSkip} className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1">
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}

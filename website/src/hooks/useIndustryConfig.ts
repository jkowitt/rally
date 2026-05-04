import { useMemo, useSyncExternalStore } from 'react'
import { useAuth } from './useAuth'
import { getIndustryConfig } from '@/lib/industryConfig'

const QA_KEY = 'll_qa_industry'

function subscribeToQA(callback: () => void): () => void {
  const handler = (e: StorageEvent) => { if (e.key === QA_KEY) callback() }
  window.addEventListener('storage', handler)
  window.addEventListener('qa-industry-change', callback)
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener('qa-industry-change', callback)
  }
}

function getQAIndustry(): string | null {
  try { return localStorage.getItem(QA_KEY) || null } catch { return null }
}

export function setQAIndustry(type: string | null): void {
  if (type) localStorage.setItem(QA_KEY, type)
  else localStorage.removeItem(QA_KEY)
  window.dispatchEvent(new Event('qa-industry-change'))
}

// industryConfig.js is still untyped; the return shape is loose
// (terminology, moduleLabels, assetCategories, etc.) so we type it
// as an opaque record. Tighten when industryConfig itself is migrated.
export type IndustryConfig = Record<string, unknown> & {
  terminology?: Record<string, string>
  moduleLabels?: Record<string, string>
}

// useIndustryConfig — used to swap terminology + module labels by
// industry. After migration 081, every property gets the universal
// terminology by default (no industry selection at signup). The
// QA override + an explicit properties.type setting from a legacy
// property still work — that's intentional so existing accounts
// don't lose their preferred terms.
//
// Lookup order:
//   1. Developer QA override (only when role=developer)
//   2. properties.type if explicitly set on the row
//   3. 'other' (universal default)
export function useIndustryConfig(): IndustryConfig {
  const { profile } = useAuth()
  const qaOverride = useSyncExternalStore(subscribeToQA, getQAIndustry, getQAIndustry)
  const isDev = profile?.role === 'developer'

  const explicitType = profile?.properties?.type
                    || (profile as { property_type?: string } | null)?.property_type
                    || null
  const propertyType = (isDev && qaOverride)
    ? qaOverride
    : (explicitType || 'other')
  const config = useMemo(() => getIndustryConfig(propertyType) as IndustryConfig, [propertyType])

  return config
}

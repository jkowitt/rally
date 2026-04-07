import { useMemo, useSyncExternalStore } from 'react'
import { useAuth } from './useAuth'
import { getIndustryConfig } from '@/lib/industryConfig'

const QA_KEY = 'll_qa_industry'

function subscribeToQA(callback) {
  const handler = (e) => { if (e.key === QA_KEY) callback() }
  window.addEventListener('storage', handler)
  window.addEventListener('qa-industry-change', callback)
  return () => { window.removeEventListener('storage', handler); window.removeEventListener('qa-industry-change', callback) }
}

function getQAIndustry() {
  try { return localStorage.getItem(QA_KEY) || null } catch { return null }
}

export function setQAIndustry(type) {
  if (type) localStorage.setItem(QA_KEY, type)
  else localStorage.removeItem(QA_KEY)
  window.dispatchEvent(new Event('qa-industry-change'))
}

export function useIndustryConfig() {
  const { profile } = useAuth()
  const qaOverride = useSyncExternalStore(subscribeToQA, getQAIndustry)
  const isDev = profile?.role === 'developer'

  const propertyType = (isDev && qaOverride) ? qaOverride : (profile?.properties?.type || profile?.property_type || 'other')
  const config = useMemo(() => getIndustryConfig(propertyType), [propertyType])

  return config
}

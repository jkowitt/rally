import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { getIndustryConfig } from '@/lib/industryConfig'

export function useIndustryConfig() {
  const { profile } = useAuth()
  const propertyType = profile?.properties?.type || profile?.property_type || 'other'

  const config = useMemo(() => getIndustryConfig(propertyType), [propertyType])

  return config
}

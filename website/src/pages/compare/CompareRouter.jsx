import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import CompareHub from './CompareHub'
import ComparisonPage from './ComparisonPage'
import { COMPARISONS } from '@/data/comparisons'

/**
 * Public comparison router — a single lazy-loaded chunk powers the hub
 * and all 6 competitor comparison pages. Keeps the main bundle small
 * (nothing compare-related loads until /compare/* is visited).
 */
export default function CompareRouter() {
  return (
    <Routes>
      <Route index element={<CompareHub />} />
      <Route path=":slug" element={<SlugRoute />} />
      <Route path="*" element={<Navigate to="/compare" replace />} />
    </Routes>
  )
}

function SlugRoute() {
  const { slug } = useParams()
  const valid = COMPARISONS.some(c => c.slug === slug)
  if (!valid) return <Navigate to="/compare" replace />
  return <ComparisonPage slug={slug} />
}

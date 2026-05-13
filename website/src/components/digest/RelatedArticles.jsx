import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/**
 * Internal linking engine for Digest articles. Shows 2-3 related
 * articles at the bottom of each article page to:
 *   1. Keep readers on the site longer (reduces bounce rate)
 *   2. Help search engines discover content connections
 *   3. Distribute page authority across the Digest archive
 *
 * Matching algorithm: tag overlap > industry match > recency.
 * Falls back to most recent articles if no tags match.
 *
 * Also injects internal cross-links to /pricing and /compare
 * when the article topic is relevant (detected by keyword match).
 */
export default function RelatedArticles({ currentIssue, maxResults = 3 }) {
  const [related, setRelated] = useState([])

  useEffect(() => {
    if (!currentIssue?.id) return
    let mounted = true

    async function load() {
      const { data: all } = await supabase
        .from('digest_issues')
        .select('id, slug, title, subtitle, industry, tags, published_at, featured_image_url, view_count')
        .eq('status', 'published')
        .neq('id', currentIssue.id)
        .order('published_at', { ascending: false })
        .limit(50)

      if (!mounted || !all) return

      const scored = all.map(article => {
        let score = 0

        // Tag overlap (strongest signal)
        const currentTags = currentIssue.tags || []
        const articleTags = article.tags || []
        const overlap = currentTags.filter(t => articleTags.includes(t)).length
        score += overlap * 10

        // Same industry
        if (currentIssue.industry && article.industry === currentIssue.industry) {
          score += 5
        }

        // Recency bonus (newer = better, up to 3 points)
        if (article.published_at) {
          const daysOld = (Date.now() - new Date(article.published_at).getTime()) / 86400000
          score += Math.max(0, 3 - Math.floor(daysOld / 30))
        }

        // Popularity bonus
        if (article.view_count > 100) score += 2
        else if (article.view_count > 50) score += 1

        return { ...article, _score: score }
      })

      scored.sort((a, b) => b._score - a._score)
      setRelated(scored.slice(0, maxResults))
    }

    load()
    return () => { mounted = false }
  }, [currentIssue?.id, maxResults])

  if (related.length === 0) return null

  // Detect if the current article is about pricing/comparison topics
  // so we can add contextual cross-links
  const bodyLower = (currentIssue.body_markdown || '').toLowerCase()
  const showPricingLink = /\b(pricing|cost|budget|roi|investment|affordable)\b/.test(bodyLower)
  const showCompareLink = /\b(alternative|competitor|compare|versus|vs\.|switch)\b/.test(bodyLower)

  return (
    <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #d4d0c3' }}>
      <div style={{
        fontSize: '11px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: '#7a7a75',
        fontFamily: 'Georgia, serif',
        marginBottom: '20px',
      }}>
        Keep Reading
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(related.length, 3)}, 1fr)`, gap: '20px' }}>
        {related.map(article => (
          <Link
            key={article.id}
            to={`/digest/${article.slug}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {article.featured_image_url && (
              <img
                src={article.featured_image_url}
                alt={article.title}
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '2px',
                  marginBottom: '10px',
                }}
              />
            )}
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1a1a18',
              lineHeight: 1.3,
              fontFamily: 'Georgia, serif',
            }}>
              {article.title}
            </div>
            {article.subtitle && (
              <div style={{
                fontSize: '13px',
                color: '#5a5a55',
                marginTop: '4px',
                lineHeight: 1.4,
                fontFamily: 'Georgia, serif',
              }}>
                {article.subtitle}
              </div>
            )}
            <div style={{
              fontSize: '11px',
              color: '#7a7a75',
              marginTop: '6px',
              fontFamily: 'Georgia, serif',
            }}>
              {article.published_at && new Date(article.published_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {article.view_count > 0 && ` · ${article.view_count} views`}
            </div>
          </Link>
        ))}
      </div>

      {/* Contextual cross-links to other sections of the site */}
      {(showPricingLink || showCompareLink) && (
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #d4d0c3',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {showPricingLink && (
            <Link
              to="/pricing"
              style={{
                fontSize: '12px',
                color: '#D85A30',
                fontFamily: 'Georgia, serif',
                textDecoration: 'none',
              }}
            >
              See Loud CRM pricing →
            </Link>
          )}
          {showCompareLink && (
            <Link
              to="/compare"
              style={{
                fontSize: '12px',
                color: '#D85A30',
                fontFamily: 'Georgia, serif',
                textDecoration: 'none',
              }}
            >
              Compare Loud CRM to alternatives →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

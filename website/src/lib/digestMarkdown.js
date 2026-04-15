/**
 * Minimal markdown → HTML renderer for Digest articles.
 *
 * Deliberately not pulling in marked/remark — this is ~100 lines
 * and covers everything we need: headings, bold, italic, links,
 * lists, blockquotes, images, horizontal rules, inline code,
 * paragraphs. Citations ([1], [2]) are linked to anchors.
 *
 * Input: markdown string
 * Output: sanitized HTML string safe to render via dangerouslySetInnerHTML
 *
 * Sanitization: HTML special chars escaped before any markdown
 * transforms. Final output contains only the whitelisted tags
 * this renderer produces — no user HTML passes through.
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(text) {
  let out = escapeHtml(text)

  // Images first so their syntax doesn't get eaten by links
  // ![alt](url) → <img>
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+?)(?:\s+"([^"]+)")?\)/g,
    (_, alt, url, title) => {
      const safeUrl = /^(https?:|\/)/.test(url) ? url : '#'
      const t = title ? ` title="${escapeHtml(title)}"` : ''
      return `<img src="${safeUrl}" alt="${escapeHtml(alt)}"${t} class="digest-img" loading="lazy" />`
    })

  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+?)(?:\s+"([^"]+)")?\)/g,
    (_, label, url, title) => {
      const safeUrl = /^(https?:|mailto:|#|\/)/.test(url) ? url : '#'
      const t = title ? ` title="${escapeHtml(title)}"` : ''
      const external = /^https?:/.test(url)
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${safeUrl}"${t}${attrs}>${label}</a>`
    })

  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic *text*
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  // Inline code `text`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Citation markers [1], [2], etc. → anchor links
  out = out.replace(/\[(\d{1,3})\]/g,
    '<sup><a href="#citation-$1" class="digest-citation">[$1]</a></sup>')

  return out
}

export function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return ''

  const lines = md.split('\n')
  const out = []
  let inList = false
  let listType = null // 'ul' or 'ol'
  let inQuote = false
  let paragraph = []

  function flushParagraph() {
    if (paragraph.length > 0) {
      out.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }

  function closeList() {
    if (inList) {
      out.push(`</${listType}>`)
      inList = false
      listType = null
    }
  }

  function closeQuote() {
    if (inQuote) {
      out.push('</blockquote>')
      inQuote = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    // Blank line → paragraph break
    if (!line.trim()) {
      flushParagraph()
      closeList()
      closeQuote()
      continue
    }

    // Horizontal rule: --- or ***
    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushParagraph()
      closeList()
      closeQuote()
      out.push('<hr class="digest-hr" />')
      continue
    }

    // Headings: # through ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      closeList()
      closeQuote()
      const level = headingMatch[1].length
      out.push(`<h${level} class="digest-h${level}">${renderInline(headingMatch[2])}</h${level}>`)
      continue
    }

    // Blockquote: > text
    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      closeList()
      if (!inQuote) {
        out.push('<blockquote class="digest-quote">')
        inQuote = true
      }
      out.push(`<p>${renderInline(quoteMatch[1])}</p>`)
      continue
    } else {
      closeQuote()
    }

    // Unordered list: - text or * text
    const ulMatch = line.match(/^[-*+]\s+(.+)$/)
    if (ulMatch) {
      flushParagraph()
      if (inList && listType !== 'ul') closeList()
      if (!inList) {
        out.push('<ul class="digest-list">')
        inList = true
        listType = 'ul'
      }
      out.push(`<li>${renderInline(ulMatch[1])}</li>`)
      continue
    }

    // Ordered list: 1. text
    const olMatch = line.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      flushParagraph()
      if (inList && listType !== 'ol') closeList()
      if (!inList) {
        out.push('<ol class="digest-list digest-list-ordered">')
        inList = true
        listType = 'ol'
      }
      out.push(`<li>${renderInline(olMatch[1])}</li>`)
      continue
    } else {
      closeList()
    }

    // Standalone image line: ![alt](url)
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line)) {
      flushParagraph()
      out.push(`<figure class="digest-figure">${renderInline(line)}</figure>`)
      continue
    }

    // Default: paragraph text (collected until next blank line)
    paragraph.push(line)
  }

  flushParagraph()
  closeList()
  closeQuote()
  return out.join('\n')
}

/**
 * Render citations as a numbered reference list at the bottom of
 * the article. Each citation has the shape { num, title, url }.
 * Returns an HTML string.
 */
export function renderCitations(citations) {
  if (!Array.isArray(citations) || citations.length === 0) return ''
  const items = citations.map(c => {
    const num = c.num || c.number || ''
    const title = escapeHtml(c.title || c.url || '')
    const url = c.url || '#'
    const safeUrl = /^https?:/.test(url) ? url : '#'
    return `<li id="citation-${num}"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${title}</a></li>`
  }).join('\n')
  return `<section class="digest-citations"><h3 class="digest-h3">Sources</h3><ol>${items}</ol></section>`
}

/**
 * Slugify a title into a URL-safe string.
 *   "February 2026 Real Estate Trends" → "february-2026-real-estate-trends"
 */
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Extract the first N characters of plain text from markdown.
 * Used for email previews and meta descriptions.
 */
export function excerpt(md, maxChars = 200) {
  if (!md) return ''
  const plain = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // strip images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // strip link syntax, keep text
    .replace(/[#*>`_-]/g, '') // strip markdown markers
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= maxChars) return plain
  return plain.slice(0, maxChars).replace(/\s+\S*$/, '') + '…'
}

/**
 * Estimate reading time in minutes at 220 wpm.
 */
export function readingTime(md) {
  const words = (md || '').trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 220))
}

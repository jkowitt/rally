import express from 'express'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3007

const SITE_URL = process.env.SITE_URL || 'https://loud-legacy.com'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

// Service-role client for server-side DB access (sitemap, SEO meta, analytics).
// Falls back gracefully if keys aren't set — the SPA still works, just without
// server-side SEO enhancements.
let supabase = null
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
} catch {}

// ─── Bot detection ────────────────────────────────────────
const BOT_UA_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebot/i, /facebookexternalhit/i,
  /twitterbot/i, /linkedinbot/i, /whatsapp/i, /telegrambot/i,
  /applebot/i, /discordbot/i, /slackbot/i, /pinterest/i,
  /embedly/i, /redditbot/i, /semrushbot/i, /ahrefsbot/i,
]

function isBot(ua) {
  if (!ua) return false
  return BOT_UA_PATTERNS.some(p => p.test(ua))
}

// Known public paths that should get SEO treatment
const PUBLIC_PATHS = [
  /^\/$/,
  /^\/pricing\/?$/,
  /^\/digest\/?$/,
  /^\/digest\/[a-z0-9-]+\/?$/,
  /^\/compare\/?$/,
  /^\/compare\/[a-z0-9-]+\/?$/,
  /^\/unsubscribe\/[a-z0-9-]+\/?$/,
]

function isPublicPath(path) {
  return PUBLIC_PATHS.some(p => p.test(path))
}

// ── Security Headers ──────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.sheetjs.com https://cdn.jsdelivr.net",
    "worker-src 'self' blob: https://unpkg.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.anthropic.com https://api.github.com https://unpkg.com https://cdn.sheetjs.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://fonts.googleapis.com https://fonts.gstatic.com",
    "frame-src 'self' https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '))

  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
})

app.use(compression())
app.use(express.json({ limit: '1kb' }))

// ── 1. DYNAMIC SITEMAP ────────────────────────────────────
// Generated from the database on every request. Includes all
// published Digest articles, comparison pages, and static routes.
app.get('/sitemap.xml', async (_req, res) => {
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, max-age=3600')

  const today = new Date().toISOString().slice(0, 10)

  // Static pages
  const urls = [
    { loc: '/', lastmod: today, freq: 'weekly', priority: '1.0' },
    { loc: '/pricing', lastmod: today, freq: 'weekly', priority: '0.8' },
    { loc: '/digest', lastmod: today, freq: 'weekly', priority: '0.8' },
    { loc: '/compare', lastmod: today, freq: 'monthly', priority: '0.7' },
  ]

  // Dynamic: published Digest articles
  if (supabase) {
    try {
      const { data: articles } = await supabase
        .from('digest_issues')
        .select('slug, published_at, updated_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(500)

      if (articles) {
        for (const a of articles) {
          urls.push({
            loc: `/digest/${a.slug}`,
            lastmod: (a.updated_at || a.published_at || today).slice(0, 10),
            freq: 'monthly',
            priority: '0.7',
          })
        }
      }
    } catch {}
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  res.send(xml)
})

// ── 2. ROBOTS.TXT (dynamic, references dynamic sitemap) ──
app.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain')
  res.send(`User-agent: *
Allow: /
Allow: /digest/
Allow: /pricing
Allow: /compare/
Disallow: /app/
Disallow: /dev/
Disallow: /login

Sitemap: ${SITE_URL}/sitemap.xml
`)
})

// ── 3. ANALYTICS ENDPOINT ─────────────────────────────────
// Receives page view events from the lightweight client tracker.
// No cookies, no PII, no third-party. GDPR-compliant by design.
app.post('/api/pageview', async (req, res) => {
  if (!supabase) return res.status(204).end()

  try {
    const ua = req.headers['user-agent'] || ''
    const bot = isBot(ua)

    await supabase.from('page_views').insert({
      page_path: (req.body.path || '/').slice(0, 500),
      referrer: (req.body.referrer || '').slice(0, 1000),
      utm_source: (req.body.utm_source || '').slice(0, 100) || null,
      utm_medium: (req.body.utm_medium || '').slice(0, 100) || null,
      utm_campaign: (req.body.utm_campaign || '').slice(0, 100) || null,
      utm_content: (req.body.utm_content || '').slice(0, 100) || null,
      user_agent: ua.slice(0, 500),
      session_id: (req.body.session_id || '').slice(0, 64) || null,
      duration_ms: typeof req.body.duration_ms === 'number' ? req.body.duration_ms : null,
      scroll_depth: typeof req.body.scroll_depth === 'number' ? req.body.scroll_depth : null,
      screen_width: typeof req.body.screen_width === 'number' ? req.body.screen_width : null,
      is_bot: bot,
    })
  } catch {}

  res.status(204).end()
})

// ── 4. SEO PRE-RENDER FOR BOTS ────────────────────────────
// When a bot requests a public page, we serve a server-rendered
// HTML shell with correct meta tags, JSON-LD, and content preview
// instead of the empty SPA shell. This is NOT full SSR — we don't
// render React server-side. We inject the correct <head> tags into
// the index.html template so crawlers see real metadata without
// executing JavaScript.
//
// This is the lightweight alternative to Puppeteer-based pre-rendering:
// instead of rendering the full page, we just fix the <head> tags.
// For content-heavy pages (Digest articles), we also inject a
// <noscript> block with the article text so crawlers that don't
// execute JS still get the content.
app.use(async (req, res, next) => {
  const ua = req.headers['user-agent'] || ''

  // Only intercept bots on public paths
  if (!isBot(ua) || !isPublicPath(req.path)) return next()
  if (!supabase) return next()

  // Skip static files
  if (req.path.match(/\.(js|css|svg|png|jpg|ico|json|woff2?|ttf|map)$/)) return next()

  try {
    // Look up SEO meta for this path
    const { data: meta } = await supabase
      .from('seo_meta')
      .select('*')
      .eq('page_path', req.path)
      .maybeSingle()

    if (!meta) return next()

    // Read the built index.html
    const fs = await import('fs')
    let html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf-8')

    // Replace <title>
    if (meta.title) {
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${escHtml(meta.title)}</title>`)
    }

    // Replace meta description
    if (meta.description) {
      html = html.replace(
        /(<meta name="description" content=")[^"]*(")/,
        `$1${escAttr(meta.description)}$2`,
      )
    }

    // Replace OG tags
    if (meta.og_title) {
      html = html.replace(
        /(<meta property="og:title" content=")[^"]*(")/,
        `$1${escAttr(meta.og_title)}$2`,
      )
    }
    if (meta.og_description) {
      html = html.replace(
        /(<meta property="og:description" content=")[^"]*(")/,
        `$1${escAttr(meta.og_description)}$2`,
      )
    }
    if (meta.og_image_url) {
      // Insert og:image if it doesn't exist
      if (html.includes('og:image')) {
        html = html.replace(
          /(<meta property="og:image" content=")[^"]*(")/,
          `$1${escAttr(meta.og_image_url)}$2`,
        )
      } else {
        html = html.replace(
          '</head>',
          `<meta property="og:image" content="${escAttr(meta.og_image_url)}" />\n</head>`,
        )
      }
    }
    if (meta.og_type) {
      html = html.replace(
        /(<meta property="og:type" content=")[^"]*(")/,
        `$1${escAttr(meta.og_type)}$2`,
      )
    }

    // Replace canonical URL
    if (meta.canonical_url) {
      html = html.replace(
        /(<link rel="canonical" href=")[^"]*(")/,
        `$1${escAttr(meta.canonical_url)}$2`,
      )
    }

    // Replace robots
    if (meta.robots) {
      html = html.replace(
        /(<meta name="robots" content=")[^"]*(")/,
        `$1${escAttr(meta.robots)}$2`,
      )
    }

    // Inject page-specific JSON-LD (replace the generic SoftwareApplication one)
    if (meta.json_ld && Object.keys(meta.json_ld).length > 0) {
      const jsonLdStr = JSON.stringify(meta.json_ld)
      html = html.replace(
        /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
        `<script type="application/ld+json">${jsonLdStr}</script>`,
      )
    }

    // For Digest articles: inject a <noscript> content block so
    // crawlers that don't execute JS still see the article text.
    if (req.path.startsWith('/digest/') && req.path !== '/digest/') {
      const slug = req.path.replace('/digest/', '').replace(/\/$/, '')
      try {
        const { data: article } = await supabase
          .from('digest_issues')
          .select('title, subtitle, body_markdown, author, published_at')
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle()

        if (article) {
          const plainText = (article.body_markdown || '')
            .replace(/#{1,6}\s+/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .slice(0, 5000)

          const noscriptBlock = `<noscript>
<article>
<h1>${escHtml(article.title)}</h1>
${article.subtitle ? `<p><em>${escHtml(article.subtitle)}</em></p>` : ''}
<p>By ${escHtml(article.author || 'Loud Legacy Ventures')}${article.published_at ? ` · ${new Date(article.published_at).toLocaleDateString()}` : ''}</p>
<div>${escHtml(plainText)}</div>
</article>
</noscript>`
          html = html.replace('<div id="root"></div>', `<div id="root"></div>${noscriptBlock}`)
        }
      } catch {}
    }

    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('X-Prerendered', 'meta-injection')
    res.send(html)
  } catch {
    next()
  }
})

// Serve static files from Vite build output
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  immutable: true,
}))

// Health check for Railway
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// SPA fallback - serve index.html for all non-file routes
app.use((_req, res) => {
  res.setHeader('Cache-Control', 'no-cache')
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Loud Legacy running on port ${PORT}`)
})

// ── Helpers ───────────────────────────────────────────────
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

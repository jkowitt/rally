import express from 'express'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3007

// ── Security Headers ──────────────────────────────────────────────
app.use((_req, res, next) => {
  // Force HTTPS in production (Railway terminates SSL at the proxy)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')

  // Stop browsers from MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Control referrer info
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Restrict browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.sheetjs.com https://cdn.jsdelivr.net",
    "worker-src 'self' blob: https://unpkg.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.anthropic.com https://api.github.com https://unpkg.com https://cdn.sheetjs.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com",
    "frame-src 'self' https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '))

  // Allow cross-origin resources (needed for CDN-loaded pdfjs worker)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')

  next()
})

app.use(compression())

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

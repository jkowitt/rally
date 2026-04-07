import DOMPurify from 'dompurify'

// Sanitize any user-generated text input
export function sanitizeText(input) {
  if (!input || typeof input !== 'string') return input
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
}

// Sanitize HTML content (allows safe formatting)
export function sanitizeHTML(input) {
  if (!input || typeof input !== 'string') return input
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'a', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  })
}

// Sanitize object — recursively sanitize all string values
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const clean = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeText(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      clean[key] = sanitizeObject(value)
    } else {
      clean[key] = value
    }
  }
  return clean
}

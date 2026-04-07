// Client-side rate limiter — prevents API abuse
const buckets = {}

export function checkRateLimit(key, maxPerMinute = 10) {
  const now = Date.now()
  if (!buckets[key]) buckets[key] = []

  // Remove entries older than 1 minute
  buckets[key] = buckets[key].filter(t => now - t < 60000)

  if (buckets[key].length >= maxPerMinute) {
    return false // rate limited
  }

  buckets[key].push(now)
  return true // allowed
}

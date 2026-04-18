// ============================================================
// Loud Legacy — Self-hosted Analytics Tracker (t.js)
// ============================================================
// ~1.5KB minified. No cookies. No PII. No third-party domains.
// GDPR-compliant by design — no consent banner needed.
//
// Tracks: page path, referrer, UTM params, session (random ID
// stored in sessionStorage — dies when tab closes), scroll depth,
// time on page, and screen width.
//
// Sends a single POST to /api/pageview on page load and another
// on unload (with duration + scroll depth).
//
// To include on any page:
//   <script src="/t.js" defer></script>
// ============================================================
(function() {
  'use strict'
  if (typeof window === 'undefined') return

  var endpoint = '/api/pageview'
  var startTime = Date.now()
  var maxScroll = 0

  // Anonymous session ID — lives in sessionStorage, dies with the tab.
  // Not a cookie. Not persistent. Not trackable across sessions.
  var sessionId = sessionStorage.getItem('_ll_sid')
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('_ll_sid', sessionId)
  }

  // Parse UTM params from the current URL
  var params = new URLSearchParams(location.search)
  var utm = {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    content: params.get('utm_content') || '',
  }

  // Track max scroll depth (percentage of page height)
  function updateScroll() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop
    var docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    )
    var winHeight = window.innerHeight
    if (docHeight <= winHeight) { maxScroll = 100; return }
    var percent = Math.round((scrollTop / (docHeight - winHeight)) * 100)
    if (percent > maxScroll) maxScroll = percent
  }
  window.addEventListener('scroll', updateScroll, { passive: true })

  // Send the initial page view (no duration/scroll yet)
  function sendView(final) {
    var payload = {
      path: location.pathname,
      referrer: document.referrer || '',
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content,
      session_id: sessionId,
      screen_width: window.innerWidth,
    }
    if (final) {
      payload.duration_ms = Date.now() - startTime
      payload.scroll_depth = maxScroll
    }

    // Use sendBeacon on unload (guaranteed delivery), fetch otherwise
    if (final && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(payload))
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function() {})
    }
  }

  // Fire initial view after a short delay (avoids counting instant bounces)
  setTimeout(function() { sendView(false) }, 300)

  // Fire final view with duration + scroll on page unload
  window.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') sendView(true)
  })

  // SPA navigation: re-track when the URL changes (pushState/popstate)
  var lastPath = location.pathname
  function checkNavigation() {
    if (location.pathname !== lastPath) {
      // Send final event for previous page
      sendView(true)
      // Reset for new page
      lastPath = location.pathname
      startTime = Date.now()
      maxScroll = 0
      params = new URLSearchParams(location.search)
      utm.source = params.get('utm_source') || utm.source
      utm.medium = params.get('utm_medium') || utm.medium
      utm.campaign = params.get('utm_campaign') || utm.campaign
      utm.content = params.get('utm_content') || utm.content
      setTimeout(function() { sendView(false) }, 300)
    }
  }

  // Intercept pushState and replaceState to detect SPA navigation
  var origPush = history.pushState
  var origReplace = history.replaceState
  history.pushState = function() {
    origPush.apply(history, arguments)
    checkNavigation()
  }
  history.replaceState = function() {
    origReplace.apply(history, arguments)
    checkNavigation()
  }
  window.addEventListener('popstate', checkNavigation)
})()

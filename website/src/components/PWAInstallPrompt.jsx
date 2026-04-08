import { useState, useEffect } from 'react'

let deferredPrompt = null

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('ll-pwa-dismissed') === '1' } catch { return false }
  })

  useEffect(() => {
    function handleBeforeInstall(e) {
      e.preventDefault()
      deferredPrompt = e
      if (!dismissed) setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [dismissed])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    deferredPrompt = null
  }

  function handleDismiss() {
    setShow(false)
    setDismissed(true)
    localStorage.setItem('ll-pwa-dismissed', '1')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40 bg-bg-surface border border-accent/30 rounded-lg shadow-xl p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="text-2xl">📱</div>
        <div className="flex-1">
          <div className="text-sm font-medium text-text-primary">Install Loud Legacy</div>
          <p className="text-xs text-text-muted mt-0.5">Add to your home screen for a native app experience</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstall} className="bg-accent text-bg-primary px-4 py-1.5 rounded text-xs font-medium hover:opacity-90">
              Install
            </button>
            <button onClick={handleDismiss} className="text-text-muted text-xs hover:text-text-secondary">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

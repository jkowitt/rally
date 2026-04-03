import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ToastContext = createContext(null)

const TOAST_DURATION = 4000

const typeStyles = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-accent',
}

const typeTextStyles = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-accent',
}

let toastId = 0

function ToastItem({ toast, onClose }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    // Trigger slide-in on next frame
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose(toast.id), 200)
    }, TOAST_DURATION)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, onClose])

  const handleClose = () => {
    clearTimeout(timerRef.current)
    setVisible(false)
    setTimeout(() => onClose(toast.id), 200)
  }

  const type = toast.type || 'info'

  return (
    <div
      className={`
        pointer-events-auto w-80 border-l-4 ${typeStyles[type]}
        bg-bg-card border border-border rounded-md shadow-lg
        transition-all duration-200 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-2 p-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-text-primary ${typeTextStyles[type]}`}>
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-1 text-xs text-text-secondary">{toast.description}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 text-text-secondary hover:text-text-primary transition-colors p-0.5"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(({ title, description, type = 'info' }) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, title, description, type }])
    return id
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

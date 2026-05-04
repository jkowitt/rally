import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import ComposeEmail from '@/modules/inbox/ComposeEmail'

// App-wide compose-email controller. Lets ANY surface open the
// compose modal with prefilled fields without each one needing
// to mount its own ComposeEmail instance.
//
// Usage:
//   const { open } = useComposeEmail()
//   <button onClick={() => open({ to: contact.email, defaultSubject: 'Hi' })}>Email</button>
//
// Provider mounts a single ComposeEmail at the app root.

interface ComposeOptions {
  to?: string
  cc?: string
  defaultSubject?: string
  defaultBody?: string
  dealId?: string | null
  // Optional AI-drafted message generator. If provided, Compose
  // shows a "Draft with AI" button that calls this and replaces
  // the body with the result.
  generateDraft?: () => Promise<{ subject?: string; body: string } | null>
}

interface ComposeAPI {
  open: (opts?: ComposeOptions) => void
  close: () => void
  isOpen: boolean
}

const ComposeContext = createContext<ComposeAPI | null>(null)

export function ComposeEmailProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [opts, setOpts] = useState<ComposeOptions>({})

  const open = useCallback((next: ComposeOptions = {}) => {
    setOpts(next)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Defer clearing opts so the closing animation keeps the right state
    setTimeout(() => setOpts({}), 250)
  }, [])

  return (
    <ComposeContext.Provider value={{ open, close, isOpen }}>
      {children}
      <ComposeEmail
        open={isOpen}
        onClose={close}
        defaultTo={opts.to}
        defaultCc={opts.cc}
        defaultSubject={opts.defaultSubject}
        defaultBody={opts.defaultBody}
        dealId={opts.dealId}
        generateDraft={opts.generateDraft}
      />
    </ComposeContext.Provider>
  )
}

export function useComposeEmail(): ComposeAPI {
  const ctx = useContext(ComposeContext)
  if (!ctx) {
    // Render a no-op fallback so leaf components can call open()
    // safely even before the provider mounts (e.g. during tests).
    return {
      open: () => {},
      close: () => {},
      isOpen: false,
    }
  }
  return ctx
}

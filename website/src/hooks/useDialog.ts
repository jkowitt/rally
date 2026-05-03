import { useEffect, useRef } from 'react'

// Dialog ergonomics: Escape closes, focus returns to the trigger
// element on close, and focus is moved into the dialog on open.
//
// Usage:
//   const dialogRef = useDialog({ isOpen: true, onClose })
//   <div ref={dialogRef} role="dialog" aria-modal>...</div>
//
// Caller is responsible for:
//   - Conditional rendering (we don't unmount for them)
//   - aria-* attributes (role, aria-modal, aria-labelledby)
//   - Backdrop click handling, if any

export interface UseDialogOptions {
  isOpen: boolean
  onClose: () => void
  // If true, swallow Escape — useful if the dialog has nested
  // modals and the inner one needs to consume the event first.
  disableEscape?: boolean
}

export function useDialog<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  disableEscape = false,
}: UseDialogOptions) {
  const ref = useRef<T | null>(null)
  const triggerRef = useRef<Element | null>(null)

  // Capture the active element on open so we can restore focus on close.
  useEffect(() => {
    if (!isOpen) return
    triggerRef.current = document.activeElement
    // Move focus into the dialog. If nothing is focusable, focus the
    // dialog container itself (which needs tabIndex={-1} to receive it).
    const node = ref.current
    if (node) {
      const focusable = node.querySelector<HTMLElement>(
        'input, button:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], select, textarea'
      )
      if (focusable) focusable.focus()
      else if (typeof (node as unknown as HTMLElement).focus === 'function') {
        ;(node as unknown as HTMLElement).focus()
      }
    }
    return () => {
      // Restore focus to the trigger when the dialog closes
      const trigger = triggerRef.current as HTMLElement | null
      if (trigger && typeof trigger.focus === 'function') {
        trigger.focus()
      }
    }
  }, [isOpen])

  // Escape closes
  useEffect(() => {
    if (!isOpen || disableEscape) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, disableEscape, onClose])

  return ref
}

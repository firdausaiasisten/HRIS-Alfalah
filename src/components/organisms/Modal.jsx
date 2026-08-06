// src/components/organisms/Modal.jsx
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Accessible modal dialog: traps focus, closes on Escape or backdrop
 * click, restores focus to the trigger element on close (WCAG AA --
 * brief section 13, "keyboard navigation, visible focus state").
 */
export default function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement
    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    focusable?.[0]?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && focusable?.length) {
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-app bg-white p-6 shadow-xl"
      >
        {title && (
          <h3 id="modal-title" className="mb-4 text-base font-semibold text-slate-900">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

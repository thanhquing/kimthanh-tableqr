import { useEffect, useRef, type RefObject } from 'react'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = ref.current

    window.setTimeout(() => {
      const firstFocusable = root?.querySelector<HTMLElement>(focusableSelector)
      ;(firstFocusable ?? root)?.focus()
    }, 0)

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !root) {
        return
      }

      const focusable = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )

      if (focusable.length === 0) {
        event.preventDefault()
        root.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!first || !last) {
        return
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [isOpen, onClose])

  return ref
}

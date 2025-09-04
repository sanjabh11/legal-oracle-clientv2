import { useEffect } from 'react'

// Simple IntersectionObserver-based reveal-on-scroll hook
// Elements should have [data-reveal] and a base class of `reveal-start` for initial state.
export default function useRevealOnScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement
          if (entry.isIntersecting) {
            el.classList.add('reveal-in')
            el.classList.remove('reveal-start')
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )

    elements.forEach((el) => {
      // ensure initial state
      el.classList.add('reveal-start')
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])
}

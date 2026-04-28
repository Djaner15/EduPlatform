import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppSettings } from '../../app/AppSettingsContext'
import { playUiClickSound } from '../uiAudio'

type Bubble = {
  id: number
  x: number
  y: number
  size: number
}

const BUTTON_SELECTOR = '.button-primary, .submit-button'
const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input:not([type="hidden"]), textarea, select, summary, label[for]'

export function DolphinCursorEffects() {
  const { cursorMode } = useAppSettings()
  const [isEnabled, setIsEnabled] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isInteractive, setIsInteractive] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>([])

  const cursorRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const bubbleIdRef = useRef(0)
  const lastBubbleAtRef = useRef(0)
  const buttonsRef = useRef<HTMLElement[]>([])
  const interactiveRef = useRef(false)
  const visibleRef = useRef(false)
  const pointerRef = useRef({ x: 0, y: 0 })
  const renderedRef = useRef({ x: 0, y: 0 })

  const cursorSvg = useMemo(
    () =>
      cursorMode === 'pro-circle'
        ? `
      <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="42" cy="42" r="22" stroke="rgba(255,255,255,0.92)" stroke-width="1.6" />
        <circle cx="42" cy="42" r="22" stroke="currentColor" stroke-width="3.2" />
        <circle cx="42" cy="42" r="5.4" fill="currentColor" fill-opacity="0.75" />
      </svg>
    `
        : `
      <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="cursorGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.25098 0 0 0 0 0.878431 0 0 0 0 0.815686 0 0 0 0.42 0"
            />
          </filter>
        </defs>
        <g filter="url(#cursorGlow)">
          <image href="/dolphin-logo.png" x="8" y="8" width="68" height="68" preserveAspectRatio="xMidYMid meet" />
        </g>
        <image href="/dolphin-logo.png" x="8" y="8" width="68" height="68" preserveAspectRatio="xMidYMid meet" />
      </svg>
    `,
    [cursorMode],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches

    if (prefersReducedMotion || coarsePointer) {
      return
    }

    setIsEnabled(true)

    const refreshButtons = () => {
      buttonsRef.current = Array.from(document.querySelectorAll<HTMLElement>(BUTTON_SELECTOR))
    }

    const resetMagneticButtons = () => {
      buttonsRef.current.forEach((button) => {
        button.style.setProperty('--magnetic-x', '0px')
        button.style.setProperty('--magnetic-y', '0px')
      })
    }

    const animate = () => {
      const nextX = renderedRef.current.x + (pointerRef.current.x - renderedRef.current.x) * 0.22
      const nextY = renderedRef.current.y + (pointerRef.current.y - renderedRef.current.y) * 0.22
      renderedRef.current = { x: nextX, y: nextY }

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`
      }

      buttonsRef.current.forEach((button) => {
        if (button.matches(':disabled')) {
          button.style.setProperty('--magnetic-x', '0px')
          button.style.setProperty('--magnetic-y', '0px')
          return
        }

        const rect = button.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const deltaX = pointerRef.current.x - centerX
        const deltaY = pointerRef.current.y - centerY
        const distance = Math.hypot(deltaX, deltaY)
        const threshold = Math.max(120, Math.max(rect.width, rect.height) * 1.6)

        if (distance > threshold) {
          button.style.setProperty('--magnetic-x', '0px')
          button.style.setProperty('--magnetic-y', '0px')
          return
        }

        const strength = (1 - distance / threshold) * 12
        const translateX = (deltaX / threshold) * strength
        const translateY = (deltaY / threshold) * strength

        button.style.setProperty('--magnetic-x', `${translateX.toFixed(2)}px`)
        button.style.setProperty('--magnetic-y', `${translateY.toFixed(2)}px`)
      })

      rafRef.current = window.requestAnimationFrame(animate)
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }

      if (!visibleRef.current) {
        visibleRef.current = true
        renderedRef.current = { x: event.clientX, y: event.clientY }
        setIsVisible(true)
      }

      const nextInteractive = Boolean((event.target as Element | null)?.closest(INTERACTIVE_SELECTOR))
      if (interactiveRef.current !== nextInteractive) {
        interactiveRef.current = nextInteractive
        setIsInteractive(nextInteractive)
      }

      const now = performance.now()
      if (now - lastBubbleAtRef.current < 48) {
        return
      }

      lastBubbleAtRef.current = now

      const bubble: Bubble = {
        id: bubbleIdRef.current++,
        x: event.clientX,
        y: event.clientY,
        size: 6 + Math.random() * 8,
      }

      setBubbles((current) => [...current.slice(-10), bubble])
      window.setTimeout(() => {
        setBubbles((current) => current.filter((entry) => entry.id !== bubble.id))
      }, 500)
    }

    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest(INTERACTIVE_SELECTOR)) {
        playUiClickSound()
      }
    }

    const handlePointerLeave = () => {
      visibleRef.current = false
      setIsVisible(false)
      interactiveRef.current = false
      setIsInteractive(false)
      resetMagneticButtons()
    }

    refreshButtons()

    const observer = new MutationObserver(() => {
      refreshButtons()
    })

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'disabled'],
    })

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    document.addEventListener('mouseleave', handlePointerLeave)
    window.addEventListener('blur', handlePointerLeave)
    rafRef.current = window.requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
      }

      observer.disconnect()
      resetMagneticButtons()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('mouseleave', handlePointerLeave)
      window.removeEventListener('blur', handlePointerLeave)
    }
  }, [])

  useEffect(() => {
    if (!isEnabled) {
      return
    }

    document.documentElement.classList.toggle('custom-cursor-enabled', cursorMode !== 'default')
    document.body.classList.toggle('custom-cursor-enabled', cursorMode !== 'default')
  }, [cursorMode, isEnabled])

  if (!isEnabled || cursorMode === 'default') {
    return null
  }

  return (
    <>
      <div
        ref={cursorRef}
        aria-hidden="true"
        className={`dolphin-cursor-shell ${isVisible ? 'is-visible' : ''} ${isInteractive ? 'is-interactive' : ''} ${cursorMode === 'pro-circle' ? 'is-pro-circle' : ''}`}
      >
        <div
          className="dolphin-cursor-mark"
          dangerouslySetInnerHTML={{ __html: cursorSvg }}
        />
      </div>

      {bubbles.map((bubble) => (
        <span
          key={bubble.id}
          aria-hidden="true"
          className="dolphin-cursor-bubble"
          style={{
            left: bubble.x,
            top: bubble.y,
            width: bubble.size,
            height: bubble.size,
          }}
        />
      ))}
    </>
  )
}

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAppSettings } from './AppSettingsContext'
import { isProbablyEnglish, translateLooseText } from './translationMemory'

type HybridTranslationProviderProps = {
  children: ReactNode
}

const TRANSLATABLE_ATTRIBUTES = ['title', 'placeholder', 'aria-label', 'alt'] as const

export function HybridTranslationProvider({ children }: HybridTranslationProviderProps) {
  const { language } = useAppSettings()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const textNodeOriginalsRef = useRef(new WeakMap<Text, string>())
  const elementAttributeOriginalsRef = useRef(new WeakMap<Element, Map<string, string>>())
  const observerRef = useRef<MutationObserver | null>(null)
  const [isReady, setIsReady] = useState(language === 'en')

  const shouldAutoTranslate = useMemo(() => language === 'bg', [language])

  const applyTextTranslation = (node: Text) => {
    const currentValue = node.textContent ?? ''
    if (!currentValue.trim()) {
      return
    }

    const originals = textNodeOriginalsRef.current
    if (!originals.has(node)) {
      originals.set(node, currentValue)
    }

    const originalValue = originals.get(node) ?? currentValue

    if (!shouldAutoTranslate) {
      if (node.textContent !== originalValue) {
        node.textContent = originalValue
      }
      return
    }

    if (!isProbablyEnglish(originalValue)) {
      return
    }

    const translatedValue = translateLooseText(originalValue, 'bg')
    if (translatedValue !== node.textContent) {
      node.textContent = translatedValue
    }
  }

  const applyAttributeTranslation = (element: Element) => {
    let originalAttributes = elementAttributeOriginalsRef.current.get(element)

    if (!originalAttributes) {
      originalAttributes = new Map<string, string>()
      elementAttributeOriginalsRef.current.set(element, originalAttributes)
    }

    TRANSLATABLE_ATTRIBUTES.forEach((attributeName) => {
      const currentValue = element.getAttribute(attributeName)
      if (!currentValue) {
        return
      }

      if (!originalAttributes?.has(attributeName)) {
        originalAttributes?.set(attributeName, currentValue)
      }

      const originalValue = originalAttributes?.get(attributeName) ?? currentValue

      if (!shouldAutoTranslate) {
        if (currentValue !== originalValue) {
          element.setAttribute(attributeName, originalValue)
        }
        return
      }

      if (!isProbablyEnglish(originalValue)) {
        return
      }

      const translatedValue = translateLooseText(originalValue, 'bg')
      if (translatedValue !== currentValue) {
        element.setAttribute(attributeName, translatedValue)
      }
    })
  }

  const walkNodeTree = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      applyTextTranslation(node as Text)
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return
    }

    const element = node as Element
    const tagName = element.tagName.toLowerCase()

    if (['script', 'style', 'noscript'].includes(tagName)) {
      return
    }

    applyAttributeTranslation(element)

    element.childNodes.forEach((childNode) => {
      walkNodeTree(childNode)
    })
  }

  useLayoutEffect(() => {
    setIsReady(!shouldAutoTranslate)

    if (!rootRef.current) {
      return
    }

    walkNodeTree(rootRef.current)
    setIsReady(true)
  }, [shouldAutoTranslate])

  useEffect(() => {
    if (!rootRef.current) {
      return
    }

    observerRef.current?.disconnect()

    observerRef.current = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          applyTextTranslation(mutation.target as Text)
          return
        }

        if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          applyAttributeTranslation(mutation.target as Element)
          return
        }

        mutation.addedNodes.forEach((addedNode) => {
          walkNodeTree(addedNode)
        })
      })
    })

    observerRef.current.observe(rootRef.current, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    })

    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [shouldAutoTranslate])

  return (
    <div
      ref={rootRef}
      aria-busy={!isReady}
      data-translation-ready={isReady ? 'true' : 'false'}
      style={{ visibility: isReady ? 'visible' : 'hidden' }}
    >
      {children}
    </div>
  )
}

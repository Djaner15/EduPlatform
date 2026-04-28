import bg from '../locales/bg.json'
import en from '../locales/en.json'

type TranslationEntry = {
  source: string
  target: string
}

const flattenLocaleTree = (tree: unknown, entries: string[] = []) => {
  if (!tree || typeof tree !== 'object') {
    return entries
  }

  Object.values(tree as Record<string, unknown>).forEach((value) => {
    if (typeof value === 'string') {
      entries.push(value)
      return
    }

    flattenLocaleTree(value, entries)
  })

  return entries
}

const createTranslationEntries = () => {
  const englishValues = flattenLocaleTree(en)
  const bulgarianValues = flattenLocaleTree(bg)

  return englishValues
    .map((source, index) => ({ source, target: bulgarianValues[index] }))
    .filter(
      (entry): entry is TranslationEntry =>
        typeof entry.source === 'string' &&
        typeof entry.target === 'string' &&
        entry.source.trim().length > 0 &&
        entry.target.trim().length > 0 &&
        !entry.source.includes('{{'),
    )
}

const translationEntries = createTranslationEntries()

const exactTranslationMap = new Map(
  translationEntries.map((entry) => [entry.source.trim(), entry.target.trim()] as const),
)

const partialTranslationEntries = [...translationEntries]
  .filter((entry) => entry.source.trim().length >= 4)
  .sort((left, right) => right.source.length - left.source.length)

const wrapTranslatedText = (original: string, translatedCore: string) => {
  const leadingWhitespace = original.match(/^\s*/)?.[0] ?? ''
  const trailingWhitespace = original.match(/\s*$/)?.[0] ?? ''
  return `${leadingWhitespace}${translatedCore}${trailingWhitespace}`
}

export const translateLooseText = (input: string, language: 'en' | 'bg') => {
  if (language !== 'bg') {
    return input
  }

  const trimmedInput = input.trim()
  if (!trimmedInput) {
    return input
  }

  const exactMatch = exactTranslationMap.get(trimmedInput)
  if (exactMatch) {
    return wrapTranslatedText(input, exactMatch)
  }

  let translated = input

  partialTranslationEntries.forEach(({ source, target }) => {
    if (!translated.includes(source)) {
      return
    }

    translated = translated.split(source).join(target)
  })

  return translated
}

export const isProbablyEnglish = (value: string) => /[A-Za-z]/.test(value)

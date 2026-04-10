export type SortDirection = 'asc' | 'desc'

export type SortType = 'text' | 'date' | 'alphanumeric'

const normalizeText = (value: string | number | Date | null | undefined) => String(value ?? '').trim().toLowerCase()

const normalizeDate = (value: string | number | Date | null | undefined) => {
  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY
  }

  if (!value) {
    return Number.NEGATIVE_INFINITY
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

export const compareValues = (
  left: string | number | Date | null | undefined,
  right: string | number | Date | null | undefined,
  type: SortType,
) => {
  if (type === 'date') {
    return normalizeDate(left) - normalizeDate(right)
  }

  if (type === 'alphanumeric') {
    return normalizeText(left).localeCompare(normalizeText(right), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  return normalizeText(left).localeCompare(normalizeText(right), undefined, {
    sensitivity: 'base',
  })
}

export const sortItems = <T>(
  items: T[],
  getValue: (item: T) => string | number | Date | null | undefined,
  direction: SortDirection,
  type: SortType,
) =>
  [...items].sort((left, right) => {
    const comparison = compareValues(getValue(left), getValue(right), type)
    return direction === 'asc' ? comparison : -comparison
  })

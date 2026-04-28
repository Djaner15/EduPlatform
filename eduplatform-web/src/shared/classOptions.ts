export const gradeOptions = [8, 9, 10, 11, 12] as const

export const sectionOptions = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'] as const

export const formatGradeDisplay = (grade?: number | null) => {
  switch (grade) {
    case 8:
      return 'VIII'
    case 9:
      return 'IX'
    case 10:
      return 'X'
    case 11:
      return 'XI'
    case 12:
      return 'XII'
    case null:
    case undefined:
      return ''
    default:
      return String(grade)
  }
}

export const formatGradeLabel = (grade?: number | null) => {
  const display = formatGradeDisplay(grade)
  return display ? `Grade ${display}` : 'Grade'
}

export const formatClassDisplay = (grade?: number | null, section?: string | null) =>
  grade && section ? `${formatGradeDisplay(grade)}${section}` : ''

export const formatStoredClassDisplay = (
  classDisplay?: string | null,
  fallbackGrade?: number | null,
  fallbackSection?: string | null,
) => {
  const normalized = classDisplay?.trim()

  if (normalized) {
    const match = normalized.match(/^(\d+)\s*([A-Za-zА-Яа-я]+)?$/)
    if (match) {
      return `${formatGradeDisplay(Number(match[1]))}${match[2] ?? ''}`
    }

    return normalized
  }

  return formatClassDisplay(fallbackGrade, fallbackSection)
}

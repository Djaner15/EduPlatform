export const gradeOptions = [8, 9, 10, 11, 12] as const

export const sectionOptions = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'] as const

export const formatClassDisplay = (grade?: number | null, section?: string | null) =>
  grade && section ? `${grade}${section}` : ''

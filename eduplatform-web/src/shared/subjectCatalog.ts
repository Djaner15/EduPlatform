import type { AppLanguage } from '../app/AppSettingsContext'

export type SubjectCatalogKey =
  | 'mathematics'
  | 'informatics'
  | 'chemistry'
  | 'biology'
  | 'physics'
  | 'geography'
  | 'history'
  | 'philosophy'
  | 'citizenship'
  | 'english'
  | 'french'
  | 'german'
  | 'russian'
  | 'unknown'

type SubjectLike = {
  name: string
  grade: number
  section: string
}

type SubjectCatalogEntry = {
  key: SubjectCatalogKey
  aliases: string[]
  icon: string
}

const subjectCatalog: SubjectCatalogEntry[] = [
  { key: 'mathematics', aliases: ['mathematics', 'math', 'algebra', 'geometry', 'матем'], icon: 'calculate' },
  { key: 'informatics', aliases: ['informatics', 'computer science', 'computer', 'programming', 'it', 'информ'], icon: 'computer' },
  { key: 'chemistry', aliases: ['chemistry', 'chem', 'хим'], icon: 'science' },
  { key: 'biology', aliases: ['biology', 'bio', 'биол'], icon: 'biotech' },
  { key: 'physics', aliases: ['physics', 'phys', 'физ'], icon: 'bolt' },
  { key: 'geography', aliases: ['geography', 'geo', 'географ'], icon: 'public' },
  { key: 'history', aliases: ['history', 'histor', 'истор'], icon: 'history' },
  { key: 'philosophy', aliases: ['philosophy', 'psychology', 'logic', 'ethics', 'философ', 'психолог', 'логика', 'етика'], icon: 'psychology' },
  { key: 'citizenship', aliases: ['citizenship', 'civics', 'граждан'], icon: 'balance' },
  { key: 'english', aliases: ['english', 'англий'], icon: 'translate' },
  { key: 'french', aliases: ['french', 'френ'], icon: 'language' },
  { key: 'german', aliases: ['german', 'немск'], icon: 'menu_book' },
  { key: 'russian', aliases: ['russian', 'руск'], icon: 'library' },
]

const findSubjectCatalogEntry = (name: string) => {
  const normalized = name.trim().toLowerCase()
  return subjectCatalog.find((entry) => entry.aliases.some((alias) => normalized.includes(alias))) ?? null
}

export const getSubjectCatalogKey = (name: string): SubjectCatalogKey => findSubjectCatalogEntry(name)?.key ?? 'unknown'

export const getSubjectIconKey = (name: string) => findSubjectCatalogEntry(name)?.icon ?? 'book'

export const getSubjectNameLanguage = (name: string): AppLanguage | 'unknown' => {
  const normalized = name.trim()

  if (/[А-Яа-я]/.test(normalized)) {
    return 'bg'
  }

  if (/[A-Za-z]/.test(normalized)) {
    return 'en'
  }

  return 'unknown'
}

export const filterSubjectsByLanguage = <T extends SubjectLike>(subjects: T[], language: AppLanguage) => {
  const grouped = new Map<string, T[]>()

  subjects.forEach((subject) => {
    const groupKey = `${getSubjectCatalogKey(subject.name)}::${subject.grade}::${subject.section}`
    const bucket = grouped.get(groupKey)

    if (bucket) {
      bucket.push(subject)
      return
    }

    grouped.set(groupKey, [subject])
  })

  return Array.from(grouped.values()).map((group) => {
    const directMatch = group.find((subject) => getSubjectNameLanguage(subject.name) === language)
    if (directMatch) {
      return directMatch
    }

    const unknownMatch = group.find((subject) => getSubjectNameLanguage(subject.name) === 'unknown')
    return unknownMatch ?? group[0]
  })
}

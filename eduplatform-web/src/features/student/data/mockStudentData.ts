export type DashboardStats = {
  completedTests: number
  averageScore: number
  lastTest: string
}

export type Lesson = {
  id: string
  subjectId: string
  title: string
  shortDescription: string
  content: string
}

export const dashboardStats: DashboardStats = {
  completedTests: 14,
  averageScore: 87,
  lastTest: 'Algebra Practice Test',
}

export const lessons: Lesson[] = [
  {
    id: 'lesson-1',
    subjectId: 'math',
    title: 'Linear Equations Basics',
    shortDescription: 'A practical introduction to solving simple linear equations.',
    content:
      'Linear equations are expressions where the highest power of the variable is one. To solve them, isolate the variable by performing inverse operations on both sides. Always keep the equation balanced and simplify step by step.',
  },
  {
    id: 'lesson-2',
    subjectId: 'programming',
    title: 'Understanding Loops',
    shortDescription: 'See how repetition works in everyday programming tasks.',
    content:
      'Loops help automate repetition. A for loop is useful when you know how many times you need to repeat an action, while a while loop is helpful when repetition depends on a condition. Always check for termination to avoid infinite loops.',
  },
  {
    id: 'lesson-3',
    subjectId: 'english',
    title: 'Writing Better Paragraphs',
    shortDescription: 'Improve structure, clarity, and transitions in your writing.',
    content:
      'A strong paragraph starts with a clear topic sentence, develops the idea with details, and ends with a smooth transition or concluding thought. Aim for clarity, logical order, and precise vocabulary.',
  },
]

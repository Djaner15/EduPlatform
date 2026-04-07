import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppTheme = 'light' | 'dark'
export type AppLanguage = 'en' | 'bg'

type TranslationValue = string | ((params?: Record<string, string | number>) => string)

type AppSettingsContextValue = {
  theme: AppTheme
  language: AppLanguage
  setTheme: (theme: AppTheme) => void
  setLanguage: (language: AppLanguage) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const THEME_KEY = 'eduplatformTheme'
const LANGUAGE_KEY = 'eduplatformLanguage'

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

const translations: Record<AppLanguage, Record<string, TranslationValue>> = {
  en: {
    appName: 'EduPlatform',
    dashboard: 'Dashboard',
    overview: 'Overview',
    users: 'Users',
    subjects: 'Subjects',
    lessons: 'Lessons',
    tests: 'Tests',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    adminBoard: 'Admin Board',
    teacherStudio: 'Teacher Studio',
    studentHub: 'Student Hub',
    signedInAs: 'Signed in as {username}',
    adminSubtitle: 'Administrator control center',
    teacherSubtitle: 'Teacher content workspace',
    studentSubtitle: 'Student learning space',
    siteDescription: 'Online learning platform',
    privacyPolicy: 'Privacy Policy',
    contact: 'Contact',
    copyright: '© {year} EduPlatform. All rights reserved.',
    administratorDashboard: 'Administrator Dashboard',
    teacherDashboard: 'Teacher Dashboard',
    userManagement: 'User Management',
    subjectManagement: 'Subject Management',
    lessonManagement: 'Lesson Management',
    testManagement: 'Test Management',
    lessonDetails: 'Lesson Details',
    testSession: 'Test Session',
    accountSettings: 'Account Settings',
    reviewRegistrations: 'Review registrations',
    manageStudentsDescription:
      'Manage students, approve registrations, and keep lessons and tests up to date for Mathematics High School Academic Kiril Popov.',
    loadingStatistics: 'Loading statistics...',
    failedAdminStatistics: 'Failed to load admin statistics.',
    totalUsers: 'Total users',
    totalTests: 'Total tests',
    submittedResults: 'Submitted results',
    averageScore: 'Average score',
    teacherOverview: 'Teacher overview',
    createLessons: 'Create lessons',
    teacherWorkspaceDescription:
      'Create subjects, lessons, and tests in your personal teaching workspace.',
    welcomeRole: 'Welcome, {username}',
    mySubjects: 'My subjects',
    myLessons: 'My lessons',
    myTests: 'My tests',
    failedTeacherStatistics: 'Failed to load teacher workspace statistics.',
    roleLogic: 'Role logic',
    roleLogicTitle: 'Own your content, teach with confidence',
    roleLogicDescription:
      'Teachers can create subjects, lessons, and tests, then edit or delete only the content they created. Administrators keep full moderation rights across the platform, while students focus on learning and assessment.',
    continueLearning: 'Continue learning',
    studentOverviewDescription:
      'Track your recent performance, continue lessons, and keep your learning momentum strong.',
    helloUser: 'Hello, {username}',
    completedTests: 'Completed tests',
    completedTestsHelper: 'Finished successfully this month',
    averageScoreHelper: 'Average across recent assessments',
    lastTest: 'Last test',
    lastTestHelper: 'Most recent assessment completed',
    progressFocus: 'Progress focus',
    stayOnTrackTitle: 'Stay on track with your next learning goal',
    stayOnTrackDescription:
      'You are performing consistently well. Continue with lessons and tests to maintain your average score and strengthen your subject confidence.',
    weeklyGoal: 'Weekly goal',
    weeklyGoalDescription:
      'Two more completed activities will push you past this week’s target.',
    schoolInformation: 'School information',
    schoolName: 'Mathematics High School "Academic Kiril Popov"',
    schoolPortalDescription:
      'Welcome to the approved student portal of Mathematics High School "Academic Kiril Popov". Here you can access learning materials, complete lessons and tests, and follow your progress in a structured academic environment.',
    interfacePreferences: 'Interface preferences',
    interfacePreferencesDescription:
      'Choose the language and visual theme that feel best for your daily work.',
    platformLanguage: 'Platform language',
    platformLanguageDescription:
      'This preference is saved on this device for your next visit.',
    themeMode: 'Theme mode',
    themeModeDescription:
      'Switch between a bright workspace and a darker evening view.',
    light: 'Light',
    dark: 'Dark',
    changePassword: 'Change password',
    changePasswordDescription:
      'Keep your account secure with a strong password that only you know.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    passwordRuleShort:
      'Use at least 8 characters with uppercase, lowercase, number, and symbol.',
    updatePassword: 'Update password',
    savingPassword: 'Saving password...',
    profileImage: 'Profile image',
    profileImageDescription:
      'Upload a personal image for this device. You can change it anytime.',
    uploadImage: 'Upload image',
    changeImage: 'Change image',
    remove: 'Remove',
    roleAccess: 'Role access',
    adminSettingsDescription:
      'Administrator settings stay intentionally minimal here, with account preferences and security only.',
    teacherSettingsDescription:
      'Teacher settings currently focus on your account and workspace preferences. More teaching-specific options can be added later.',
    studentSettingsDescription:
      'Student settings focus on your personal preferences, theme, language, and password security.',
    accountSettingsDescriptionAdmin:
      'Account preferences and security controls for your administrator access.',
    accountSettingsDescriptionTeacher:
      'Update your teaching workspace preferences, account security, and profile details.',
    accountSettingsDescriptionStudent:
      'Manage your learning preferences, account security, and personal profile details.',
  },
  bg: {
    appName: 'EduPlatform',
    dashboard: 'Табло',
    overview: 'Преглед',
    users: 'Потребители',
    subjects: 'Предмети',
    lessons: 'Уроци',
    tests: 'Тестове',
    profile: 'Профил',
    settings: 'Настройки',
    logout: 'Изход',
    adminBoard: 'Админ панел',
    teacherStudio: 'Учителско студио',
    studentHub: 'Учебен център',
    signedInAs: 'Влезли сте като {username}',
    adminSubtitle: 'Административен контролен център',
    teacherSubtitle: 'Учителско работно пространство',
    studentSubtitle: 'Пространство за обучение',
    siteDescription: 'Онлайн платформа за обучение',
    privacyPolicy: 'Политика за поверителност',
    contact: 'Контакт',
    copyright: '© {year} EduPlatform. Всички права запазени.',
    administratorDashboard: 'Администраторско табло',
    teacherDashboard: 'Учителско табло',
    userManagement: 'Управление на потребители',
    subjectManagement: 'Управление на предмети',
    lessonManagement: 'Управление на уроци',
    testManagement: 'Управление на тестове',
    lessonDetails: 'Детайли за урок',
    testSession: 'Тестова сесия',
    accountSettings: 'Настройки на акаунта',
    reviewRegistrations: 'Преглед на регистрации',
    manageStudentsDescription:
      'Управлявайте ученици, одобрявайте регистрации и поддържайте уроците и тестовете актуални за Математическа гимназия Академик Кирил Попов.',
    loadingStatistics: 'Зареждане на статистика...',
    failedAdminStatistics: 'Статистиката за администратора не можа да се зареди.',
    totalUsers: 'Общо потребители',
    totalTests: 'Общо тестове',
    submittedResults: 'Предадени резултати',
    averageScore: 'Среден резултат',
    teacherOverview: 'Учителски преглед',
    createLessons: 'Създай уроци',
    teacherWorkspaceDescription:
      'Създавайте предмети, уроци и тестове във вашето лично учителско пространство.',
    welcomeRole: 'Добре дошли, {username}',
    mySubjects: 'Моите предмети',
    myLessons: 'Моите уроци',
    myTests: 'Моите тестове',
    failedTeacherStatistics: 'Статистиката за учителското пространство не можа да се зареди.',
    roleLogic: 'Ролева логика',
    roleLogicTitle: 'Създавайте съдържание уверено',
    roleLogicDescription:
      'Учителите могат да създават предмети, уроци и тестове, след което да редактират или изтриват само собственото си съдържание. Администраторите запазват пълни права за модерация, а учениците се фокусират върху обучението и оценяването.',
    continueLearning: 'Продължи обучението',
    studentOverviewDescription:
      'Проследявайте последното си представяне, продължавайте уроците и поддържайте учебния си ритъм.',
    helloUser: 'Здравей, {username}',
    completedTests: 'Завършени тестове',
    completedTestsHelper: 'Успешно завършени този месец',
    averageScoreHelper: 'Среден резултат от последните оценявания',
    lastTest: 'Последен тест',
    lastTestHelper: 'Най-скоро завършено оценяване',
    progressFocus: 'Фокус върху напредъка',
    stayOnTrackTitle: 'Останете на път към следващата си цел',
    stayOnTrackDescription:
      'Представяте се стабилно добре. Продължавайте с уроците и тестовете, за да запазите средния си резултат и да затвърдите увереността си по предметите.',
    weeklyGoal: 'Седмична цел',
    weeklyGoalDescription:
      'Още две завършени активности ще ви изведат над целта за тази седмица.',
    schoolInformation: 'Информация за училището',
    schoolName: 'Математическа гимназия "Академик Кирил Попов"',
    schoolPortalDescription:
      'Добре дошли в одобрения ученически портал на Математическа гимназия "Академик Кирил Попов". Тук можете да достъпвате учебни материали, да решавате уроци и тестове и да следите напредъка си в структурирана академична среда.',
    interfacePreferences: 'Настройки на интерфейса',
    interfacePreferencesDescription:
      'Изберете езика и визуалната тема, които са най-удобни за ежедневната ви работа.',
    platformLanguage: 'Език на платформата',
    platformLanguageDescription:
      'Тази настройка се запазва на това устройство за следващото ви посещение.',
    themeMode: 'Режим на тема',
    themeModeDescription:
      'Превключвайте между светло работно пространство и по-тъмна вечерна визия.',
    light: 'Светла',
    dark: 'Тъмна',
    changePassword: 'Смяна на парола',
    changePasswordDescription:
      'Поддържайте акаунта си защитен със силна парола, която знаете само вие.',
    currentPassword: 'Текуща парола',
    newPassword: 'Нова парола',
    confirmNewPassword: 'Потвърди новата парола',
    passwordRuleShort:
      'Използвайте поне 8 символа с главна, малка буква, число и специален знак.',
    updatePassword: 'Обнови паролата',
    savingPassword: 'Запазване на паролата...',
    profileImage: 'Профилна снимка',
    profileImageDescription:
      'Качете лична снимка за това устройство. Можете да я променяте по всяко време.',
    uploadImage: 'Качи снимка',
    changeImage: 'Смени снимката',
    remove: 'Премахни',
    roleAccess: 'Достъп по роля',
    adminSettingsDescription:
      'Администраторските настройки тук остават минимални и включват само предпочитания и сигурност.',
    teacherSettingsDescription:
      'Учителските настройки засега са фокусирани върху акаунта и предпочитанията на работното пространство. По-късно могат да се добавят още опции.',
    studentSettingsDescription:
      'Ученическите настройки се фокусират върху личните предпочитания, тема, език и сигурност на паролата.',
    accountSettingsDescriptionAdmin:
      'Предпочитания за акаунта и настройки за сигурност на администраторския достъп.',
    accountSettingsDescriptionTeacher:
      'Обновете предпочитанията на учителското си пространство, сигурността на акаунта и профилните си детайли.',
    accountSettingsDescriptionStudent:
      'Управлявайте учебните си предпочитания, сигурността на акаунта и личните профилни данни.',
  },
}

const readStoredTheme = (): AppTheme => {
  const storedTheme = localStorage.getItem(THEME_KEY)
  return storedTheme === 'dark' ? 'dark' : 'light'
}

const readStoredLanguage = (): AppLanguage => {
  const storedLanguage = localStorage.getItem(LANGUAGE_KEY)
  return storedLanguage === 'bg' ? 'bg' : 'en'
}

type AppSettingsProviderProps = {
  children: ReactNode
}

export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
  const [theme, setThemeState] = useState<AppTheme>('light')
  const [language, setLanguageState] = useState<AppLanguage>('en')

  useEffect(() => {
    setThemeState(readStoredTheme())
    setLanguageState(readStoredLanguage())
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.body.dataset.theme = theme
    document.body.classList.toggle('theme-dark', theme === 'dark')
    document.body.classList.toggle('theme-light', theme === 'light')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem(LANGUAGE_KEY, language)
  }, [language])

  const translate = (key: string, params?: Record<string, string | number>) => {
    const languageTranslations = translations[language]
    const entry = languageTranslations[key]

    if (!entry) {
      return key
    }

    if (typeof entry === 'function') {
      return entry(params)
    }

    if (!params) {
      return entry
    }

    return entry.replace(/\{(\w+)\}/g, (_match: string, token: string) => String(params[token] ?? ''))
  }

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      theme,
      language,
      setTheme: setThemeState,
      setLanguage: setLanguageState,
      t: translate,
    }),
    [language, theme],
  )

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)

  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider')
  }

  return context
}

export function useTranslation() {
  const { language, t } = useAppSettings()

  return {
    language,
    t,
  }
}

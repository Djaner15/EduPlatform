import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined'
import AutoStoriesOutlined from '@mui/icons-material/AutoStoriesOutlined'
import BiotechOutlined from '@mui/icons-material/BiotechOutlined'
import BoltOutlined from '@mui/icons-material/BoltOutlined'
import CalculateOutlined from '@mui/icons-material/CalculateOutlined'
import DnsOutlined from '@mui/icons-material/DnsOutlined'
import GTranslateOutlined from '@mui/icons-material/GTranslateOutlined'
import HistoryEduOutlined from '@mui/icons-material/HistoryEduOutlined'
import LanguageOutlined from '@mui/icons-material/LanguageOutlined'
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined'
import PsychologyAltOutlined from '@mui/icons-material/PsychologyAltOutlined'
import PublicOutlined from '@mui/icons-material/PublicOutlined'
import ScienceOutlined from '@mui/icons-material/ScienceOutlined'
import type { SvgIconComponent } from '@mui/icons-material'
import { getSubjectIconKey } from '../subjectCatalog'

type SubjectIconProps = {
  subjectName: string
  size?: 'card' | 'compact'
}

const subjectIconMap: Record<string, SvgIconComponent> = {
  calculate: CalculateOutlined,
  computer: DnsOutlined,
  science: ScienceOutlined,
  biotech: BiotechOutlined,
  bolt: BoltOutlined,
  public: PublicOutlined,
  history: HistoryEduOutlined,
  psychology: PsychologyAltOutlined,
  balance: AccountBalanceOutlined,
  translate: GTranslateOutlined,
  language: LanguageOutlined,
  menu_book: MenuBookOutlined,
  library: AutoStoriesOutlined,
  book: MenuBookOutlined,
  unknown: MenuBookOutlined,
}

const sizeClasses = {
  card: {
    shell: 'h-[4.5rem] w-[4.5rem] rounded-[1.4rem]',
    iconFontSize: '2.1rem',
  },
  compact: {
    shell: 'h-12 w-12 rounded-2xl',
    iconFontSize: '1.45rem',
  },
} as const

export function SubjectIcon({ subjectName, size = 'card' }: SubjectIconProps) {
  const SubjectGlyph = subjectIconMap[getSubjectIconKey(subjectName)] ?? MenuBookOutlined
  const classes = sizeClasses[size]

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-sky-50/55 text-[#2468a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_16px_30px_rgba(36,104,160,0.08)] ${classes.shell}`}
    >
      <SubjectGlyph sx={{ fontSize: classes.iconFontSize, color: '#2468a0' }} />
    </div>
  )
}

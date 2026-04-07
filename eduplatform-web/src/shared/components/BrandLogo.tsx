type BrandLogoProps = {
  subtitle?: string
  title?: string
  size?: 'auth' | 'sidebar' | 'header'
  showCopy?: boolean
  variant?: 'photo' | 'transparent'
}

export function BrandLogo({
  subtitle = 'Smart learning journey',
  title = 'EduPlatform',
  size = 'sidebar',
  showCopy = true,
  variant = 'photo',
}: BrandLogoProps) {
  const isAuth = size === 'auth'
  const isHeader = size === 'header'
  const imageSrc = variant === 'transparent' ? '/dolphin-logo.png' : '/edudolphin.jpg'

  return (
    <div
      className={`brand-logo brand-logo-${variant} ${
        isAuth ? 'brand-logo-auth' : isHeader ? 'brand-logo-header' : 'brand-logo-sidebar'
      }`}
    >
      <div className="brand-logo-mark">
        <img alt="EduPlatform dolphin logo" className="brand-logo-image" src={imageSrc} />
      </div>
      {showCopy ? (
        <div className="brand-logo-copy">
          <span className="brand-logo-title">{title}</span>
          <span className="brand-logo-subtitle">{subtitle}</span>
        </div>
      ) : null}
    </div>
  )
}

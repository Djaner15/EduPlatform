import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ElementType, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'sm' | 'md'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode
  as?: ElementType
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  to?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[rgba(var(--primary-rgb),0.62)] bg-[linear-gradient(135deg,var(--primary-color)_0%,var(--primary-deep)_100%)] text-white shadow-[0_8px_22px_rgba(var(--primary-rgb),0.24),inset_0_1px_0_rgba(255,255,255,0.16)] hover:brightness-[0.96] hover:shadow-[0_10px_24px_rgba(var(--primary-rgb),0.28)]',
  secondary:
    'border border-sky-200 bg-white/90 text-[#2468a0] shadow-[0_6px_16px_rgba(36,104,160,0.10)] hover:border-sky-300 hover:bg-sky-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-w-[8.75rem] px-5 py-3 text-sm',
  md: 'px-5 py-3 text-base',
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-2xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        fullWidth ? 'w-full' : 'w-fit max-w-full',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}

export function ButtonLink({
  as,
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props
}: ButtonLinkProps) {
  const Component = as ?? 'a'

  return (
    <Component
      className={[
        'inline-flex shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-2xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        fullWidth ? 'w-full' : 'w-fit max-w-full',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}

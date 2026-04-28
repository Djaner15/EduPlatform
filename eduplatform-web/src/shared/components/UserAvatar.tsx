import Avatar from '@mui/material/Avatar'
import { resolveApiAssetUrl } from '../api/axiosInstance'

export const getUserInitials = (fullName?: string | null, username?: string | null) => {
  const source = (fullName?.trim() || username?.trim() || 'U').split(/\s+/).filter(Boolean)
  return source
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export const getUserAvatarSrc = (fullName?: string | null, username?: string | null, imageUrl?: string | null, size = 32) => {
  if (imageUrl?.trim()) {
    return resolveApiAssetUrl(imageUrl)
  }

  const displayName = fullName?.trim() || username?.trim() || 'User'
  const encodedName = encodeURIComponent(displayName)
  return `https://ui-avatars.com/api/?name=${encodedName}&background=dbeafe&color=123d5b&bold=true&size=${Math.max(
    size * 2,
    64,
  )}`
}

type UserAvatarProps = {
  fullName?: string | null
  username?: string | null
  imageUrl?: string | null
  size?: number
}

export function UserAvatar({ fullName, username, imageUrl, size = 32 }: UserAvatarProps) {
  return (
    <Avatar
      src={getUserAvatarSrc(fullName, username, imageUrl, size)}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        fontSize: `${Math.max(size * 0.42, 11)}px`,
        fontWeight: 700,
        color: '#123d5b',
        bgcolor: '#dbeafe',
        border: '1px solid rgba(191, 219, 254, 0.95)',
        boxShadow: '0 8px 18px rgba(36,104,160,0.12)',
      }}
      imgProps={{
        referrerPolicy: 'no-referrer',
      }}
    >
      {getUserInitials(fullName, username)}
    </Avatar>
  )
}

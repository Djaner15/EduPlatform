import TableSortLabel from '@mui/material/TableSortLabel'
import type { SortDirection } from '../tableSorting'

type AdminSortHeaderProps<T extends string> = {
  label: string
  column: T
  activeColumn: T
  direction: SortDirection
  onToggle: (column: T) => void
}

export function AdminSortHeader<T extends string>({
  label,
  column,
  activeColumn,
  direction,
  onToggle,
}: AdminSortHeaderProps<T>) {
  const isActive = activeColumn === column

  return (
    <TableSortLabel
      active={isActive}
      direction={isActive ? direction : 'desc'}
      className="admin-management-sort-label"
      hideSortIcon={false}
      onClick={() => onToggle(column)}
    >
      {label}
    </TableSortLabel>
  )
}

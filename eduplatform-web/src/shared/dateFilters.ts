export const isWithinDateRange = (
  value?: string | null,
  startDate?: string,
  endDate?: string,
) => {
  if (!startDate && !endDate) {
    return true
  }

  if (!value) {
    return false
  }

  const target = new Date(value)
  if (Number.isNaN(target.getTime())) {
    return false
  }

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    if (target < start) {
      return false
    }
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    if (target > end) {
      return false
    }
  }

  return true
}

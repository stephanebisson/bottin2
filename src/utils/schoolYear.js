// School year starts July 1 (summer prep counts as the new year)
export function getCurrentSchoolYear () {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

// School year starts July 1 (summer prep counts as the new year)
export function getCurrentSchoolYear () {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

// True if a Firestore Timestamp, Date or date string falls in the current school year
export function isInCurrentSchoolYear (value) {
  if (!value) {
    return false
  }
  const ts = value.toMillis ? value.toMillis() : new Date(value).getTime()
  const startYear = Number.parseInt(getCurrentSchoolYear().split('-', 1)[0])
  return ts >= new Date(startYear, 6, 1).getTime()
}

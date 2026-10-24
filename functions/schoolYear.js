// School year starts July 1 (summer prep counts as the new year)
function getCurrentSchoolYear () {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

// Last day to submit the annual update, in the fall of each school year.
// Emailed update links stop working after it.
const UPDATE_DEADLINE = { month: 10, day: 31 }

// The deadline ends at midnight in Montreal (America/Montreal is an alias of America/Toronto)
const SCHOOL_TIME_ZONE = 'America/Toronto'

/**
 * Annual update deadline of a school year, as YYYY-MM-DD
 * @param {string} schoolYear - e.g. "2026-2027"
 */
function getUpdateDeadline (schoolYear) {
  const startYear = schoolYear.split('-', 1)[0]
  const pad = number => String(number).padStart(2, '0')
  return `${startYear}-${pad(UPDATE_DEADLINE.month)}-${pad(UPDATE_DEADLINE.day)}`
}

/**
 * The deadline as written in the emails, e.g. "31 octobre"
 * @param {string} schoolYear - e.g. "2026-2027"
 */
function formatUpdateDeadline (schoolYear) {
  return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${getUpdateDeadline(schoolYear)}T00:00:00Z`))
}

/**
 * Whether the deadline has passed: true from midnight after the deadline day, Montreal time
 * @param {string} schoolYear - e.g. "2026-2027"
 * @param {Date} [now]
 */
function isPastUpdateDeadline (schoolYear, now = new Date()) {
  // en-CA writes dates as YYYY-MM-DD, so the strings compare in date order
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIME_ZONE }).format(now)
  return today > getUpdateDeadline(schoolYear)
}

module.exports = { getCurrentSchoolYear, getUpdateDeadline, formatUpdateDeadline, isPastUpdateDeadline }

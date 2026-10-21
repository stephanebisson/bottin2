/**
 * Entity and action styles
 *
 * One icon and one theme color per entity, and one color per logged action,
 * so the same thing looks the same on every page.
 */

export const ENTITY_STYLES = {
  class: { icon: 'mdi-school', color: 'primary' },
  family: { icon: 'mdi-book-account', color: 'secondary' },
  staff: { icon: 'mdi-account-tie', color: 'staff' },
  committee: { icon: 'mdi-account-group', color: 'accent' },
  feve: { icon: 'mdi-leaf', color: 'feve' },
  interests: { icon: 'mdi-heart', color: 'secondary' },
  games: { icon: 'mdi-gamepad-variant', color: 'secondary' },
  school: { icon: 'mdi-domain', color: 'school' },
  sdg: { icon: 'mdi-weather-sunny', color: 'sdg' },
}

/**
 * Chip color for each /actionLogs actionType
 */
export const ACTION_COLORS = {
  send_update_email: 'info',
  opt_out_parent: 'warning',
  remove_parent: 'error',
  progress_student: 'success',
  graduate_student: 'secondary',
  depart_student: 'error',
  assign_class: 'primary',
}

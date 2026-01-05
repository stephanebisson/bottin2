import { useI18n } from 'vue-banana-i18n'

/**
 * Normalize role string for i18n key lookup
 * Converts to lowercase and removes accents
 *
 * @param {string} role - The role string from database
 * @returns {string} Normalized role string (lowercase, no accents)
 *
 * @example
 * normalizeRoleForI18n('Président') // 'president'
 * normalizeRoleForI18n('Secrétaire') // 'secretaire'
 * normalizeRoleForI18n('Vice-président') // 'vice-president'
 */
function normalizeRoleForI18n (role) {
  if (!role) {return ''}

  return role
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '') // Remove diacritics/accents
}

/**
 * Get display text for a committee role
 * Checks if an i18n translation exists for the normalized role key.
 * If found, uses the translation (with plural support).
 * If not found, returns the original role string from database.
 *
 * @param {string} role - The role string from database
 * @param {number} count - Number of members with this role (for plural support)
 * @returns {string} Translated role or original string if no translation exists
 *
 * @example
 * // With i18n key "committeeRoles.president": "{{PLURAL:$1|Président|Présidents}}"
 * getRoleDisplay('Président', 1) // 'Président'
 * getRoleDisplay('Président', 3) // 'Présidents'
 *
 * // Without i18n key (fallback to original)
 * getRoleDisplay('Membre', 1) // 'Membre'
 * getRoleDisplay('SDG', 2) // 'SDG'
 */
export function getRoleDisplay (role, count = 1) {
  if (!role) {return ''}

  const normalizedKey = normalizeRoleForI18n(role)
  const key = `committeeRoles.${normalizedKey}`

  const bananaI18n = useI18n()

  // Try to get translation
  const translated = bananaI18n.i18n(key, count)

  // If translation is not found, banana-i18n returns the key itself
  // In that case, return the original role string from database
  if (translated === key) {
    return role
  }

  return translated
}

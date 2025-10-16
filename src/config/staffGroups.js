/**
 * Configuration for staff group and subgroup mappings
 * Defines which subgroups are valid for each group
 */

/**
 * Valid staff groups
 */
export const STAFF_GROUPS = ['EF', 'SDG']

/**
 * Mapping of groups to their valid subgroups
 */
export const GROUP_SUBGROUP_MAPPING = {
  EF: ['admin', 'teacher', 'specialist'],
  SDG: ['resp', 'edu'],
}

/**
 * French display names for groups
 */
export const GROUP_DISPLAY_NAMES = {
  EF: 'Personnel de l\'Étoile filante',
  SDG: 'Service de garde',
}

/**
 * French display names for subgroups
 */
export const SUBGROUP_DISPLAY_NAMES = {
  admin: 'Administration et personnel de soutien',
  teacher: 'Personnel enseignant',
  specialist: 'Spécialistes',
  resp: 'Responsables',
  edu: 'Éducateurs et surveillants',
}

/**
 * Get valid subgroups for a given group
 * @param {string} group - The staff group (EF, SDG)
 * @returns {string[]} Array of valid subgroups for the group
 */
export function getValidSubgroupsForGroup (group) {
  if (!group || typeof group !== 'string') {
    return []
  }

  return GROUP_SUBGROUP_MAPPING[group] || []
}

/**
 * Check if a subgroup is valid for a given group
 * @param {string} group - The staff group
 * @param {string} subgroup - The subgroup to check
 * @returns {boolean} True if the subgroup is valid for the group
 */
export function isSubgroupValidForGroup (group, subgroup) {
  const validSubgroups = getValidSubgroupsForGroup(group)
  return validSubgroups.includes(subgroup)
}

/**
 * Get all groups that support a given subgroup
 * @param {string} subgroup - The subgroup to check
 * @returns {string[]} Array of groups that support this subgroup
 */
export function getGroupsForSubgroup (subgroup) {
  const groups = []
  for (const [group, validSubgroups] of Object.entries(GROUP_SUBGROUP_MAPPING)) {
    if (validSubgroups.includes(subgroup)) {
      groups.push(group)
    }
  }
  return groups
}

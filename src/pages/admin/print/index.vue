<template>
  <div v-if="loading" class="loading">
    <div class="loading-content">
      <p>Chargement des données du bottin…</p>
    </div>
  </div>

  <div v-else class="print-directory">
    <!-- Title Page -->
    <TitlePage />

    <!-- Table of Contents -->
    <TableOfContents />

    <!-- Staff Sections -->
    <StaffSection
      v-for="group in groupedStaff"
      :key="group.group"
      :group="group"
      :school-phone="schoolPhone"
      :sdg-phone="sdgPhone"
    />

    <!-- Conseil d'établissement -->
    <CommitteeFullPage
      v-if="conseilEtablissement"
      :committee="conseilEtablissement"
      :parent-role-groups="groupMembersByRole(conseilEtablissement.parentMembers, conseilEtablissement.name)"
      section-id="section-committees"
      :staff-role-groups="groupMembersByRole(conseilEtablissement.staffMembers, conseilEtablissement.name)"
      title="Conseil d'établissement"
    />

    <!-- Fondation -->
    <CommitteeFullPage
      v-if="fondation"
      :all-role-groups="groupMembersByRole(fondation.enrichedMembers, fondation.name)"
      :committee="fondation"
      section-id="section-fondation"
      title="Fondation de l'école Étoile filante"
    />

    <!-- Comités, by category -->
    <CommitteesPages :categories="committeeCategories" />

    <!-- CSSDM & REPAQ -->
    <CssdmPage :comite-parents="getCommitteesByNames(['Comité des parents CSSDM'])" :repaq="getCommitteesByNames(['REPAQ'])" :role-groups-map="committeeRoleGroupsMap" />

    <!-- Classes Pages -->
    <ClassesPage :classes-data="getClassesData([1, 2])" :feves-student-ids="fevesStudentIds" level-badge="1<sup>re</sup>-2<sup>e</sup>" section-id="section-classes" />
    <ClassesPage :classes-data="getClassesData([3, 4])" :feves-student-ids="fevesStudentIds" level-badge="3<sup>e</sup>-4<sup>e</sup>" section-id="section-classes-34" />
    <ClassesPage :classes-data="getClassesData([5, 6])" :feves-student-ids="fevesStudentIds" level-badge="5<sup>e</sup>-6<sup>e</sup>" section-id="section-classes-56" />

    <!-- Families Pages -->
    <FamiliesPages :families="familiesWithTeachers" />

    <!-- Parents Alphabetical List -->
    <ParentsListPages :parents="parentsWithChildren" />

    <!-- Référentiel -->
    <Referentiel />

    <!-- Implication -->
    <Implication />

    <!-- FAQ (2 pages) -->
    <FAQ1 />
    <FAQ2 />

    <!-- Schedule -->
    <Schedule />

    <!-- Back Page -->
    <BackPage />
  </div>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { FEVES_COMMITTEE_ID, getCommitteeRoleDisplayOrder } from '@/config/committees'
  import { SCHOOL_LOCATION } from '@/config/school'
  import { SDG_INFO } from '@/config/sdg'
  import { GROUP_DISPLAY_NAMES, GROUP_SUBGROUP_MAPPING, STAFF_GROUPS, SUBGROUP_DISPLAY_NAMES } from '@/config/staffGroups'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'
  import BackPage from './BackPage.vue'
  import ClassesPage from './ClassesPage.vue'
  import CommitteeFullPage from './CommitteeFullPage.vue'
  import CommitteesPages from './CommitteesPages.vue'
  import CssdmPage from './CssdmPage.vue'
  import FamiliesPages from './FamiliesPages.vue'
  import FAQ1 from './FAQ1.vue'
  import FAQ2 from './FAQ2.vue'
  import Implication from './Implication.vue'
  import ParentsListPages from './ParentsListPages.vue'
  import Referentiel from './Referentiel.vue'
  import Schedule from './Schedule.vue'
  import StaffSection from './StaffSection.vue'
  import TableOfContents from './TableOfContents.vue'
  import TitlePage from './TitlePage.vue'

  // Store references
  const firebaseStore = useFirebaseDataStore()

  // State
  const loading = ref(true)

  // Parents as the booklet shows them: no phone, email or address until the
  // parent confirms them with the update form, like the online directory
  const printableParents = computed(() =>
    firebaseStore.parentsDTO.map(parent => parent.hasConfirmed ? parent : parent.withoutContactInfo()),
  )

  // Staff grouping (hierarchical: groups contain subgroups)
  const groupedStaff = computed(() => {
    const hierarchicalGroups = []

    // Process each group in the defined order (EF, SDG)
    for (const group of STAFF_GROUPS) {
      const subgroups = GROUP_SUBGROUP_MAPPING[group]
      const groupSubgroups = []

      // Process each subgroup in order
      for (const subgroup of subgroups) {
        // Find staff members for this group/subgroup combination
        const members = firebaseStore.staffDTO.filter(member =>
          member.group === group && member.subgroup === subgroup,
        )

        if (members.length > 0) {
          // Sort members by order field, then alphabetically by last name, first name
          // Exception: 'edu' subgroup is sorted by title
          const sortedMembers = members.toSorted((a, b) => {
            // Special case for 'edu' subgroup: sort by title
            if (subgroup === 'edu') {
              const titleA = (a.title || '').toLowerCase()
              const titleB = (b.title || '').toLowerCase()
              return titleA.localeCompare(titleB)
            }

            // Primary sort: by order field
            const orderA = a.order || 99
            const orderB = b.order || 99
            if (orderA !== orderB) {
              return orderA - orderB
            }
            // Secondary sort: alphabetically by name
            const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
            const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
            return nameA.localeCompare(nameB)
          })

          groupSubgroups.push({
            subgroup,
            name: SUBGROUP_DISPLAY_NAMES[subgroup] || subgroup,
            members: sortedMembers,
          })
        }
      }

      // Only add group if it has subgroups with members
      if (groupSubgroups.length > 0) {
        hierarchicalGroups.push({
          group,
          name: GROUP_DISPLAY_NAMES[group] || group,
          subgroups: groupSubgroups,
        })
      }
    }

    // Add staff without group/subgroup at the end
    const ungroupedMembers = firebaseStore.staffDTO.filter(member =>
      !member.group || !member.subgroup,
    )

    if (ungroupedMembers.length > 0) {
      hierarchicalGroups.push({
        group: null,
        name: 'Autre Personnel',
        subgroups: [{
          subgroup: null,
          name: 'Autre Personnel',
          members: ungroupedMembers.toSorted((a, b) => {
            const orderA = a.order || 99
            const orderB = b.order || 99
            if (orderA !== orderB) {
              return orderA - orderB
            }
            const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
            const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
            return nameA.localeCompare(nameB)
          }),
        }],
      })
    }

    return hierarchicalGroups
  })

  // Committees with enriched member information
  const MEMBER_TYPE_ORDER = ['parent', 'staff', 'student', 'unknown']
  const enrichedCommittees = computed(() => {
    return firebaseStore.committeesDTO.map(committee => {
      // Enrich members with full information from parents and staff
      const enrichedMembers = committee.members
        .map(member => {
          // Look up by memberId (parent/staff document ID)
          switch (member.member_type) {
            case 'parent': {
              const parentMatch = printableParents.value.find(p => p.id === member.memberId)
              if (parentMatch) {
                return {
                  ...member,
                  email: parentMatch.email,
                  fullName: parentMatch.fullName,
                  phone: parentMatch.phone,
                  memberType: 'parent',
                  isPorteParole: member.role?.toLowerCase() === 'porte-parole',
                }
              }

              break
            }
            case 'staff': {
              const staffMatch = firebaseStore.staffDTO.find(s => s.id === member.memberId)
              if (staffMatch) {
                return {
                  ...member,
                  email: staffMatch.email,
                  fullName: staffMatch.fullName,
                  phone: staffMatch.phone,
                  memberType: 'staff',
                  isPorteParole: member.role?.toLowerCase() === 'porte-parole',
                }
              }

              break
            }
            case 'student': {
              const studentMatch = firebaseStore.studentsDTO.find(s => s.id === member.memberId)
              if (studentMatch) {
                return {
                  ...member,
                  email: null,
                  fullName: `${studentMatch.first_name} ${studentMatch.last_name}`,
                  phone: null,
                  memberType: 'student',
                  isPorteParole: false,
                }
              }

              break
            }
          // No default
          }

          // If not found in any collection
          return {
            ...member,
            email: null,
            fullName: `[${member.memberId}]`,
            phone: null,
            memberType: 'unknown',
            isPorteParole: member.role?.toLowerCase() === 'porte-parole',
          }
        })
        .toSorted((a, b) => {
          // First sort by member type (parents, then staff, then students, unknown last)
          if (a.memberType !== b.memberType) {
            return MEMBER_TYPE_ORDER.indexOf(a.memberType) - MEMBER_TYPE_ORDER.indexOf(b.memberType)
          }
          // Then sort by name within the same member type
          return a.fullName.localeCompare(b.fullName)
        })

      // Separate members by type
      const parentMembers = enrichedMembers.filter(member => member.memberType === 'parent')
      const staffMembers = enrichedMembers.filter(member => member.memberType === 'staff')
      const studentMembers = enrichedMembers.filter(member => member.memberType === 'student')
      const unknownMembers = enrichedMembers.filter(member => member.memberType === 'unknown')

      return {
        ...committee,
        enrichedMembers,
        parentMembers,
        staffMembers,
        studentMembers,
        unknownMembers,
      }
    }).toSorted((a, b) => a.name.localeCompare(b.name))
  })

  // Conseil d'établissement (special treatment - full page)
  const conseilEtablissement = computed(() => {
    return enrichedCommittees.value.find(c => c.name === 'Conseil d\'établissement') || null
  })

  // Fondation (special treatment - full page)
  const fondation = computed(() => {
    return enrichedCommittees.value.find(c => c.name === 'Fondation') || null
  })

  // Helper: Get committees by names
  function getCommitteesByNames (names) {
    return enrichedCommittees.value.filter(c => names.includes(c.name))
  }

  // Helper: Filter committee members (exclude 'Bénévole' role for specific committees)
  function filterCommitteeMembers (committee) {
    if (committee.name === 'Ateliers' || committee.name === 'Bibliothèque') {
      return committee.enrichedMembers.filter(member => member.role !== 'Bénévole')
    }
    return committee.enrichedMembers
  }

  // Comités pages: categories in print order, each committee with the members to list
  const committeeCategories = computed(() => [
    { title: 'En lien avec le projet éducatif', names: ['Admissions', 'CAMPÉR'] },
    { title: 'Communications', names: ['Bottin', 'Groupe Facebook', 'OPP'] },
    { title: 'Activités à l\'école', names: ['Ateliers', 'Bazar', 'Bibliothèque'] },
    { title: null, names: ['JEDI', 'Feves', 'Comité des usagers SDG'] },
  ].map(({ title, names }) => ({
    title,
    committees: getCommitteesByNames(names).map(committee => ({
      committee,
      members: filterCommitteeMembers(committee),
    })),
  })))

  // Helper: Group members by role
  function groupMembersByRole (members, committeeName = null) {
    // Group members by role
    const grouped = members.reduce((acc, member) => {
      const role = member.role || ''
      if (!acc[role]) {
        acc[role] = []
      }
      acc[role].push(member)
      return acc
    }, {})

    // Get display order for this committee if available
    const displayOrder = committeeName ? getCommitteeRoleDisplayOrder(committeeName) : null

    let sortedRoles
    if (displayOrder) {
      // Sort roles according to the specified display order
      const roleKeys = Object.keys(grouped)
      const orderedRoles = []
      const unorderedRoles = []

      // First, add roles that are in the display order
      for (const role of displayOrder) {
        if (roleKeys.includes(role)) {
          orderedRoles.push(role)
        }
      }

      // Then, add any remaining roles alphabetically
      for (const role of roleKeys) {
        if (!displayOrder.includes(role)) {
          unorderedRoles.push(role)
        }
      }
      unorderedRoles.sort()

      sortedRoles = [...orderedRoles, ...unorderedRoles]
    } else {
      // Default: sort alphabetically
      sortedRoles = Object.keys(grouped).toSorted()
    }

    // Convert to array
    return sortedRoles.map(role => ({
      role,
      members: grouped[role],
    }))
  }

  // Create a map of committee role groups for passing to child components
  const committeeRoleGroupsMap = computed(() => {
    const map = {}
    for (const committee of enrichedCommittees.value) {
      map[committee.id] = groupMembersByRole(committee.enrichedMembers, committee.name)
    }
    return map
  })

  // Students on the fèves committee, shown with a leaf in the class lists (like the app's class view)
  const fevesStudentIds = computed(() => {
    const feves = firebaseStore.committeesDTO.find(c => c.id === FEVES_COMMITTEE_ID)
    return new Set(feves ? feves.studentMembers.map(m => m.memberId) : [])
  })

  // Helper: Get teacher name
  function getTeacherName (teacherId) {
    const teacher = firebaseStore.staffDTO.find(s => s.id === teacherId)
    return teacher ? teacher.fullName : teacherId
  }

  // Helper: Get parent data for rep
  function getParentRepData (parentId) {
    const parent = printableParents.value.find(p => p.id === parentId)
    return parent ? { name: parent.fullName, phone: parent.phone, email: parent.email } : null
  }

  // Helper: Get students by level for a class
  function getStudentsByLevel (classLetter) {
    const classStudents = firebaseStore.studentsDTO.filter(student => student.className === classLetter)

    // Group students by level
    const grouped = classStudents.reduce((acc, student) => {
      const level = student.level ? String(student.level) : 'Unknown'
      if (!acc[level]) {
        acc[level] = []
      }
      acc[level].push(student)
      return acc
    }, {})

    // Sort each level's students by name
    for (const level of Object.keys(grouped)) {
      grouped[level].sort((a, b) => {
        return a.last_name.localeCompare(b.last_name)
      })
    }

    // Convert to array and sort by level number
    const sortedLevels = Object.keys(grouped)
      .filter(level => level !== 'Unknown')
      .toSorted((a, b) => Number.parseInt(a) - Number.parseInt(b))
      .map(level => ({
        level,
        students: grouped[level],
      }))

    // Add Unknown level at the end if it exists
    if (grouped['Unknown']) {
      sortedLevels.push({
        level: 'Unknown',
        students: grouped['Unknown'],
      })
    }

    return sortedLevels
  }

  // Helper: Get classes data for a level range
  function getClassesData (levels) {
    const classes = firebaseStore.classes.filter(classItem => {
      // Get students in this class to determine levels
      const students = firebaseStore.studentsDTO.filter(s => s.className === classItem.classLetter)
      // Check if any student in this class has a level in the specified range
      return students.some(s => levels.includes(Number(s.level)))
    })

    return classes.map(classItem => ({
      classItem,
      teacherName: classItem.teacher ? getTeacherName(classItem.teacher) : '',
      rep1: classItem.parent_rep_1 ? getParentRepData(classItem.parent_rep_1) : null,
      rep2: classItem.parent_rep_2 ? getParentRepData(classItem.parent_rep_2) : null,
      studentsByGrade: getStudentsByLevel(classItem.classLetter),
    }))
  }

  // Family grouping (students grouped by siblings)
  const groupedFamilies = computed(() => {
    const processed = new Set()
    const groups = []

    const sortedStudents = [...firebaseStore.studentsDTO].toSorted((a, b) => {
      const aName = `${a.last_name}, ${a.first_name}`.toLowerCase()
      const bName = `${b.last_name}, ${b.first_name}`.toLowerCase()
      return aName.localeCompare(bName)
    })

    for (const student of sortedStudents) {
      if (processed.has(student.id)) continue

      const siblings = sortedStudents.filter(s =>
        !processed.has(s.id) && (
          (student.parent1_id && (s.parent1_id === student.parent1_id || s.parent2_id === student.parent1_id))
          || (student.parent2_id && (s.parent1_id === student.parent2_id || s.parent2_id === student.parent2_id))
        ),
      )

      if (siblings.length === 0) {
        groups.push({
          students: [student],
          parent1: getStudentParent(student, 1),
          parent2: getStudentParent(student, 2),
        })
        processed.add(student.id)
      } else {
        siblings.sort((a, b) => {
          const aName = `${a.last_name}, ${a.first_name}`.toLowerCase()
          const bName = `${b.last_name}, ${b.first_name}`.toLowerCase()
          return aName.localeCompare(bName)
        })

        groups.push({
          students: siblings,
          parent1: getStudentParent(siblings[0], 1),
          parent2: getStudentParent(siblings[0], 2),
        })

        for (const sibling of siblings) processed.add(sibling.id)
      }
    }

    return groups
  })

  // Helper: Get student's parent
  function getStudentParent (student, parentNumber) {
    const parentIdField = parentNumber === 1 ? 'parent1_id' : 'parent2_id'
    const parentId = student[parentIdField]

    if (!parentId) return null

    return printableParents.value.find(p => p.id === parentId) || null
  }

  // Helper: Get student's teacher name
  function getStudentTeacherName (student) {
    const classItem = firebaseStore.classes.find(c => c.classLetter === student.className)
    if (!classItem || !classItem.teacher) return ''

    const teacher = firebaseStore.staffDTO.find(s => s.id === classItem.teacher)
    return teacher ? teacher.fullName : ''
  }

  // Helper: Get student's teacher first name only
  function getTeacherFirstName (student) {
    const classItem = firebaseStore.classes.find(c => c.classLetter === student.className)
    if (!classItem || !classItem.teacher) return ''

    const teacher = firebaseStore.staffDTO.find(s => s.id === classItem.teacher)
    return teacher ? teacher.first_name : ''
  }

  // Helper: Format level in compact form (1e, 2e, etc.)
  function formatLevelCompact (level) {
    if (!level || level === 'Unknown') return ''
    if (level === 1) {
      return '1re'
    }
    return `${level}e`
  }

  // Families with teacher names added; FamiliesPages fills pages by height
  const familiesWithTeachers = computed(() => groupedFamilies.value.map(family => ({
    ...family,
    students: family.students.map(student => ({
      ...student,
      teacherName: getStudentTeacherName(student),
    })),
  })))

  // Parents alphabetically with children; ParentsListPages fills pages by height
  const parentsWithChildren = computed(() => {
    // Create a map of parent -> children
    const parentChildrenMap = new Map()

    // Iterate through all students and map to their parents
    for (const student of firebaseStore.studentsDTO) {
      const parent1 = getStudentParent(student, 1)
      const parent2 = getStudentParent(student, 2)

      if (parent1) {
        if (!parentChildrenMap.has(parent1.id)) {
          parentChildrenMap.set(parent1.id, {
            id: parent1.id,
            first_name: parent1.first_name,
            last_name: parent1.last_name,
            fullName: parent1.fullName,
            lastNameFirst: parent1.lastNameFirst,
            children: [],
          })
        }
        // Enrich student with teacher info and lastNameFirst
        const enrichedStudent = {
          ...student,
          lastNameFirst: student.lastNameFirst,
          teacherFirstName: getTeacherFirstName(student),
          levelDisplay: formatLevelCompact(student.level),
        }
        parentChildrenMap.get(parent1.id).children.push(enrichedStudent)
      }

      if (parent2) {
        if (!parentChildrenMap.has(parent2.id)) {
          parentChildrenMap.set(parent2.id, {
            id: parent2.id,
            first_name: parent2.first_name,
            last_name: parent2.last_name,
            fullName: parent2.fullName,
            lastNameFirst: parent2.lastNameFirst,
            children: [],
          })
        }
        // Enrich student with teacher info and lastNameFirst
        const enrichedStudent = {
          ...student,
          lastNameFirst: student.lastNameFirst,
          teacherFirstName: getTeacherFirstName(student),
          levelDisplay: formatLevelCompact(student.level),
        }
        parentChildrenMap.get(parent2.id).children.push(enrichedStudent)
      }
    }

    // Convert map to array and sort alphabetically by parent last name, then first name
    const sortedParents = [...parentChildrenMap.values()].toSorted((a, b) => {
      const lastNameA = a.last_name.toLowerCase()
      const lastNameB = b.last_name.toLowerCase()
      if (lastNameA !== lastNameB) {
        return lastNameA.localeCompare(lastNameB)
      }
      // If last names are the same, sort by first name
      const firstNameA = a.first_name.toLowerCase()
      const firstNameB = b.first_name.toLowerCase()
      return firstNameA.localeCompare(firstNameB)
    })

    // Sort each parent's children by last name, then first name
    for (const parent of sortedParents) {
      parent.children.sort((a, b) => {
        const lastNameA = a.last_name.toLowerCase()
        const lastNameB = b.last_name.toLowerCase()
        if (lastNameA !== lastNameB) {
          return lastNameA.localeCompare(lastNameB)
        }
        const firstNameA = a.first_name.toLowerCase()
        const firstNameB = b.first_name.toLowerCase()
        return firstNameA.localeCompare(firstNameB)
      })
    }

    return sortedParents
  })

  // Get formatted school phone
  const schoolPhone = computed(() => formatPhoneForDisplay(SCHOOL_LOCATION.phone))

  // Get formatted SDG phone
  const sdgPhone = computed(() => formatPhoneForDisplay(SDG_INFO.phone))

  // Load all data
  async function loadData () {
    try {
      loading.value = true
      await Promise.all([
        firebaseStore.loadStaffDTO(),
        firebaseStore.loadCommitteesDTO(),
        firebaseStore.loadParentsDTO(),
        firebaseStore.loadStudentsDTO(),
        firebaseStore.loadClasses(),
      ])
    } catch (error) {
      console.error('Failed to load directory data:', error)
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    await loadData()
  })
</script>

<style scoped>
/* Reset and base styles for print */
.print-directory {
  /* Page setup */
  width: 5.5in;
  margin: 0 auto;
  background: white;
  color: black;
  font-family: Avenir, 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 9.5pt;
  line-height: 1.4;
}

/* Screen-only: Document viewer background */
@media screen {
  .print-directory {
    background: #525252;
    width: 100%;
    min-height: 100vh;
    padding: 1.4rem 0;
  }
}

/* Loading */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.loading-content {
  text-align: center;
  font-size: 1.2rem;
}

/* Print-specific styles */
@media print {
  .print-directory {
    width: 100%;
    margin: 0;
  }
}
</style>

<style>
/* Global unscoped styles for @page rules and print */

/* Page setup for print - zero margins, we handle spacing inside PrintPage component */
@page {
  size: 5.5in 8.5in;
  margin: 0;
}

/* CSS counter for manual page numbering */
.print-directory {
  counter-reset: manual-page 0;
}

</style>

<template>
  <div v-if="!isAuthorized" class="access-denied">
    <div class="access-denied-content">
      <h1>Accès refusé</h1>
      <p>Vous devez être administrateur pour accéder à cette page.</p>
    </div>
  </div>

  <div v-else-if="loading" class="loading">
    <div class="loading-content">
      <p>Chargement des données du bottin...</p>
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

    <!-- Committees Page 1 - En lien avec le projet éducatif -->
    <PrintPage id="section-comites">
      <div class="committees-section">
        <h1 class="section-title">Comités</h1>

        <!-- En lien avec le projet éducatif -->
        <h2 class="committee-category-title">En lien avec le projet éducatif</h2>
        <div v-for="committee in getCommitteesByNames(['Admissions', 'CAMPÉR'])" :key="committee.id" class="committee">
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <CommitteeTable compact :members="committee.enrichedMembers" />
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Committees Page 2 - Communications -->
    <PrintPage>
      <div class="committees-section">
        <!-- Communications -->
        <h2 class="committee-category-title">Communications</h2>
        <div v-for="committee in getCommitteesByNames(['Bottin', 'Groupe Facebook', 'OPP'])" :key="committee.id" class="committee">
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <CommitteeTable compact :members="committee.enrichedMembers" />
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Committees Page 3 - Activités à l'école -->
    <PrintPage>
      <div class="committees-section">
        <h2 class="committee-category-title">Activités à l'école</h2>
        <div v-for="committee in getCommitteesByNames(['Ateliers', 'Bazar'])" :key="committee.id" class="committee">
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <CommitteeTable compact :members="committee.enrichedMembers" />
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Committees Page 4 - Bibliothèque -->
    <PrintPage>
      <div class="committees-section">
        <div v-for="committee in getCommitteesByNames(['Bibliothèque'])" :key="committee.id" class="committee">
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <CommitteeTable compact :members="committee.enrichedMembers" />
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- Committees Page 5 -->
    <PrintPage>
      <div class="committees-section">
        <div v-for="committee in getCommitteesByNames(['JEDI', 'Feves', 'Comité des usagers SDG'])" :key="committee.id" class="committee">
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <CommitteeTable compact :members="committee.enrichedMembers" />
          </div>
        </div>
      </div>
    </PrintPage>

    <!-- CSSDM & REPAQ -->
    <CssdmPage :comite-parents="getCommitteesByNames(['Comité des parents CSSDM'])" :repaq="getCommitteesByNames(['REPAQ'])" :role-groups-map="committeeRoleGroupsMap" />

    <!-- Classes Pages -->
    <ClassesPage :classes-data="getClassesData([1, 2])" level-badge="1<sup>e</sup>-2<sup>e</sup>" section-id="section-classes" />
    <ClassesPage :classes-data="getClassesData([3, 4])" level-badge="3<sup>e</sup>-4<sup>e</sup>" section-id="section-classes-34" />
    <ClassesPage :classes-data="getClassesData([5, 6])" level-badge="5<sup>e</sup>-6<sup>e</sup>" section-id="section-classes-56" />

    <!-- Families Pages -->
    <FamiliesPages :paginated-families="paginatedFamiliesWithTeachers" />

    <!-- Parents Alphabetical List -->
    <ParentsListPages :paginated-parents="paginatedParentsWithChildren" />

    <!-- Référentiel -->
    <Referentiel />

    <!-- Implication -->
    <Implication />

    <!-- FAQ (2 pages) -->
    <FAQ1 />
    <FAQ2 />

    <!-- Back Page -->
    <BackPage />
  </div>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { getCommitteeRoleDisplayOrder } from '@/config/committees'
  import { SCHOOL_LOCATION } from '@/config/school'
  import { SDG_INFO } from '@/config/sdg'
  import { GROUP_DISPLAY_NAMES, GROUP_SUBGROUP_MAPPING, STAFF_GROUPS, SUBGROUP_DISPLAY_NAMES } from '@/config/staffGroups'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import BackPage from './BackPage.vue'
  import ClassesPage from './ClassesPage.vue'
  import CommitteeFullPage from './CommitteeFullPage.vue'
  import CommitteeTable from './components/CommitteeTable.vue'
  import CssdmPage from './CssdmPage.vue'
  import FamiliesPages from './FamiliesPages.vue'
  import FAQ1 from './FAQ1.vue'
  import FAQ2 from './FAQ2.vue'
  import Implication from './Implication.vue'
  import ParentsListPages from './ParentsListPages.vue'
  import PrintPage from './PrintPage.vue'
  import Referentiel from './Referentiel.vue'
  import StaffSection from './StaffSection.vue'
  import TableOfContents from './TableOfContents.vue'
  import TitlePage from './TitlePage.vue'

  // ============================================================================
  // TABLE OF CONTENTS PAGE NUMBERS
  // ============================================================================
  // Update these numbers after doing a print preview to see actual page numbers
  const TOC_PAGE_NUMBERS = {
    staff: 3, // Personnel (École Étoile filante)
    sdg: 4, // Personnel (Service de garde)
    committees: 5, // Conseil d'établissement
    fondation: 6, // Fondation de l'école Étoile filante
    comites: 7, // Comités section (pages 7-9)
    cssdm: 10, // Centre de services scolaire de Montréal
    repaq: 10, // REPAQ (on same page as CSSDM)
    classes: 11, // Liste des classes (1e-2e)
    'classes-34': 12, // Liste des classes (3e-4e)
    'classes-56': 13, // Liste des classes (5e-6e)
    families: 14, // Liste alphabétique des enfants (pages 14+, depends on # of families)
    parents: 20, // Liste alphabétique des parents (estimate, adjust after print preview)
    referentiel: 22, // Référentiel (estimate, adjust after print preview)
    implication: 23, // Implication (estimate, adjust after print preview)
    faq1: 24, // FAQ page 1 (estimate, adjust after print preview)
    faq2: 25, // FAQ page 2 (estimate, adjust after print preview)
  }
  // ============================================================================

  // Store references
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // State
  const isAuthorized = ref(false)
  const loading = ref(true)

  // Check admin status
  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }

    try {
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      isAuthorized.value = !!idTokenResult.claims.admin
    } catch (error) {
      console.error('Failed to check admin status:', error)
      isAuthorized.value = false
    }
  }

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
  const enrichedCommittees = computed(() => {
    return firebaseStore.committeesDTO.map(committee => {
      // Enrich members with full information from parents and staff
      const enrichedMembers = committee.members
        .map(member => {
          // Look up by memberId (parent/staff document ID)
          if (member.member_type === 'parent') {
            const parentMatch = firebaseStore.parentsDTO.find(p => p.id === member.memberId)
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
          } else if (member.member_type === 'staff') {
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
          }

          // If not found in either collection
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
          // First sort by member type (parents first, then staff)
          if (a.memberType !== b.memberType) {
            if (a.memberType === 'parent' && b.memberType === 'staff') return -1
            if (a.memberType === 'staff' && b.memberType === 'parent') return 1
            if (a.memberType === 'unknown') return 1
            if (b.memberType === 'unknown') return -1
          }
          // Then sort by name within the same member type
          return a.fullName.localeCompare(b.fullName)
        })

      // Separate members by type
      const parentMembers = enrichedMembers.filter(member => member.memberType === 'parent')
      const staffMembers = enrichedMembers.filter(member => member.memberType === 'staff')
      const unknownMembers = enrichedMembers.filter(member => member.memberType === 'unknown')

      return {
        ...committee,
        enrichedMembers,
        parentMembers,
        staffMembers,
        unknownMembers,
      }
    }).toSorted((a, b) => a.name.localeCompare(b.name))
  })

  // Conseil d'établissement (special treatment - full page)
  const conseilEtablissement = computed(() => {
    return enrichedCommittees.value.find(c => c.name === "Conseil d'établissement") || null
  })

  // Fondation (special treatment - full page)
  const fondation = computed(() => {
    return enrichedCommittees.value.find(c => c.name === "Fondation") || null
  })

  // Helper: Get committees by names
  function getCommitteesByNames (names) {
    return enrichedCommittees.value.filter(c => names.includes(c.name))
  }

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

  // Helper: Get teacher name
  function getTeacherName (teacherId) {
    const teacher = firebaseStore.staffDTO.find(s => s.id === teacherId)
    return teacher ? teacher.fullName : teacherId
  }

  // Helper: Get parent data for rep
  function getParentRepData (parentId) {
    const parent = firebaseStore.parentsDTO.find(p => p.id === parentId)
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
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
        return nameA.localeCompare(nameB)
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

    return firebaseStore.parentsDTO.find(p => p.id === parentId) || null
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
    return `${level}e`
  }

  // Paginated families with teacher names added
  const paginatedFamiliesWithTeachers = computed(() => {
    const families = groupedFamilies.value
    const pages = []

    for (let i = 0; i < families.length; i += 5) {
      const pageFamilies = families.slice(i, i + 5)

      // Add teacher names to students
      const enrichedFamilies = pageFamilies.map(family => ({
        ...family,
        students: family.students.map(student => ({
          ...student,
          teacherName: getStudentTeacherName(student),
        })),
      }))

      // Get all unique first letters from student last names on this page
      const letters = new Set()
      for (const family of enrichedFamilies) {
        for (const student of family.students) {
          if (student.last_name) {
            letters.add(student.last_name.charAt(0).toUpperCase())
          }
        }
      }

      // Sort letters alphabetically and join with hyphens
      const letterRange = [...letters].toSorted().join('-')

      pages.push({
        families: enrichedFamilies,
        letterRange,
        isFirstPage: i === 0,
      })
    }

    return pages
  })

  // Parents alphabetically with children
  const paginatedParentsWithChildren = computed(() => {
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

    // Paginate: smart pagination based on student count (~22 students per page)
    // Each parent entry shows all their children, so we count total student lines
    const pages = []
    const maxStudentsPerPage = 22
    let currentPage = []
    let currentStudentCount = 0

    for (const parent of sortedParents) {
      const studentCount = parent.children.length

      // Check if adding this parent would exceed the page limit
      if (currentStudentCount > 0 && currentStudentCount + studentCount > maxStudentsPerPage) {
        // Start a new page
        pages.push(currentPage)
        currentPage = [parent]
        currentStudentCount = studentCount
      } else {
        // Add to current page
        currentPage.push(parent)
        currentStudentCount += studentCount
      }
    }

    // Add the last page if it has content
    if (currentPage.length > 0) {
      pages.push(currentPage)
    }

    // Format pages with letter ranges
    return pages.map((pageParents, index) => {
      // Get all unique first letters from parent last names on this page
      const letters = new Set()
      for (const parent of pageParents) {
        if (parent.last_name && parent.last_name.length > 0) {
          letters.add(parent.last_name.charAt(0).toUpperCase())
        }
      }

      // Sort letters alphabetically and join with hyphens
      const letterRange = [...letters].toSorted().join('-')

      return {
        parents: pageParents,
        letterRange,
        isFirstPage: index === 0,
      }
    })
  })

  // Helper: Format phone number
  function formatPhone (phone) {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  // Get formatted school phone
  const schoolPhone = computed(() => formatPhone(SCHOOL_LOCATION.phone))

  // Get formatted SDG phone
  const sdgPhone = computed(() => formatPhone(SDG_INFO.phone))

  // Load all data
  async function loadData () {
    try {
      loading.value = true
      await Promise.all([
        firebaseStore.loadStaffDTO(),
        firebaseStore.loadCommitteesDTO(),
        firebaseStore.loadParentsDTO(),
        firebaseStore.loadStudentsDTO(),
        firebaseStore.loadAllData(), // For classes
      ])
    } catch (error) {
      console.error('Failed to load directory data:', error)
    } finally {
      loading.value = false
    }
  }

  // Populate TOC page numbers before print
  function populateTOCPageNumbers () {
    // Update TOC entries with the page numbers defined at the top of this file
    for (const section of Object.keys(TOC_PAGE_NUMBERS)) {
      const tocElement = document.querySelector(`[data-section="${section}"]`)
      if (tocElement) {
        tocElement.textContent = TOC_PAGE_NUMBERS[section]
      }
    }
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await loadData()

      // Wait for content to render, then populate TOC once
      setTimeout(() => {
        populateTOCPageNumbers()
      }, 500)
    } else {
      loading.value = false
    }
  })
</script>

<style scoped>
/* Reset and base styles for print */
.print-directory {
  /* Page setup */
  width: 8.5in;
  margin: 0 auto;
  background: white;
  color: black;
  font-family: Avenir, 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 10pt;
  line-height: 1.4;
}

/* Screen-only: Document viewer background */
@media screen {
  .print-directory {
    background: #525252;
    width: 100%;
    min-height: 100vh;
    padding: 2rem 0;
  }
}

/* Access Denied */
.access-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.access-denied-content {
  text-align: center;
  padding: 2rem;
}

.access-denied h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #d32f2f;
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

/* Committees compact styles */
.committee-category-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16pt;
  font-weight: 600;
  margin: 1.5rem 0 1rem 0;
  color: #000;
}

.committee {
  margin-bottom: 2rem;
  page-break-inside: avoid;
}

.committee-header-inline {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #999;
}

.committee-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  margin: 0;
}

.committee-description {
  font-weight: normal;
  font-style: italic;
  color: #000;
  margin-left: 0.25rem;
}

.committee-email-inline {
  font-size: 10pt;
  font-weight: 500;
  color: #000;
}

.committee-url-inline {
  font-size: 10pt;
  font-weight: 500;
  color: #000;
}

.committee-section-compact {
  margin-bottom: 1rem;
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
  size: letter;
  margin: 0;
}

/* CSS counter for manual page numbering */
.print-directory {
  counter-reset: manual-page 0;
}

</style>

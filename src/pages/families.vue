<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('directory.title') }}</h1>
      <v-chip
        :color="firebaseStore.studentsLoadingDTO || firebaseStore.parentsLoadingDTO ? 'orange' : 'green'"
        :prepend-icon="firebaseStore.studentsLoadingDTO || firebaseStore.parentsLoadingDTO ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
      >
        {{ loadingStatus }}
      </v-chip>
    </div>

    <!-- Error Messages -->
    <div v-if="firebaseStore.studentsErrorDTO || firebaseStore.parentsErrorDTO" class="mb-4">
      <v-alert
        v-if="firebaseStore.studentsErrorDTO"
        class="mb-2"
        closable
        :text="firebaseStore.studentsErrorDTO"
        :title="$t('directory.errorLoadingData')"
        type="error"
        @click:close="firebaseStore.studentsErrorDTO = null"
      />
      <v-alert
        v-if="firebaseStore.parentsErrorDTO"
        closable
        :text="firebaseStore.parentsErrorDTO"
        :title="$t('directory.errorLoadingData')"
        type="error"
        @click:close="firebaseStore.parentsErrorDTO = null"
      />
    </div>

    <!-- Loading State -->
    <div v-if="firebaseStore.studentsLoadingDTO || firebaseStore.parentsLoadingDTO" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('directory.loadingData') }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="firebaseStore.studentsDTO.length === 0 && firebaseStore.parentsDTO.length === 0" class="text-center py-8">
      <v-icon color="grey-darken-2" size="64">mdi-account-multiple-outline</v-icon>
      <p class="text-h6 mt-4 text-grey-darken-2">{{ $t('directory.noDataFound') }}</p>
    </div>

    <div v-else>
      <!-- Controls Section -->
      <v-card class="mb-6">
        <v-card-text>
          <!-- Search Bar -->
          <v-text-field
            v-model="searchQuery"
            class="mb-4"
            clearable
            hide-details
            :label="$t('directory.searchPlaceholder')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            @input="onSearchInput"
          />

          <!-- View Mode Toggle and Filters Row -->
          <div class="d-flex justify-space-between align-center flex-wrap gap-4">
            <!-- View Mode Toggle -->
            <v-chip-group
              v-model="viewMode"
              color="primary"
              filter
              mandatory
              selected-class="text-primary"
            >
              <v-chip value="families">
                <v-icon start>mdi-account-multiple</v-icon>
                {{ $t('directory.familiesView') }}
              </v-chip>
              <v-chip value="parents">
                <v-icon start>mdi-account-supervisor</v-icon>
                {{ $t('directory.parentsView') }}
              </v-chip>
            </v-chip-group>

            <!-- Filter Section -->
            <div class="d-flex align-center gap-2">
              <v-select
                v-model="selectedClass"
                clearable
                density="comfortable"
                hide-details
                :items="classOptions"
                :label="$t('directory.filterByClass')"
                :placeholder="$t('directory.allClasses')"
                prepend-inner-icon="mdi-school"
                style="min-width: 280px;"
                variant="outlined"
              />
            </div>
          </div>

          <!-- Results Counter -->
          <div v-if="searchQuery || selectedClass" class="text-caption mt-2 text-grey-darken-1">
            {{ resultCountText }}
          </div>
        </v-card-text>
      </v-card>

      <!-- Families View -->
      <v-card v-if="viewMode === 'families'">
        <v-card-text>
          <div
            v-for="(group, groupIndex) in filteredFamilies"
            :key="`family-${groupIndex}`"
            class="family-group mb-4 pb-4"
            :class="{ 'border-bottom': groupIndex !== filteredFamilies.length - 1 }"
          >
            <!-- Students in this family -->
            <div class="mb-3">
              <div
                v-for="student in group.students"
                :key="student.id"
                class="d-flex justify-space-between align-center mb-1"
              >
                <div class="text-h6 font-weight-bold">
                  <HighlightedText
                    :query="searchQuery"
                    :text="`${student.last_name}, ${student.first_name}`"
                  />
                </div>
                <div class="text-body-1 text-right">
                  <span v-if="getTeacherName(student.className)">{{ getTeacherName(student.className) }},</span>
                  <span v-if="student.level" class="ml-2">{{ student.level }}</span>
                </div>
              </div>
            </div>

            <!-- Parents in two columns -->
            <v-row v-if="group.parent1 || group.parent2">
              <v-col cols="12" sm="6">
                <ParentInfo
                  v-if="group.parent1"
                  :committees="getParentCommittees(group.parent1.email)"
                  :parent="group.parent1"
                  :search-query="searchQuery"
                  show-address
                  show-committees
                  show-contact
                  show-interests
                  variant="detailed"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <ParentInfo
                  v-if="group.parent2"
                  :committees="getParentCommittees(group.parent2.email)"
                  :parent="group.parent2"
                  :search-query="searchQuery"
                  show-address
                  show-committees
                  show-contact
                  show-interests
                  variant="detailed"
                />
              </v-col>
            </v-row>

            <div v-else class="text-body-2 text-grey-darken-1">
              {{ $t('directory.noParentInfo') }}
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Parents View -->
      <v-card v-else>
        <v-table>
          <thead>
            <tr>
              <th class="text-left font-weight-bold">{{ $t('directory.parent') }}</th>
              <th class="text-left font-weight-bold">{{ $t('directory.children') }}</th>
              <th class="text-left font-weight-bold">{{ $t('directory.teacherLevel') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="parentData in filteredParents"
              :key="parentData.parent.id"
              class="parent-row"
            >
              <td class="py-3">
                <ParentInfo
                  :parent="parentData.parent"
                  :search-query="searchQuery"
                  show-contact
                  variant="minimal"
                />
              </td>
              <td class="py-3">
                <div v-if="parentData.children.length > 0">
                  <div
                    v-for="child in parentData.children"
                    :key="child.id"
                    class="mb-1"
                  >
                    <HighlightedText
                      :query="searchQuery"
                      :text="`${child.last_name}, ${child.first_name}`"
                    />
                  </div>
                </div>
                <div v-else class="text-grey-darken-1">
                  {{ $t('directory.noChildren') }}
                </div>
              </td>
              <td class="py-3">
                <div v-if="parentData.children.length > 0">
                  <div
                    v-for="child in parentData.children"
                    :key="child.id"
                    class="mb-1"
                  >
                    <span v-if="getTeacherName(child.className)">{{ getTeacherName(child.className) }}, </span>
                    <span v-if="child.level">{{ child.level }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import HighlightedText from '@/components/HighlightedText.vue'
  import ParentInfo from '@/components/ParentInfo.vue'
  import { useI18n } from '@/composables/useI18n'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { matchesAnyField, matchesSearch } from '@/utils/search'

  const { t } = useI18n()

  // Reactive state
  const searchQuery = ref('')
  const viewMode = ref('families')
  const selectedClass = ref(null)

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  // Loading status computed
  const loadingStatus = computed(() => {
    if (firebaseStore.studentsLoadingDTO || firebaseStore.parentsLoadingDTO) {
      return t('common.loading')
    }
    const studentsCount = firebaseStore.studentsDTO.length
    const parentsCount = firebaseStore.parentsDTO.length
    return t('directory.dataLoaded', { students: studentsCount, parents: parentsCount })
  })

  // Class options for filtering
  const classOptions = computed(() => {
    const classes = [...new Set(
      firebaseStore.studentsDTO
        .map(s => s.className)
        .filter(Boolean),
    )].sort()

    return classes.map(className => {
      const classItem = firebaseStore.classes.find(c => c.classLetter === className)
      let displayTitle = className

      if (classItem) {
        const teacher = firebaseStore.staffDTO.find(s => s.id === classItem.teacher)
        if (teacher) {
          displayTitle = `${teacher.first_name} ${teacher.last_name} (${classItem.classCode})`
        }
      }

      return {
        title: displayTitle,
        value: className,
      }
    })
  })

  // Family grouping logic (from students.vue)
  const groupedFamilies = computed(() => {
    const processed = new Set()
    const groups = []

    const sortedStudents = [...firebaseStore.studentsDTO].sort((a, b) => {
      const aName = `${a.last_name}, ${a.first_name}`.toLowerCase()
      const bName = `${b.last_name}, ${b.first_name}`.toLowerCase()
      return aName.localeCompare(bName)
    })

    for (const student of sortedStudents) {
      if (processed.has(student.id)) continue

      const siblings = sortedStudents.filter(s =>
        !processed.has(s.id) && (
          (student.parent1_email && (s.parent1_email === student.parent1_email || s.parent2_email === student.parent1_email))
          || (student.parent2_email && (s.parent1_email === student.parent2_email || s.parent2_email === student.parent2_email))
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

  // Parents with children logic (from parents.vue)
  const parentsWithChildren = computed(() => {
    const parentsWithChildren = firebaseStore.parentsDTO.map(parent => {
      const children = firebaseStore.studentsDTO.filter(student =>
        student.parent1_email === parent.email || student.parent2_email === parent.email,
      )

      children.sort((a, b) => {
        const aName = `${a.last_name}, ${a.first_name}`.toLowerCase()
        const bName = `${b.last_name}, ${b.first_name}`.toLowerCase()
        return aName.localeCompare(bName)
      })

      return { parent, children }
    })

    return parentsWithChildren.sort((a, b) => {
      const aName = `${a.parent.last_name}, ${a.parent.first_name}`.toLowerCase()
      const bName = `${b.parent.last_name}, ${b.parent.first_name}`.toLowerCase()
      return aName.localeCompare(bName)
    })
  })

  // Filtered results
  const filteredFamilies = computed(() => {
    let families = groupedFamilies.value

    // Apply class filter
    if (selectedClass.value) {
      families = families.filter(group =>
        group.students.some(student => student.className === selectedClass.value),
      )
    }

    // Apply search filter
    if (searchQuery.value) {
      families = families.filter(group => {
        const searchFields = [
          ...group.students.flatMap(student => [
            student.fullName,
            `${student.last_name}, ${student.first_name}`,
          ]),
          group.parent1 ? group.parent1.fullName : '',
          group.parent2 ? group.parent2.fullName : '',
        ].filter(Boolean)

        return matchesAnyField(searchFields, searchQuery.value)
      })
    }

    return families
  })

  const filteredParents = computed(() => {
    let parents = parentsWithChildren.value

    // Apply class filter
    if (selectedClass.value) {
      parents = parents.filter(({ children }) =>
        children.some(child => child.className === selectedClass.value),
      )
    }

    // Apply search filter
    if (searchQuery.value) {
      parents = parents.filter(({ parent, children }) => {
        if (matchesSearch(parent.fullName, searchQuery.value)) {
          return true
        }

        return children.some(child => {
          const childFullName = `${child.first_name} ${child.last_name}`
          return matchesSearch(childFullName, searchQuery.value)
        })
      })
    }

    return parents
  })

  // Result count text
  const resultCountText = computed(() => {
    if (viewMode.value === 'families') {
      const total = groupedFamilies.value.length
      const filtered = filteredFamilies.value.length
      return t('directory.familiesShown', { filtered, total })
    } else {
      const total = parentsWithChildren.value.length
      const filtered = filteredParents.value.length
      return t('directory.parentsShown', { filtered, total })
    }
  })

  // Helper functions
  const getStudentParent = (student, parentNumber) => {
    const parentEmailField = parentNumber === 1 ? 'parent1_email' : 'parent2_email'
    const parentEmail = student[parentEmailField]

    if (!parentEmail) return null

    return firebaseStore.parentsDTO.find(p => p.email === parentEmail) || null
  }

  const getTeacherName = className => {
    const classItem = firebaseStore.classes.find(c => c.classLetter === className)
    if (!classItem) return null

    const teacher = firebaseStore.staffDTO.find(s => s.id === classItem.teacher)
    return teacher ? teacher.first_name : null
  }

  const getParentCommittees = parentEmail => {
    if (!parentEmail) return []

    return firebaseStore.committees
      .filter(committee =>
        committee.members
        && committee.members.some(member => member.email === parentEmail),
      )
      .map(committee => committee.name)
  }

  const onSearchInput = () => {
    // Force reactivity update
  }

  onMounted(async () => {
    // Load all required data
    await Promise.all([
      firebaseStore.loadStudentsDTO(),
      firebaseStore.loadParentsDTO(),
      firebaseStore.loadStaffDTO(),
      firebaseStore.loadAllData(),
    ])
  })
</script>

<style scoped>
.family-group {
  border-bottom: 3px solid white;
}

.family-group:last-child {
  border-bottom: none !important;
}

.parent-row:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.02);
}

.parent-row:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>

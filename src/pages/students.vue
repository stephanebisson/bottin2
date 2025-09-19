<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('students.title') }}</h1>
      <v-chip
        :color="firebaseStore.loading ? 'orange' : 'green'"
        :prepend-icon="firebaseStore.loading ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
      >
        {{ firebaseStore.loading ? $t('common.loading') : $t('students.studentsLoaded', { count: firebaseStore.students.length }) }}
      </v-chip>
    </div>

    <div v-if="firebaseStore.error" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.error"
        :title="$t('students.errorLoadingStudents')"
        type="error"
        @click:close="firebaseStore.error = null"
      />
    </div>

    <div v-if="firebaseStore.loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('students.loadingStudents') }}</p>
    </div>

    <div v-else-if="firebaseStore.students.length === 0" class="text-center py-8">
      <v-icon color="grey-darken-2" size="64">mdi-account-multiple-outline</v-icon>
      <p class="text-h6 mt-4 text-grey-darken-2">{{ $t('students.noStudentsFound') }}</p>
    </div>

    <div v-else>
      <!-- Search Bar -->
      <v-card class="mb-6">
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            clearable
            hide-details
            :label="$t('students.searchStudentsChildren')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            @input="onSearchInput"
          />
          <div v-if="searchQuery" class="text-caption mt-2 text-grey-darken-1">
            {{ filteredGroups.length }} of {{ groupedStudents.length }} families shown
          </div>
        </v-card-text>
      </v-card>

      <!-- Students List -->
      <v-card>
        <v-card-text>
          <div
            v-for="(group, groupIndex) in filteredGroups"
            :key="`group-${groupIndex}`"
            class="student-group mb-4 pb-4"
            :class="{ 'border-bottom': groupIndex !== filteredGroups.length - 1 }"
          >
            <!-- Students in this group (siblings) -->
            <div class="mb-3">
              <div
                v-for="student in group.students"
                :key="student.id"
                class="d-flex justify-space-between align-center mb-1"
              >
                <div class="text-h6 font-weight-bold">
                  <HighlightedText 
                    :text="`${student.last_name}, ${student.first_name}`" 
                    :query="searchQuery" 
                  />
                </div>
                <div class="text-body-1 text-right">
                  <span v-if="getTeacherName(student.className)">{{ getTeacherName(student.className) }},</span>
                  <span v-if="student.level" class="ml-2">{{ student.level }}</span>
                </div>
              </div>
            </div>

            <!-- Parents in two columns (shared for all siblings) -->
            <v-row v-if="group.parent1 || group.parent2">
              <!-- Parent 1 Column -->
              <v-col cols="6">
                <div v-if="group.parent1" class="parent-info">
                  <div class="text-subtitle-2 font-weight-bold mb-1">
                    <HighlightedText 
                      :text="`${group.parent1.first_name} ${group.parent1.last_name}`" 
                      :query="searchQuery" 
                    />
                  </div>
                  <div v-if="getParentCommittees(group.parent1.email).length > 0" class="text-caption mb-1 text-primary font-italic">
                    {{ getParentCommittees(group.parent1.email).join(', ') }}
                  </div>
                  <div v-if="group.parent1.email" class="text-body-2 mb-1">
                    <strong>Email:</strong> {{ group.parent1.email }}
                  </div>
                  <div v-if="group.parent1.phone" class="text-body-2 mb-1">
                    <strong>Phone:</strong> {{ formatPhone(group.parent1.phone) }}
                  </div>
                  <div v-if="formatAddress(group.parent1)" class="text-body-2 mb-1">
                    <strong>Address:</strong> {{ formatAddress(group.parent1) }}
                  </div>
                  <div v-if="group.parent1.interests && group.parent1.interests.length > 0" class="text-body-2">
                    <strong>Interests:</strong> {{ group.parent1.interests.join(', ') }}
                  </div>
                </div>
              </v-col>

              <!-- Parent 2 Column -->
              <v-col cols="6">
                <div v-if="group.parent2" class="parent-info">
                  <div class="text-subtitle-2 font-weight-bold mb-1">
                    <HighlightedText 
                      :text="`${group.parent2.first_name} ${group.parent2.last_name}`" 
                      :query="searchQuery" 
                    />
                  </div>
                  <div v-if="getParentCommittees(group.parent2.email).length > 0" class="text-caption mb-1 text-primary font-italic">
                    {{ getParentCommittees(group.parent2.email).join(', ') }}
                  </div>
                  <div v-if="group.parent2.email" class="text-body-2 mb-1">
                    <strong>Email:</strong> {{ group.parent2.email }}
                  </div>
                  <div v-if="group.parent2.phone" class="text-body-2 mb-1">
                    <strong>Phone:</strong> {{ formatPhone(group.parent2.phone) }}
                  </div>
                  <div v-if="formatAddress(group.parent2)" class="text-body-2 mb-1">
                    <strong>Address:</strong> {{ formatAddress(group.parent2) }}
                  </div>
                  <div v-if="group.parent2.interests && group.parent2.interests.length > 0" class="text-body-2">
                    <strong>Interests:</strong> {{ group.parent2.interests.join(', ') }}
                  </div>
                </div>
              </v-col>
            </v-row>

            <!-- No parents message -->
            <div v-else class="text-body-2 text-grey-darken-1">
              No parent information available
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { matchesAnyField } from '@/utils/search'
  import HighlightedText from '@/components/HighlightedText.vue'

  const { t } = useI18n()

  const searchQuery = ref('')

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  const groupedStudents = computed(() => {
    const processed = new Set()
    const groups = []

    // Sort students alphabetically first
    const sortedStudents = [...firebaseStore.students].sort((a, b) => {
      const aName = `${a.last_name}, ${a.first_name}`.toLowerCase()
      const bName = `${b.last_name}, ${b.first_name}`.toLowerCase()
      return aName.localeCompare(bName)
    })

    for (const student of sortedStudents) {
      if (processed.has(student.id)) continue

      // Find siblings by matching parent emails
      const siblings = sortedStudents.filter(s =>
        !processed.has(s.id) && (
          (student.parent1_email && (s.parent1_email === student.parent1_email || s.parent2_email === student.parent1_email))
          || (student.parent2_email && (s.parent1_email === student.parent2_email || s.parent2_email === student.parent2_email))
        ),
      )

      // If no siblings found, just add the student alone
      if (siblings.length === 0) {
        groups.push({
          students: [student],
          parent1: getStudentParent(student, 1),
          parent2: getStudentParent(student, 2),
        })
        processed.add(student.id)
      } else {
        // Sort siblings alphabetically too
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

        // Mark all siblings as processed
        for (const sibling of siblings) processed.add(sibling.id)
      }
    }

    return groups
  })

  const filteredGroups = computed(() => {
    return groupedStudents.value.filter(group => {
      // Collect all searchable text from this group
      const searchFields = [
        // Student names (both formats)
        ...group.students.flatMap(student => [
          `${student.first_name} ${student.last_name}`,
          `${student.last_name}, ${student.first_name}`
        ]),
        // Parent names
        group.parent1 ? `${group.parent1.first_name} ${group.parent1.last_name}` : '',
        group.parent2 ? `${group.parent2.first_name} ${group.parent2.last_name}` : ''
      ].filter(Boolean) // Remove empty strings

      return matchesAnyField(searchFields, searchQuery.value)
    })
  })

  const onSearchInput = () => {
    // Force reactivity update
  }

  const getStudentParent = (student, parentNumber) => {
    const parentEmailField = parentNumber === 1 ? 'parent1_email' : 'parent2_email'
    const parentEmail = student[parentEmailField]

    if (!parentEmail) return null

    return firebaseStore.parents.find(p => p.email === parentEmail) || null
  }

  const getTeacherName = className => {
    const classItem = firebaseStore.classes.find(c => c.classLetter === className)
    if (!classItem) return null

    const teacher = firebaseStore.staff.find(s => s.id === classItem.teacher)
    return teacher ? teacher.first_name : null
  }

  const formatAddress = parent => {
    if (!parent) return ''

    const addressParts = []

    if (parent.address) addressParts.push(parent.address)
    if (parent.city) addressParts.push(parent.city)
    if (parent.postal_code) addressParts.push(parent.postal_code)

    return addressParts.length > 0 ? addressParts.join(', ') : ''
  }

  const formatPhone = phone => {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
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

  onMounted(() => {
    firebaseStore.loadAllData()
  })
</script>

<style scoped>
.student-group {
  border-bottom: 3px solid white;
}

.student-group:last-child {
  border-bottom: none !important;
}

.parent-info {
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  height: 100%;
}
</style>

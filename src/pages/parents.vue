<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('parents.title') }}</h1>
      <v-chip
        :color="firebaseStore.loading ? 'orange' : 'green'"
        :prepend-icon="firebaseStore.loading ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
      >
        {{ firebaseStore.loading ? $t('common.loading') : searchQuery ? $t('parents.parentsFiltered', { filtered: sortedParentsWithChildren.length, total: firebaseStore.parents.length }) : $t('parents.parentsLoaded', { count: firebaseStore.parents.length }) }}
      </v-chip>
    </div>

    <div v-if="firebaseStore.error" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.error"
        :title="$t('parents.errorLoadingParents')"
        type="error"
        @click:close="firebaseStore.error = null"
      />
    </div>

    <div v-if="firebaseStore.loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('parents.loadingParents') }}</p>
    </div>

    <div v-else-if="firebaseStore.parents.length === 0" class="text-center py-8">
      <v-icon color="grey-darken-2" size="64">mdi-account-supervisor-outline</v-icon>
      <p class="text-h6 mt-4 text-grey-darken-2">{{ $t('parents.noParentsFound') }}</p>
    </div>

    <div v-else>
      <!-- Search Bar -->
      <v-card class="mb-4">
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            clearable
            hide-details
            :label="$t('parents.searchParentsChildren')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </v-card-text>
      </v-card>

      <!-- Parents Table -->
      <v-card>
        <v-table>
          <thead>
            <tr>
              <th class="text-left font-weight-bold">{{ $t('parents.parent') }}</th>
              <th class="text-left font-weight-bold">{{ $t('parents.children') }}</th>
              <th class="text-left font-weight-bold">{{ $t('parents.teacherLevel') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="parentData in sortedParentsWithChildren"
              :key="parentData.parent.id"
              class="parent-row"
            >
              <!-- Parent Column -->
              <td class="py-3">
                <ParentInfo
                  :parent="{ ...parentData.parent, fullName: `${parentData.parent.last_name}, ${parentData.parent.first_name}` }"
                  :search-query="searchQuery"
                  show-contact
                  variant="minimal"
                />
              </td>

              <!-- Children Column -->
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
                  {{ $t('parents.noChildrenFound') }}
                </div>
              </td>

              <!-- Teacher, Level Column -->
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
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { matchesSearch } from '@/utils/search'

  const searchQuery = ref('')

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  const sortedParentsWithChildren = computed(() => {
    const parentsWithChildren = firebaseStore.parents.map(parent => {
      // Find children for this parent by matching email
      const children = firebaseStore.students.filter(student =>
        student.parent1_email === parent.email || student.parent2_email === parent.email,
      )

      // Sort children alphabetically
      children.sort((a, b) => {
        const aName = `${a.last_name}, ${a.first_name}`.toLowerCase()
        const bName = `${b.last_name}, ${b.first_name}`.toLowerCase()
        return aName.localeCompare(bName)
      })

      return {
        parent,
        children,
      }
    })

    // Filter by search query if provided (accent-insensitive)
    const filteredParents = parentsWithChildren.filter(({ parent, children }) => {
      // Check if parent name matches
      const parentFullName = `${parent.first_name} ${parent.last_name}`
      if (matchesSearch(parentFullName, searchQuery.value)) {
        return true
      }

      // Check if any child name matches
      return children.some(child => {
        const childFullName = `${child.first_name} ${child.last_name}`
        return matchesSearch(childFullName, searchQuery.value)
      })
    })

    // Sort parents alphabetically by name
    return filteredParents.sort((a, b) => {
      const aName = `${a.parent.last_name}, ${a.parent.first_name}`.toLowerCase()
      const bName = `${b.parent.last_name}, ${b.parent.first_name}`.toLowerCase()
      return aName.localeCompare(bName)
    })
  })

  const getTeacherName = className => {
    const classItem = firebaseStore.classes.find(c => c.classLetter === className)
    if (!classItem) return null

    const teacher = firebaseStore.staff.find(s => s.id === classItem.teacher)
    return teacher ? teacher.first_name : null
  }

  onMounted(() => {
    firebaseStore.loadAllData()
  })
</script>

<style scoped>
.parent-row:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.02);
}

.parent-row:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>

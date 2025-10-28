<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('admin.parentsDirectory.title') }}</h1>
    </div>

    <!-- Access Control -->
    <div v-if="!isAuthorized" class="text-center py-12">
      <v-icon color="error" size="64">mdi-shield-alert</v-icon>
      <h2 class="text-h5 mt-4 text-error">{{ $t('admin.accessDenied') }}</h2>
      <p class="text-body-1 text-grey-darken-1 mt-2">
        {{ $t('admin.adminAccessRequired') }}
      </p>

      <!-- Manual Refresh Button for newly granted admins -->
      <div class="mt-6">
        <p class="text-body-2 text-grey-darken-1 mb-4">
          {{ $t('admin.refreshPermissionsInstructions') }}
        </p>
        <v-btn
          color="primary"
          :loading="loading"
          prepend-icon="mdi-refresh"
          @click="checkAdminStatus"
        >
          {{ $t('admin.refreshAdminStatus') }}
        </v-btn>
      </div>
    </div>

    <!-- Parents Directory -->
    <div v-else>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular color="primary" indeterminate size="64" />
        <p class="text-h6 mt-4">{{ $t('common.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <v-icon color="error" size="64">mdi-alert-circle</v-icon>
        <h2 class="text-h5 mt-4 text-error">{{ $t('common.error') }}</h2>
        <p class="text-body-1 text-grey-darken-1 mt-2">{{ error }}</p>
        <v-btn
          class="mt-4"
          color="primary"
          @click="loadData"
        >
          {{ $t('common.retry') }}
        </v-btn>
      </div>

      <!-- Parents Table -->
      <div v-else>
        <!-- Summary Stats -->
        <v-card class="mb-6" color="primary" variant="tonal">
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon class="mr-4" size="48">mdi-account-group</v-icon>
              <div>
                <h2 class="text-h5 font-weight-bold">{{ $t('admin.parentsDirectory.summary') }}</h2>
                <p class="text-body-1 mt-2">
                  {{ $t('admin.parentsDirectory.totalParents', { count: sortedParents.length }) }}
                </p>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Data Table -->
        <v-card>
          <v-card-title>
            <div class="d-flex justify-space-between align-center w-100">
              <span class="text-h5">{{ $t('admin.parentsDirectory.allParents') }}</span>
              <v-btn
                color="primary"
                prepend-icon="mdi-account-plus"
                @click="createNewParent"
              >
                {{ $t('admin.parentsDirectory.addNewParent') }}
              </v-btn>
            </div>
          </v-card-title>

          <v-data-table
            class="elevation-0"
            :disable-sort="true"
            :headers="tableHeaders"
            :item-value="getParentKey"
            :items="displayParents"
            :items-per-page="50"
            :row-props="getRowProps"
            :sort-by="[{ key: 'first_name', order: 'asc' }, { key: 'last_name', order: 'asc' }]"
          >
            <!-- First Name Column -->
            <template #item.first_name="{ item }">
              <v-text-field
                v-if="editingRows.has(getParentKey(item))"
                v-model="item.first_name"
                density="compact"
                hide-details
                variant="outlined"
              />
              <span v-else class="font-weight-medium">{{ item.first_name }}</span>
            </template>

            <!-- Last Name Column -->
            <template #item.last_name="{ item }">
              <v-text-field
                v-if="editingRows.has(getParentKey(item))"
                v-model="item.last_name"
                density="compact"
                hide-details
                variant="outlined"
              />
              <span v-else class="font-weight-medium">{{ item.last_name }}</span>
            </template>

            <!-- Email Column -->
            <template #item.email="{ item }">
              <v-text-field
                v-if="editingRows.has(getParentKey(item))"
                v-model="item.email"
                density="compact"
                hide-details
                :placeholder="$t('common.optional')"
                type="email"
                variant="outlined"
              />
              <a v-else-if="item.email" class="text-primary text-decoration-none" :href="`mailto:${item.email}`">
                {{ item.email }}
              </a>
              <span v-else class="text-grey-darken-1 font-italic">{{ $t('common.notProvided') }}</span>
            </template>

            <!-- Phone Column -->
            <template #item.phone="{ item }">
              <v-text-field
                v-if="editingRows.has(getParentKey(item))"
                v-model="item.phone"
                density="compact"
                hide-details
                type="tel"
                variant="outlined"
              />
              <span v-else-if="item.phone">{{ item.displayPhone }}</span>
              <span v-else class="text-grey-darken-1 font-italic">{{ $t('common.notProvided') }}</span>
            </template>

            <!-- Children Column -->
            <template #item.children="{ item }">
              <div v-if="item.childrenInfo && item.childrenInfo.length > 0">
                <div class="text-body-2">
                  <div
                    v-for="child in item.childrenInfo"
                    :key="child.id"
                    class="mb-1"
                  >
                    {{ child.fullName }} ({{ child.displayLevel }} - {{ getTeacherName(getClassTeacher(child.className)) || $t('admin.parentsDirectory.noTeacher') }})
                  </div>
                </div>
              </div>
              <span v-else class="text-grey-darken-1 font-italic">
                {{ $t('admin.parentsDirectory.noChildren') }}
              </span>
            </template>

            <!-- Actions Column -->
            <template #item.actions="{ item }">
              <div class="d-flex align-center ga-1">
                <template v-if="!editingRows.has(getParentKey(item))">
                  <v-btn
                    color="primary"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="startEditing(item)"
                  />
                </template>
                <template v-else>
                  <v-btn
                    color="success"
                    icon="mdi-check"
                    :loading="item._saving"
                    size="small"
                    variant="text"
                    @click="saveParent(item)"
                  />
                  <v-btn
                    color="grey"
                    :disabled="item._saving"
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    @click="cancelEditing(item)"
                  />
                </template>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </div>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { ParentRepository } from '@/repositories/ParentRepository.js'
  import { StudentRepository } from '@/repositories/StudentRepository.js'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const { t } = useI18n()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // State
  const loading = ref(false)
  const error = ref(null)
  const parents = ref([])
  const students = ref([])
  const editingRows = ref(new Set())
  const newParent = ref(null) // ParentDTO for new parent being created

  // Authorization
  const isAuthorized = ref(false)

  // Repositories
  const parentRepository = new ParentRepository()
  const studentRepository = new StudentRepository()

  // Helper function to get unique identifier for a parent
  function getParentKey (parent) {
    return parent._tempEmail || parent.id || parent.email
  }

  // Helper functions for teacher information
  function getTeacherName (teacherId) {
    if (!teacherId || !firebaseStore.staffDTO) return ''
    const teacher = firebaseStore.staffDTO.find(s => s.id === teacherId)
    return teacher ? teacher.fullName : ''
  }

  function getClassTeacher (className) {
    if (!className || !firebaseStore.classes) return null
    const classItem = firebaseStore.classes.find(c => c.classLetter === className)
    return classItem ? classItem.teacher : null
  }

  // Check admin status using custom claims
  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }

    try {
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      const isAdmin = !!idTokenResult.claims.admin
      isAuthorized.value = isAdmin
    } catch (error) {
      console.error('Failed to check admin status:', error)
      isAuthorized.value = false
    }
  }

  // Table headers
  const tableHeaders = computed(() => [
    {
      title: t('common.firstName'),
      align: 'start',
      sortable: false,
      key: 'first_name',
      width: '120px',
    },
    {
      title: t('common.lastName'),
      align: 'start',
      sortable: false,
      key: 'last_name',
      width: '120px',
    },
    {
      title: t('common.email'),
      align: 'start',
      sortable: false,
      key: 'email',
    },
    {
      title: t('common.phone'),
      align: 'start',
      sortable: false,
      key: 'phone',
    },
    {
      title: t('admin.parentsDirectory.children'),
      align: 'start',
      sortable: false,
      key: 'children',
      width: '300px',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      sortable: false,
      width: '100px',
    },
  ])

  // Computed sorted parents with children info
  const sortedParents = computed(() => {
    if (parents.value.length === 0) return []

    // Map children to parents - preserve ParentDTO instance to keep getters
    const parentsWithChildren = parents.value.map(parent => {
      const childrenInfo = students.value.filter(student =>
        student.parent1_id === parent.id || student.parent2_id === parent.id,
      )

      // Add childrenInfo directly to parent object instead of spreading
      parent.childrenInfo = childrenInfo
      return parent
    })

    // Sort by first name, then last name (ascending)
    return parentsWithChildren.toSorted((a, b) => {
      const firstNameCompare = a.first_name.localeCompare(b.first_name)
      if (firstNameCompare !== 0) return firstNameCompare
      return a.last_name.localeCompare(b.last_name)
    })
  })

  // Computed parents list that includes new parent row at the beginning
  const displayParents = computed(() => {
    if (newParent.value) {
      return [newParent.value, ...sortedParents.value]
    }
    return sortedParents.value
  })

  // Get row props for highlighting parents without children
  function getRowProps ({ item }) {
    // Don't highlight new parents being created
    if (item._isNew) return {}
    // Highlight parents with no children in orange
    const hasChildren = item.childrenInfo && item.childrenInfo.length > 0
    if (!hasChildren) {
      return { class: 'parent-no-children' }
    }
    return {}
  }

  // Load all data
  async function loadData () {
    loading.value = true
    error.value = null

    try {
      console.log('Loading parents, students, staff and classes data...')

      // First ensure Firebase store is loaded (contains staff and classes data)
      await Promise.all([
        (!firebaseStore.hasData || firebaseStore.isDataStale) ? firebaseStore.loadAllData() : Promise.resolve(),
        firebaseStore.loadStaffDTO(),
      ])

      // Load both parents and students in parallel
      const [parentsData, studentsData] = await Promise.all([
        parentRepository.getAll(),
        studentRepository.getAll(),
      ])

      parents.value = parentsData
      students.value = studentsData

      console.log(`Loaded ${parentsData.length} parents, ${studentsData.length} students, ${firebaseStore.staffDTO?.length || 0} staff, ${firebaseStore.classes?.length || 0} classes`)
    } catch (error_) {
      console.error('Error loading data:', error_)
      error.value = error_.message || 'Failed to load data'
    } finally {
      loading.value = false
    }
  }

  // Start editing a parent row
  function startEditing (parentDTO) {
    // Store original values for cancel functionality
    parentDTO._originalValues = {
      first_name: parentDTO.first_name,
      last_name: parentDTO.last_name,
      email: parentDTO.email,
      phone: parentDTO.phone,
    }
    editingRows.value.add(getParentKey(parentDTO))
  }

  // Cancel new parent creation
  function cancelNewParent () {
    if (newParent.value) {
      editingRows.value.delete(getParentKey(newParent.value))
      newParent.value = null
    }
  }

  // Cancel editing and restore original values
  function cancelEditing (parentDTO) {
    // Check if this is a new parent being cancelled
    if (newParent.value && getParentKey(parentDTO) === getParentKey(newParent.value)) {
      cancelNewParent()
      return
    }

    if (parentDTO._originalValues) {
      parentDTO.first_name = parentDTO._originalValues.first_name
      parentDTO.last_name = parentDTO._originalValues.last_name
      parentDTO.email = parentDTO._originalValues.email
      parentDTO.phone = parentDTO._originalValues.phone
      delete parentDTO._originalValues
    }
    editingRows.value.delete(getParentKey(parentDTO))
  }

  // Create new parent row
  function createNewParent () {
    if (newParent.value) {
      // Already creating a new parent
      return
    }

    // Create a new parent object with temporary email for tracking
    const tempEmail = 'new-parent-' + Date.now() + '@temp.com'
    newParent.value = {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      displayPhone: '',
      fullName: '',
      childrenInfo: [],
      _isNew: true,
      _tempEmail: tempEmail, // Stable identifier for tracking editing state
    }
    // Use temporary email as the key for consistent tracking
    editingRows.value.add(tempEmail)
  }

  // Save new parent
  async function saveNewParent () {
    if (!newParent.value) return

    try {
      newParent.value._saving = true

      // Validate required fields
      if (!newParent.value.first_name.trim()) {
        error.value = t('admin.parentsDirectory.validation.required')
        setTimeout(() => {
          error.value = null
        }, 5000)
        return
      }

      if (!newParent.value.last_name.trim()) {
        error.value = t('admin.parentsDirectory.validation.required')
        setTimeout(() => {
          error.value = null
        }, 5000)
        return
      }

      // Validate email format if provided
      if (newParent.value.email.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(newParent.value.email.trim())) {
          error.value = t('admin.parentsDirectory.validation.invalidEmail')
          setTimeout(() => {
            error.value = null
          }, 5000)
          return
        }
      }

      // Create parent data
      const parentData = {
        first_name: newParent.value.first_name.trim(),
        last_name: newParent.value.last_name.trim(),
        email: newParent.value.email.trim(),
        phone: newParent.value.phone.trim() || '',
      }

      // Use ParentRepository.create which handles DTO validation internally
      const createdParentDTO = await parentRepository.create(parentData)

      // Add new parent to the parents array
      parents.value.push(createdParentDTO)

      console.log(`Created new parent ${createdParentDTO.fullName}`)

      // Clear new parent state
      editingRows.value.delete(getParentKey(newParent.value))
      newParent.value = null
    } catch (error_) {
      console.error('Failed to create parent:', error_)
      error.value = `Failed to create parent: ${error_.message}`
      setTimeout(() => {
        error.value = null
      }, 5000)
    } finally {
      if (newParent.value) {
        newParent.value._saving = false
      }
    }
  }

  // Save parent changes
  async function saveParent (parentDTO) {
    // Check if this is a new parent being saved
    if (newParent.value && (getParentKey(parentDTO) === getParentKey(newParent.value) || parentDTO._isNew)) {
      await saveNewParent()
      return
    }

    try {
      parentDTO._saving = true

      // Create updates object with proper data sanitization
      const updates = {
        first_name: parentDTO.first_name,
        last_name: parentDTO.last_name,
        email: parentDTO.email || '',
        phone: parentDTO.phone || '',
      }

      // Use ParentRepository.update which handles DTO validation internally
      const updatedParentDTO = await parentRepository.update(parentDTO.id || parentDTO.email, updates)

      // Update the reactive parent object with the validated data from the updated DTO
      // Note: Only update actual data fields, not computed getters like displayPhone/fullName
      parentDTO.first_name = updatedParentDTO.first_name
      parentDTO.last_name = updatedParentDTO.last_name
      parentDTO.email = updatedParentDTO.email
      parentDTO.phone = updatedParentDTO.phone
      parentDTO.updatedAt = updatedParentDTO.updatedAt

      console.log(`Updated parent ${updatedParentDTO.fullName}`)
      delete parentDTO._originalValues
      editingRows.value.delete(getParentKey(parentDTO))
    } catch (error_) {
      console.error('Failed to save parent:', error_)
      error.value = `Failed to update parent: ${error_.message}`
      setTimeout(() => {
        error.value = null
      }, 5000)
    } finally {
      parentDTO._saving = false
    }
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await loadData()
    }
  })
</script>

<style scoped>
  .v-data-table {
    border-radius: 0;
  }

  :deep(.parent-no-children) {
    background-color: #fff3e0 !important;
  }

  :deep(.parent-no-children:hover) {
    background-color: #ffe0b2 !important;
  }
</style>

<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('admin.studentsTable.title') }}</h1>
    </div>

    <!-- Access Control -->
    <div v-if="!isAuthorized" class="text-center py-12">
      <v-icon color="error" size="64">mdi-shield-alert</v-icon>
      <h2 class="text-h5 mt-4 text-error">{{ $t('admin.accessDenied') }}</h2>
      <p class="text-body-1 text-grey-darken-1 mt-2">
        {{ $t('admin.adminAccessRequired') }}
      </p>
    </div>

    <!-- Students Table -->
    <div v-else>
      <!-- Loading State -->
      <v-card v-if="loading" class="pa-6 text-center">
        <v-progress-circular
          color="primary"
          indeterminate
          size="64"
        />
        <p class="mt-4">{{ $t('admin.studentsTable.loading') }}</p>
      </v-card>

      <!-- Error State -->
      <v-alert
        v-else-if="error"
        class="mb-6"
        color="error"
        icon="mdi-alert-circle"
      >
        {{ error }}
      </v-alert>

      <!-- Students Data Table -->
      <v-card v-else>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ $t('admin.studentsTable.tableTitle') }}</span>
          <div class="text-body-2 text-grey-darken-1">
            {{ $t('admin.studentsTable.totalStudents', { count: students.length }) }}
          </div>
        </v-card-title>

        <v-data-table
          class="elevation-1"
          disable-sort
          :headers="headers"
          item-value="id"
          :items="students"
          :items-per-page="50"
          :loading="loading"
          :sort-by="[]"
        >
          <!-- First Name Column -->
          <template #item.first_name="{ item }">
            <v-text-field
              v-if="editingRows.has(item.id)"
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
              v-if="editingRows.has(item.id)"
              v-model="item.last_name"
              density="compact"
              hide-details
              variant="outlined"
            />
            <span v-else class="font-weight-medium">{{ item.last_name }}</span>
          </template>

          <!-- Class Column -->
          <template #item.className="{ item }">
            <v-select
              v-if="editingRows.has(item.id)"
              v-model="item.className"
              density="compact"
              hide-details
              item-title="text"
              item-value="value"
              :items="classOptions"
              style="min-width: 140px"
              variant="outlined"
            >
              <template #selection="{ item: selectedItem }">
                <span class="font-weight-medium">
                  {{ selectedItem.title }}
                </span>
              </template>
            </v-select>
            <span v-else class="font-weight-medium">
              {{ classOptions.find(c => c.value === item.className)?.text || item.className }}
            </span>
          </template>

          <!-- Level Column -->
          <template #item.level="{ item }">
            <v-select
              v-if="editingRows.has(item.id)"
              v-model="item.level"
              density="compact"
              hide-details
              :items="getLevelOptions(item.className)"
              style="min-width: 70px"
              variant="outlined"
            >
              <template #selection="{ item: selectedItem }">
                <span class="font-weight-medium">
                  {{ selectedItem.title }}
                </span>
              </template>
            </v-select>
            <span v-else class="font-weight-medium">{{ item.level }}</span>
          </template>

          <!-- Parents Column -->
          <template #item.parents="{ item }">
            <div v-if="editingRows.has(item.id)" class="d-flex flex-column ga-1">
              <v-select
                v-model="item.parent1_email"
                clearable
                density="compact"
                hide-details
                item-title="fullName"
                item-value="email"
                :items="parentOptions"
                placeholder="Select Parent 1"
                variant="outlined"
              />
              <v-select
                v-model="item.parent2_email"
                clearable
                density="compact"
                hide-details
                item-title="fullName"
                item-value="email"
                :items="parentOptions"
                placeholder="Select Parent 2"
                variant="outlined"
              />
            </div>
            <div v-else class="d-flex flex-column">
              <span v-if="item.parent1_email" class="text-body-2 mb-1">
                {{ getParentDisplayName(item.parent1_email) }}
              </span>
              <span v-if="item.parent2_email" class="text-body-2">
                {{ getParentDisplayName(item.parent2_email) }}
              </span>
              <span v-if="!item.parent1_email && !item.parent2_email" class="text-grey-darken-1 font-italic">
                {{ $t('admin.studentsTable.noParent') }}
              </span>
            </div>
          </template>

          <!-- Actions Column -->
          <template #item.actions="{ item }">
            <div class="d-flex align-center ga-1">
              <v-btn
                v-if="!editingRows.has(item.id)"
                color="primary"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="startEditing(item)"
              />
              <template v-else>
                <v-btn
                  color="success"
                  icon="mdi-check"
                  :loading="item._saving"
                  size="small"
                  variant="text"
                  @click="saveStudent(item)"
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

          <!-- No data state -->
          <template #no-data>
            <div class="text-center pa-12">
              <v-icon color="grey-lighten-1" size="64">mdi-school-outline</v-icon>
              <p class="text-h6 mt-4 text-grey-darken-1">
                {{ $t('admin.studentsTable.noStudents') }}
              </p>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { getResetLevel, getValidLevelsForClass } from '@/config/classLevels'
  import { StudentDTO } from '@/dto/StudentDTO.js'
  import { ClassRepository } from '@/repositories/ClassRepository'
  import { ParentRepository } from '@/repositories/ParentRepository'
  import { StudentRepository } from '@/repositories/StudentRepository'
  import { useAuthStore } from '@/stores/auth'

  const { t } = useI18n()
  const authStore = useAuthStore()

  // State
  const loading = ref(false)
  const error = ref(null)
  const students = ref([]) // Array of StudentDTO instances
  const classOptions = ref([])
  const parentOptions = ref([]) // Array of simplified parent objects {email, fullName} from ParentDTO
  const editingRows = ref(new Set())

  // Check if user is authorized using Firebase Custom Claims
  const isAuthorized = ref(false)

  // Check admin status using custom claims
  const checkAdminStatus = async () => {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }

    try {
      // Get ID token result which includes custom claims - force refresh to get latest claims
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      const isAdmin = !!idTokenResult.claims.admin

      isAuthorized.value = isAdmin
    } catch (error) {
      console.error('Failed to check admin status:', error)
      isAuthorized.value = false
    }
  }

  // Define table headers
  const headers = computed(() => [
    {
      title: t('admin.studentsTable.headers.firstName'),
      key: 'first_name',
      sortable: false,
      width: '120px',
    },
    {
      title: t('admin.studentsTable.headers.lastName'),
      key: 'last_name',
      sortable: false,
      width: '120px',
    },
    {
      title: t('admin.studentsTable.headers.class'),
      key: 'className',
      sortable: false,
      width: '150px',
    },
    {
      title: t('admin.studentsTable.headers.level'),
      key: 'level',
      sortable: false,
      width: '80px',
    },
    {
      title: t('admin.studentsTable.headers.parents'),
      key: 'parents',
      sortable: false,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      sortable: false,
      width: '100px',
    },
  ])

  // Get color for class chips
  const getClassColor = className => {
    // Generate a consistent color based on class name
    const colors = ['blue', 'green', 'orange', 'purple', 'red', 'teal', 'indigo', 'pink']
    const hash = className.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.codePointAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  // Get level options for a given class
  const getLevelOptions = classLetter => {
    const validLevels = getValidLevelsForClass(classLetter)
    return validLevels.map(level => ({
      title: level.toString(),
      value: level,
    }))
  }

  // Load students data
  const loadStudents = async () => {
    try {
      loading.value = true
      error.value = null

      const repository = new StudentRepository()
      const studentDTOs = await repository.getAll()

      // Sort by class, level, first name, last name (all ascending)
      // StudentRepository.getAll() returns StudentDTO instances
      students.value = studentDTOs.sort((a, b) => {
        // First sort by className
        if (a.className < b.className) return -1
        if (a.className > b.className) return 1

        // Then sort by level (ascending)
        const levelA = a.level || 0
        const levelB = b.level || 0
        if (levelA < levelB) return -1
        if (levelA > levelB) return 1

        // Then sort by first name (ascending)
        if (a.first_name < b.first_name) return -1
        if (a.first_name > b.first_name) return 1

        // Finally sort by last name (ascending)
        if (a.last_name < b.last_name) return -1
        if (a.last_name > b.last_name) return 1

        return 0
      })

      console.log(`Loaded ${students.value.length} students as DTOs`)
    } catch (error_) {
      console.error('Failed to load students:', error_)
      error.value = t('admin.studentsTable.loadError')
    } finally {
      loading.value = false
    }
  }

  // Load class options for dropdowns
  const loadClassOptions = async () => {
    try {
      const classRepository = new ClassRepository()
      classOptions.value = await classRepository.getClassDropdownOptions()
      console.log(`Loaded ${classOptions.value.length} class options`)
    } catch (error_) {
      console.error('Failed to load class options:', error_)
    }
  }

  // Load parent options for dropdowns
  const loadParentOptions = async () => {
    try {
      const parentRepository = new ParentRepository()
      const parents = await parentRepository.getAll()
      parentOptions.value = parents.map(parentDTO => ({
        email: parentDTO.email,
        fullName: parentDTO.fullName,
      }))
      console.log(`Loaded ${parentOptions.value.length} parent options`)
    } catch (error_) {
      console.error('Failed to load parent options:', error_)
    }
  }

  // Get parent display name from email
  const getParentDisplayName = email => {
    if (!email) return null
    const parent = parentOptions.value.find(p => p.email === email)
    return parent ? parent.fullName : email
  }

  // Start editing a student row
  const startEditing = studentDTO => {
    // Store original values for cancel functionality using DTO's toJSON method
    studentDTO._originalValues = {
      first_name: studentDTO.first_name,
      last_name: studentDTO.last_name,
      className: studentDTO.className,
      level: studentDTO.level,
      parent1_email: studentDTO.parent1_email,
      parent2_email: studentDTO.parent2_email,
    }
    editingRows.value.add(studentDTO.id)
  }

  // Cancel editing and restore original values
  const cancelEditing = studentDTO => {
    if (studentDTO._originalValues) {
      studentDTO.first_name = studentDTO._originalValues.first_name
      studentDTO.last_name = studentDTO._originalValues.last_name
      studentDTO.className = studentDTO._originalValues.className
      studentDTO.level = studentDTO._originalValues.level
      studentDTO.parent1_email = studentDTO._originalValues.parent1_email
      studentDTO.parent2_email = studentDTO._originalValues.parent2_email
      delete studentDTO._originalValues
    }
    editingRows.value.delete(studentDTO.id)
  }

  // Save student changes
  const saveStudent = async studentDTO => {
    try {
      studentDTO._saving = true

      // Create updates object with proper data sanitization
      const updates = {
        first_name: studentDTO.first_name,
        last_name: studentDTO.last_name,
        className: studentDTO.className,
        level: studentDTO.level,
        parent1_email: studentDTO.parent1_email || null,
        parent2_email: studentDTO.parent2_email || null,
      }

      // Use StudentRepository.update which handles DTO validation internally
      const repository = new StudentRepository()
      const updatedStudentDTO = await repository.update(studentDTO.id, updates)

      // Update the reactive student object with the validated data from the updated DTO
      Object.assign(studentDTO, updatedStudentDTO.toJSON())

      console.log(`Updated student ${updatedStudentDTO.fullName}`)
      delete studentDTO._originalValues
      editingRows.value.delete(studentDTO.id)
    } catch (error_) {
      console.error('Failed to save student:', error_)
      error.value = t('admin.studentsTable.updateError')
      setTimeout(() => {
        error.value = null
      }, 5000)
    } finally {
      studentDTO._saving = false
    }
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await Promise.all([
        loadStudents(),
        loadClassOptions(),
        loadParentOptions(),
      ])
    }
  })

  // Watch for authentication changes
  watch(() => authStore.isAuthenticated, async newValue => {
    if (newValue) {
      await checkAdminStatus()
      if (isAuthorized.value) {
        await Promise.all([
          loadStudents(),
          loadClassOptions(),
          loadParentOptions(),
        ])
      }
    } else {
      isAuthorized.value = false
      students.value = []
      classOptions.value = []
    }
  })
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>

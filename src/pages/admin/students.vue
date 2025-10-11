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
          <div class="d-flex align-center ga-4">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              variant="elevated"
              @click="createNewStudent"
            >
              {{ $t('admin.studentsTable.newStudent') }}
            </v-btn>
            <div class="text-body-2 text-grey-darken-1">
              {{ $t('admin.studentsTable.totalStudents', { count: students.length }) }}
            </div>
          </div>
        </v-card-title>

        <v-data-table
          class="elevation-1"
          disable-sort
          :headers="headers"
          item-value="id"
          :items="displayStudents"
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
              <template v-if="!editingRows.has(item.id)">
                <v-btn
                  color="primary"
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="startEditing(item)"
                />
                <v-btn
                  color="error"
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  @click="openDeleteStudentDialog(item)"
                />
              </template>
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

    <!-- Delete Student Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="600px"
      persistent
    >
      <v-card>
        <v-card-title class="bg-error text-white">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="large">mdi-alert-circle</v-icon>
            <span class="text-h5">{{ $t('admin.parentsDirectory.confirmDeleteStudent') }}</span>
          </div>
        </v-card-title>

        <v-card-text class="pt-6">
          <v-alert
            class="mb-4"
            color="error"
            icon="mdi-alert"
            variant="tonal"
          >
            <div class="text-body-1 font-weight-bold mb-2">
              {{ $t('admin.parentsDirectory.deleteStudentWarning') }}
            </div>
          </v-alert>

          <div v-if="studentToDelete" class="mb-4">
            <div class="text-h6 mb-2">
              {{ studentToDelete.fullName }}
            </div>
            <div class="text-body-2 text-grey-darken-1">
              {{ studentToDelete.displayLevel }} - {{ studentToDelete.className }}
            </div>
          </div>

          <p class="text-body-1 mb-4">
            {{ $t('admin.parentsDirectory.deleteStudentExplanation') }}
          </p>

          <v-divider class="my-4" />

          <div class="mb-4">
            <p class="text-body-1 font-weight-bold mb-2">
              {{ $t('admin.parentsDirectory.deleteStudentConfirmation') }}
            </p>
            <v-text-field
              v-model="deleteConfirmationText"
              class="mt-2"
              color="error"
              density="comfortable"
              :error="deleteConfirmationError"
              :error-messages="deleteConfirmationErrorMessage"
              hide-details="auto"
              :placeholder="$t('admin.parentsDirectory.typeDeleteToConfirm')"
              variant="outlined"
              @keyup.enter="confirmDeleteStudent"
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            :disabled="deletingStudent"
            variant="text"
            @click="cancelDeleteStudent"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            :disabled="!isDeleteConfirmed"
            :loading="deletingStudent"
            variant="flat"
            @click="confirmDeleteStudent"
          >
            {{ $t('admin.parentsDirectory.deleteStudent') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  const newStudent = ref(null) // StudentDTO for new student being created

  // Delete Student Dialog State
  const showDeleteDialog = ref(false)
  const studentToDelete = ref(null)
  const deleteConfirmationText = ref('')
  const deleteConfirmationError = ref(false)
  const deleteConfirmationErrorMessage = ref('')
  const deletingStudent = ref(false)

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

  // Computed students list that includes new student row at the beginning
  const displayStudents = computed(() => {
    if (newStudent.value) {
      return [newStudent.value, ...students.value]
    }
    return students.value
  })

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

      // Sort by level, class, first name, last name (all ascending)
      // Students without a level or class are sorted at the end
      // StudentRepository.getAll() returns StudentDTO instances
      students.value = studentDTOs.sort((a, b) => {
        // First sort by level (ascending) - null values go to end
        const levelA = a.level === null ? Number.MAX_SAFE_INTEGER : a.level
        const levelB = b.level === null ? Number.MAX_SAFE_INTEGER : b.level
        if (levelA < levelB) return -1
        if (levelA > levelB) return 1

        // Then sort by className - empty strings go to the end
        const classA = a.className || '\uFFFF' // Use max Unicode char to sort empty to end
        const classB = b.className || '\uFFFF'
        if (classA < classB) return -1
        if (classA > classB) return 1

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

  // Cancel new student creation
  const cancelNewStudent = () => {
    if (newStudent.value) {
      editingRows.value.delete(newStudent.value.id)
      newStudent.value = null
    }
  }

  // Cancel editing and restore original values
  const cancelEditing = studentDTO => {
    // Check if this is a new student being cancelled
    if (newStudent.value && studentDTO.id === newStudent.value.id) {
      cancelNewStudent()
      return
    }

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

  // Create new student row
  const createNewStudent = () => {
    if (newStudent.value) {
      // Already creating a new student
      return
    }

    // Create a new StudentDTO with temporary ID for editing
    const tempId = 'new-student-' + Date.now()
    newStudent.value = new StudentDTO({
      id: tempId,
      first_name: '',
      last_name: '',
      className: '',
      level: null,
      parent1_email: null,
      parent2_email: null,
    })

    // Add to editing rows
    editingRows.value.add(tempId)
  }

  // Save new student
  const saveNewStudent = async () => {
    if (!newStudent.value) return

    try {
      newStudent.value._saving = true

      // Validate required fields
      if (!newStudent.value.first_name.trim()) {
        error.value = t('admin.studentsTable.validation.firstNameRequired')
        setTimeout(() => {
          error.value = null
        }, 5000)
        return
      }

      if (!newStudent.value.last_name.trim()) {
        error.value = t('admin.studentsTable.validation.lastNameRequired')
        setTimeout(() => {
          error.value = null
        }, 5000)
        return
      }

      if (!newStudent.value.parent1_email && !newStudent.value.parent2_email) {
        error.value = t('admin.studentsTable.validation.parentRequired')
        setTimeout(() => {
          error.value = null
        }, 5000)
        return
      }

      // Create student data (without temporary ID)
      const studentData = {
        first_name: newStudent.value.first_name.trim(),
        last_name: newStudent.value.last_name.trim(),
        className: newStudent.value.className,
        level: newStudent.value.level,
        parent1_email: newStudent.value.parent1_email || null,
        parent2_email: newStudent.value.parent2_email || null,
      }

      // Use StudentRepository.create which handles DTO validation internally
      const repository = new StudentRepository()
      const createdStudentDTO = await repository.create(studentData)

      // Add new student to the beginning of the students array
      students.value.unshift(createdStudentDTO)

      console.log(`Created new student ${createdStudentDTO.fullName}`)

      // Clear new student state
      editingRows.value.delete(newStudent.value.id)
      newStudent.value = null
    } catch (error_) {
      console.error('Failed to create student:', error_)
      error.value = t('admin.studentsTable.createError')
      setTimeout(() => {
        error.value = null
      }, 5000)
    } finally {
      if (newStudent.value) {
        newStudent.value._saving = false
      }
    }
  }

  // Save student changes
  const saveStudent = async studentDTO => {
    // Check if this is a new student being saved
    if (newStudent.value && studentDTO.id === newStudent.value.id) {
      await saveNewStudent()
      return
    }

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
      // Only update writable properties, not computed ones like fullName
      studentDTO.first_name = updatedStudentDTO.first_name
      studentDTO.last_name = updatedStudentDTO.last_name
      studentDTO.className = updatedStudentDTO.className
      studentDTO.level = updatedStudentDTO.level
      studentDTO.parent1_email = updatedStudentDTO.parent1_email
      studentDTO.parent2_email = updatedStudentDTO.parent2_email
      studentDTO.updatedAt = updatedStudentDTO.updatedAt

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

  // Delete Student Dialog Methods
  const isDeleteConfirmed = computed(() => {
    const expectedText = t('admin.delete').toUpperCase()
    return deleteConfirmationText.value.trim().toUpperCase() === expectedText
  })

  const openDeleteStudentDialog = student => {
    studentToDelete.value = student
    deleteConfirmationText.value = ''
    deleteConfirmationError.value = false
    deleteConfirmationErrorMessage.value = ''
    showDeleteDialog.value = true
  }

  const cancelDeleteStudent = () => {
    showDeleteDialog.value = false
    studentToDelete.value = null
    deleteConfirmationText.value = ''
    deleteConfirmationError.value = false
    deleteConfirmationErrorMessage.value = ''
  }

  const confirmDeleteStudent = async () => {
    if (!isDeleteConfirmed.value) {
      deleteConfirmationError.value = true
      deleteConfirmationErrorMessage.value = t('admin.parentsDirectory.deleteStudentMismatch')
      return
    }

    if (!studentToDelete.value) return

    deletingStudent.value = true
    deleteConfirmationError.value = false
    deleteConfirmationErrorMessage.value = ''

    try {
      console.log('Deleting student:', studentToDelete.value.fullName)

      // Delete student using repository
      const repository = new StudentRepository()
      await repository.delete(studentToDelete.value.id)
      console.log('Student deleted successfully:', studentToDelete.value.fullName)

      // Remove from students array
      students.value = students.value.filter(s => s.id !== studentToDelete.value.id)

      // Close dialog
      showDeleteDialog.value = false
      studentToDelete.value = null
      deleteConfirmationText.value = ''

      // Show success message (you could add a snackbar here)
      console.log('Student deleted successfully!')
    } catch (error_) {
      console.error('Error deleting student:', error_)
      deleteConfirmationError.value = true
      deleteConfirmationErrorMessage.value = t('admin.parentsDirectory.deleteStudentError')
    } finally {
      deletingStudent.value = false
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

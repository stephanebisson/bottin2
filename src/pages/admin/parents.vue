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
                @click="showAddParentDialog = true"
              >
                {{ $t('admin.parentsDirectory.addNewParent') }}
              </v-btn>
            </div>
          </v-card-title>

          <v-data-table
            class="elevation-0"
            :disable-sort="true"
            :headers="tableHeaders"
            :items="sortedParents"
            :items-per-page="50"
            :sort-by="[{ key: 'first_name', order: 'asc' }, { key: 'last_name', order: 'asc' }]"
          >
            <!-- Phone Column -->
            <template #item.phone="{ item }">
              <span v-if="item.phone">{{ item.displayPhone }}</span>
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

            <!-- Email Column -->
            <template #item.email="{ item }">
              <a class="text-primary text-decoration-none" :href="`mailto:${item.email}`">
                {{ item.email }}
              </a>
            </template>
          </v-data-table>
        </v-card>
      </div>
    </div>

    <!-- Add Parent Dialog -->
    <v-dialog
      v-model="showAddParentDialog"
      max-width="600px"
      persistent
    >
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ $t('admin.parentsDirectory.addNewParent') }}</span>
        </v-card-title>

        <v-card-text>
          <v-form ref="addParentForm" v-model="formValid">
            <v-container>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="newParent.first_name"
                    :label="$t('common.firstName')"
                    outlined
                    required
                    :rules="[rules.required]"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="newParent.last_name"
                    :label="$t('common.lastName')"
                    outlined
                    required
                    :rules="[rules.required]"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="newParent.email"
                    :label="$t('common.email')"
                    outlined
                    required
                    :rules="[rules.required, rules.email]"
                    type="email"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="newParent.phone"
                    :label="$t('common.phone')"
                    outlined
                    type="tel"
                  />
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="cancelAddParent"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formValid"
            :loading="savingParent"
            variant="flat"
            @click="saveNewParent"
          >
            {{ $t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

  // Add Parent Dialog State
  const showAddParentDialog = ref(false)
  const formValid = ref(false)
  const savingParent = ref(false)
  const addParentForm = ref(null)
  const newParent = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })

  // Authorization
  const isAuthorized = ref(false)

  // Repositories
  const parentRepository = new ParentRepository()
  const studentRepository = new StudentRepository()

  // Form validation rules
  const rules = {
    required: value => !!value || t('admin.parentsDirectory.validation.required'),
    email: value => {
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return pattern.test(value) || t('admin.parentsDirectory.validation.invalidEmail')
    },
  }

  // Helper functions for teacher information
  const getTeacherName = teacherId => {
    if (!teacherId || !firebaseStore.staffDTO) return ''
    const teacher = firebaseStore.staffDTO.find(s => s.id === teacherId)
    return teacher ? teacher.fullName : ''
  }

  const getClassTeacher = className => {
    if (!className || !firebaseStore.classes) return null
    const classItem = firebaseStore.classes.find(c => c.classLetter === className)
    return classItem ? classItem.teacher : null
  }

  // Check admin status using custom claims
  const checkAdminStatus = async () => {
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
    },
    {
      title: t('common.lastName'),
      align: 'start',
      sortable: false,
      key: 'last_name',
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
  ])

  // Computed sorted parents with children info
  const sortedParents = computed(() => {
    if (parents.value.length === 0) return []

    // Map children to parents
    const parentsWithChildren = parents.value.map(parent => {
      const childrenInfo = students.value.filter(student =>
        student.parent1_email === parent.email || student.parent2_email === parent.email,
      )

      return {
        ...parent,
        childrenInfo,
      }
    })

    // Sort by first name, then last name (ascending)
    return parentsWithChildren.sort((a, b) => {
      const firstNameCompare = a.first_name.localeCompare(b.first_name)
      if (firstNameCompare !== 0) return firstNameCompare
      return a.last_name.localeCompare(b.last_name)
    })
  })

  // Load all data
  const loadData = async () => {
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

  // Add Parent Dialog Methods
  const resetNewParentForm = () => {
    newParent.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    }
    formValid.value = false
    if (addParentForm.value) {
      addParentForm.value.resetValidation()
    }
  }

  const cancelAddParent = () => {
    showAddParentDialog.value = false
    resetNewParentForm()
  }

  const saveNewParent = async () => {
    if (!formValid.value) return

    savingParent.value = true
    try {
      console.log('Creating new parent:', newParent.value)

      // Create parent using repository
      const createdParent = await parentRepository.create(newParent.value)
      console.log('Parent created successfully:', createdParent.fullName)

      // Refresh the parents list
      parents.value = await parentRepository.getAll()

      // Close dialog and reset form
      showAddParentDialog.value = false
      resetNewParentForm()

      // Show success message (you could add a snackbar here)
      console.log('Parent added successfully!')
    } catch (error_) {
      console.error('Error creating parent:', error_)
      // You could show an error snackbar here
      error.value = `Failed to create parent: ${error_.message}`
    } finally {
      savingParent.value = false
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
</style>

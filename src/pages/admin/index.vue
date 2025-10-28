<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('admin.title') }}</h1>
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

    <!-- Admin Dashboard -->
    <div v-else>
      <!-- Welcome Section -->
      <v-card class="mb-6" color="primary" variant="tonal">
        <v-card-text>
          <div class="d-flex align-center">
            <v-icon class="mr-4" size="48">mdi-shield-account</v-icon>
            <div>
              <h2 class="text-h5 font-weight-bold">{{ $t('admin.welcomeTitle') }}</h2>
              <p class="text-body-1 mt-2">
                {{ $t('admin.welcomeDescription') }}
              </p>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Admin Tools Grid -->
      <v-row>
        <!-- Annual Parent Information Update -->
        <v-col cols="12" lg="4" md="6">
          <v-card
            class="h-100 cursor-pointer admin-card"
            hover
            @click="handleAnnualUpdateClick"
          >
            <v-card-text class="text-center pa-6">
              <v-icon class="mb-4" color="primary" size="64">mdi-calendar-sync</v-icon>
              <h3 class="text-h6 font-weight-bold mb-2">{{ $t('admin.annualUpdateWorkflow') }}</h3>
              <p class="text-body-2 text-grey-darken-1">
                {{ $t('admin.annualUpdateDescription') }}
              </p>

              <!-- Quick Status -->
              <div v-if="currentWorkflow" class="mt-4">
                <v-chip
                  :color="getWorkflowStatusColor(currentWorkflow.status)"
                  size="small"
                  variant="tonal"
                >
                  {{ $t(`admin.status.${currentWorkflow.status}`) }}
                </v-chip>
                <div class="text-body-2 mt-2">
                  {{ $t('admin.workflowCompleted', { completed: currentWorkflow.formsSubmitted || 0, total: currentWorkflow.totalParents || 0 }) }}
                </div>
              </div>
              <div v-else class="mt-4">
                <v-chip color="grey" size="small" variant="tonal">
                  {{ $t('admin.noActiveWorkflow') }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Parents Directory -->
        <v-col cols="12" lg="4" md="6">
          <v-card
            class="h-100 cursor-pointer admin-card"
            hover
            @click="handleParentsClick"
          >
            <v-card-text class="text-center pa-6">
              <v-icon class="mb-4" color="primary" size="64">mdi-account-group</v-icon>
              <h3 class="text-h6 font-weight-bold mb-2">{{ $t('admin.parentsDirectory.title') }}</h3>
              <p class="text-body-2 text-grey-darken-1">
                {{ $t('admin.parentsDirectory.description') }}
              </p>

              <!-- Quick Stats -->
              <div class="mt-4">
                <v-chip color="primary" size="small" variant="tonal">
                  {{ $t('admin.parentsDirectory.viewAllParents') }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Students Table -->
        <v-col cols="12" lg="4" md="6">
          <v-card
            class="h-100 cursor-pointer admin-card"
            hover
            @click="handleStudentsClick"
          >
            <v-card-text class="text-center pa-6">
              <v-icon class="mb-4" color="primary" size="64">mdi-school-outline</v-icon>
              <h3 class="text-h6 font-weight-bold mb-2">{{ $t('admin.studentsTable.title') }}</h3>
              <p class="text-body-2 text-grey-darken-1">
                {{ $t('admin.studentsTable.description') }}
              </p>

              <!-- Quick Stats -->
              <div class="mt-4">
                <v-chip color="primary" size="small" variant="tonal">
                  {{ $t('admin.studentsTable.viewAllStudents') }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Staff Update -->
        <v-col cols="12" lg="4" md="6">
          <v-card class="h-100 admin-card">
            <v-card-text class="text-center pa-6">
              <v-icon class="mb-4" color="primary" size="64">mdi-account-tie-outline</v-icon>
              <h3 class="text-h6 font-weight-bold mb-2">{{ $t('admin.staffUpdate.title') }}</h3>
              <p class="text-body-2 text-grey-darken-1">
                {{ $t('admin.staffUpdate.description') }}
              </p>

              <!-- Staff Update Link -->
              <div v-if="staffUpdateToken" class="mt-4">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-link"
                  size="small"
                  variant="tonal"
                  @click="openStaffUpdateLink"
                >
                  {{ $t('admin.staffUpdate.openLink') }}
                </v-btn>
                <v-btn
                  class="mt-2"
                  color="grey"
                  prepend-icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  @click="copyStaffUpdateLink"
                >
                  {{ $t('admin.staffUpdate.copyLink') }}
                </v-btn>
              </div>
              <div v-else class="mt-4">
                <v-chip color="grey" size="small" variant="tonal">
                  {{ $t('admin.staffUpdate.noToken') }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

      </v-row>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const { t } = useI18n()
  const router = useRouter()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // State
  const loading = ref(false)
  const currentWorkflow = ref(null)
  const staffUpdateToken = ref(null)

  // Check if user is authorized using Firebase Custom Claims
  const isAuthorized = ref(false)
  const adminStatus = ref(null)

  // Check admin status using custom claims
  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }

    try {
      // Get ID token result which includes custom claims - force refresh to get latest claims
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      const isAdmin = !!idTokenResult.claims.admin

      isAuthorized.value = isAdmin
      adminStatus.value = {
        isAdmin,
        claims: idTokenResult.claims,
        email: authStore.userEmail,
      }
    } catch (error) {
      console.error('Failed to check admin status:', error)
      isAuthorized.value = false
    }
  }

  // Workflow status helpers (for dashboard overview)
  function getWorkflowStatusColor (status) {
    switch (status) {
      case 'pending': { return 'warning'
      }
      case 'active': { return 'info'
      }
      case 'completed': { return 'success'
      }
      default: { return 'grey'
      }
    }
  }

  // Handle annual update card click
  function handleAnnualUpdateClick () {
    router.push('/admin/annual-update')
  }

  // Handle parents directory card click
  function handleParentsClick () {
    router.push('/admin/parents')
  }

  // Handle students table card click
  function handleStudentsClick () {
    router.push('/admin/students')
  }

  // Load current workflow for dashboard overview
  async function loadWorkflowData () {
    try {
      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/getWorkflowStatusV2`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await authStore.user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      currentWorkflow.value = data.current
    } catch (error) {
      console.error('Failed to load workflow data:', error)
    }
  }

  // Load staff update token
  async function loadStaffUpdateToken () {
    try {
      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/getStaffUpdateToken`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await authStore.user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to load staff update token:', response.status)
        return
      }

      const data = await response.json()
      staffUpdateToken.value = data.token
    } catch (error) {
      console.error('Failed to load staff update token:', error)
    }
  }

  // Open staff update link in new tab
  function openStaffUpdateLink () {
    if (!staffUpdateToken.value) return
    const baseUrl = window.location.origin
    const updateUrl = `${baseUrl}/staff-update/${staffUpdateToken.value}`
    window.open(updateUrl, '_blank')
  }

  // Copy staff update link to clipboard
  async function copyStaffUpdateLink () {
    if (!staffUpdateToken.value) return
    const baseUrl = window.location.origin
    const updateUrl = `${baseUrl}/staff-update/${staffUpdateToken.value}`

    try {
      await navigator.clipboard.writeText(updateUrl)
      console.log('Staff update link copied to clipboard:', updateUrl)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = updateUrl
      document.body.append(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      console.log('Staff update link copied to clipboard (fallback):', updateUrl)
    }
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await Promise.all([
        loadWorkflowData(),
        loadStaffUpdateToken(),
      ])
    }
  })

  // Watch for authentication changes
  watch(() => authStore.isAuthenticated, async newValue => {
    if (newValue) {
      await checkAdminStatus()
      if (isAuthorized.value) {
        await Promise.all([
          loadWorkflowData(),
          loadStaffUpdateToken(),
        ])
      }
    } else {
      isAuthorized.value = false
      adminStatus.value = null
    }
  })
</script>

<style scoped>
  .admin-card {
    transition: all 0.3s ease;
  }

  .admin-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .cursor-pointer {
    cursor: pointer;
  }
</style>

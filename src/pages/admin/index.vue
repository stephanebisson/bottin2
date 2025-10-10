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

        <!-- School Year Progression -->
        <v-col cols="12" lg="4" md="6">
          <v-card
            class="h-100 cursor-pointer admin-card"
            hover
            @click="handleProgressionClick"
          >
            <v-card-text class="text-center pa-6">
              <v-icon class="mb-4" color="primary" size="64">mdi-school-sync</v-icon>
              <h3 class="text-h6 font-weight-bold mb-2">{{ $t('admin.schoolProgressionWorkflow') }}</h3>
              <p class="text-body-2 text-grey-darken-1">
                {{ $t('admin.schoolProgressionDescription') }}
              </p>

              <!-- Quick Status -->
              <div v-if="currentProgressionWorkflow" class="mt-4">
                <v-chip
                  :color="getWorkflowStatusColor(currentProgressionWorkflow.status)"
                  size="small"
                  variant="tonal"
                >
                  {{ $t(`admin.status.${currentProgressionWorkflow.status}`) }}
                </v-chip>
                <div class="text-body-2 mt-2">
                  {{ $t('admin.studentsProgressing', {
                    total: currentProgressionWorkflow.stats?.totalStudents || 0,
                    needsAssignment: currentProgressionWorkflow.stats?.needsClassAssignment || 0
                  }) }}
                </div>
              </div>
              <div v-else class="mt-4">
                <v-chip color="grey" size="small" variant="tonal">
                  {{ $t('admin.noActiveProgressionWorkflow') }}
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
  const currentProgressionWorkflow = ref(null)

  // Check if user is authorized using Firebase Custom Claims
  const isAuthorized = ref(false)
  const adminStatus = ref(null)

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
  const getWorkflowStatusColor = status => {
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
  const handleAnnualUpdateClick = () => {
    router.push('/admin/annual-update')
  }

  // Handle school progression card click
  const handleProgressionClick = () => {
    router.push('/admin/school-progression')
  }

  // Handle parents directory card click
  const handleParentsClick = () => {
    router.push('/admin/parents')
  }

  // Load current workflow for dashboard overview
  const loadWorkflowData = async () => {
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

  // Load current progression workflow for dashboard overview
  const loadProgressionWorkflowData = async () => {
    try {
      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/getProgressionStatusV2`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await authStore.user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      currentProgressionWorkflow.value = data.current
    } catch (error) {
      console.error('Failed to load progression workflow data:', error)
    }
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await Promise.all([
        loadWorkflowData(),
        loadProgressionWorkflowData(),
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
          loadProgressionWorkflowData(),
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

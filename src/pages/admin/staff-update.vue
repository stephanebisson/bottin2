<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <v-btn
          class="mb-2"
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="$router.push('/admin/annual-update')"
        >
          {{ $t('admin.backToAdminDashboard') }}
        </v-btn>
        <h1 class="text-h3 font-weight-bold">{{ $t('admin.staffUpdate.title') }}</h1>
      </div>
    </div>

    <!-- Access Control -->
    <div v-if="!isAuthorized" class="text-center py-12">
      <v-icon color="error" size="64">mdi-shield-alert</v-icon>
      <h2 class="text-h5 mt-4 text-error">{{ $t('admin.accessDenied') }}</h2>
      <p class="text-body-1 text-grey-darken-1 mt-2">
        {{ $t('admin.adminAccessRequired') }}
      </p>
    </div>

    <!-- Admin Content -->
    <div v-else>
      <!-- Token Status Card -->
      <v-card class="mb-6">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-key</v-icon>
          {{ $t('admin.staffUpdate.tokenStatus') }}
        </v-card-title>

        <v-card-text>
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular color="primary" indeterminate size="64" />
            <p class="text-body-1 mt-4">{{ $t('common.loading') }}</p>
          </div>

          <!-- Token Exists -->
          <div v-else-if="staffUpdateToken">
            <v-alert
              class="mb-4"
              color="success"
              icon="mdi-check-circle"
              variant="tonal"
            >
              <div class="text-body-1">
                {{ $t('admin.staffUpdate.tokenGenerated') }}
              </div>
            </v-alert>

            <!-- Staff Update Link -->
            <div class="d-flex flex-column gap-2">
              <v-text-field
                hide-details
                label="Staff update URL"
                :model-value="staffUpdateUrl"
                prepend-icon="mdi-link"
                readonly
                variant="outlined"
              />

              <div class="d-flex gap-2">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-open-in-new"
                  @click="openStaffUpdateLink"
                >
                  {{ $t('admin.staffUpdate.openLink') }}
                </v-btn>

                <v-btn
                  color="grey"
                  prepend-icon="mdi-content-copy"
                  variant="outlined"
                  @click="copyStaffUpdateLink"
                >
                  {{ $t('admin.staffUpdate.copyLink') }}
                </v-btn>
              </div>
            </div>

            <!-- Token Info -->
            <v-card class="mt-4" variant="outlined">
              <v-card-text>
                <div class="text-body-2">
                  <strong>{{ $t('admin.staffUpdate.tokenCreated') }}:</strong>
                  {{ formatDate(staffUpdateData?.createdAt) }}
                </div>
                <div v-if="staffUpdateData?.createdBy" class="text-body-2 mt-2">
                  <strong>{{ $t('admin.staffUpdate.createdBy') }}:</strong>
                  {{ staffUpdateData.createdBy }}
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- No Token - Show Generate Button -->
          <div v-else class="text-center py-8">
            <v-icon color="grey-darken-2" size="64">mdi-key-plus</v-icon>
            <p class="text-h6 mt-4 text-grey-darken-2">
              {{ $t('admin.staffUpdate.noTokenGenerated') }}
            </p>
            <p class="text-body-2 text-grey-darken-1 mt-2">
              {{ $t('admin.staffUpdate.generateTokenInstructions') }}
            </p>

            <v-btn
              class="mt-6"
              color="primary"
              :loading="generating"
              prepend-icon="mdi-key-plus"
              size="large"
              @click="generateToken"
            >
              {{ $t('admin.staffUpdate.generateToken') }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Information Card -->
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-information</v-icon>
          {{ $t('admin.staffUpdate.aboutTitle') }}
        </v-card-title>

        <v-card-text>
          <p class="text-body-1 mb-4">
            {{ $t('admin.staffUpdate.aboutDescription') }}
          </p>

          <v-alert
            color="info"
            icon="mdi-shield-check"
            variant="tonal"
          >
            <div class="text-body-2">
              <strong>{{ $t('admin.staffUpdate.securityNote') }}</strong>
              {{ $t('admin.staffUpdate.securityNoteDescription') }}
            </div>
          </v-alert>
        </v-card-text>
      </v-card>
    </div>

    <!-- Success Snackbar -->
    <v-snackbar
      v-model="showSuccessSnackbar"
      color="success"
      :timeout="3000"
    >
      {{ successMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { useAuthStore } from '@/stores/auth'

  const { t } = useI18n()
  const authStore = useAuthStore()

  // State
  const loading = ref(true)
  const generating = ref(false)
  const isAuthorized = ref(false)
  const staffUpdateToken = ref(null)
  const staffUpdateData = ref(null)
  const showSuccessSnackbar = ref(false)
  const successMessage = ref('')

  // Computed
  const staffUpdateUrl = computed(() => {
    if (!staffUpdateToken.value) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/staff-update/${staffUpdateToken.value}`
  })

  // Check admin status
  const checkAdminStatus = async () => {
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

  // Load staff update token
  const loadStaffUpdateToken = async () => {
    try {
      loading.value = true

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/getStaffUpdateToken`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await authStore.user.getIdToken()}`,
        },
      })

      if (response.status === 404) {
        // No token exists yet
        staffUpdateToken.value = null
        staffUpdateData.value = null
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      staffUpdateToken.value = data.token
      staffUpdateData.value = data
    } catch (error) {
      console.error('Failed to load staff update token:', error)
      staffUpdateToken.value = null
      staffUpdateData.value = null
    } finally {
      loading.value = false
    }
  }

  // Generate new staff update token
  const generateToken = async () => {
    try {
      generating.value = true

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/generateStaffUpdateToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          adminEmail: authStore.userEmail,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      staffUpdateToken.value = data.token
      staffUpdateData.value = data

      successMessage.value = t('admin.staffUpdate.tokenGeneratedSuccess')
      showSuccessSnackbar.value = true
    } catch (error) {
      console.error('Failed to generate staff update token:', error)
      alert(t('admin.staffUpdate.tokenGenerationError'))
    } finally {
      generating.value = false
    }
  }

  // Open staff update link in new tab
  const openStaffUpdateLink = () => {
    if (!staffUpdateToken.value) return
    window.open(staffUpdateUrl.value, '_blank')
  }

  // Copy staff update link to clipboard
  const copyStaffUpdateLink = async () => {
    if (!staffUpdateToken.value) return

    try {
      await navigator.clipboard.writeText(staffUpdateUrl.value)
      successMessage.value = t('admin.staffUpdate.linkCopied')
      showSuccessSnackbar.value = true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = staffUpdateUrl.value
      document.body.append(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      successMessage.value = t('admin.staffUpdate.linkCopied')
      showSuccessSnackbar.value = true
    }
  }

  // Format date helper
  const formatDate = timestamp => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await loadStaffUpdateToken()
    }
  })
</script>

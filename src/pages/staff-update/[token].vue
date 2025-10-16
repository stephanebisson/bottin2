<template>
  <v-container class="py-8" fluid>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('staffUpdate.loadingInfo') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <v-icon color="warning" size="64">mdi-information-outline</v-icon>
      <h2 class="text-h4 mt-4 text-warning">{{ getErrorTitle() }}</h2>
      <p class="text-body-1 mt-2 text-grey-darken-1">{{ getErrorMessage() }}</p>

      <!-- Action buttons -->
      <div class="mt-6">
        <v-btn
          v-if="errorType === 'network' || errorType === 'temporary'"
          class="mr-2"
          color="primary"
          variant="flat"
          @click="retryLoad"
        >
          <v-icon class="mr-2">mdi-refresh</v-icon>
          {{ $t('common.tryAgain') }}
        </v-btn>

        <v-btn
          color="secondary"
          variant="outlined"
          @click="$router.push('/')"
        >
          <v-icon class="mr-2">mdi-home</v-icon>
          {{ $t('common.goHome') }}
        </v-btn>
      </div>

      <!-- Contact info for persistent issues -->
      <v-alert
        v-if="errorType === 'expired' || retryCount >= 2"
        class="mt-6 mx-auto"
        color="info"
        icon="mdi-email"
        max-width="500"
        variant="tonal"
      >
        {{ $t('staffUpdate.contactSchool') }}
      </v-alert>
    </div>

    <!-- Version Selector and Form -->
    <div v-else-if="tokenValid">
      <!-- Version Toggle -->
      <v-alert
        v-if="currentVersion === 1"
        class="mb-4"
        closable
        color="info"
        icon="mdi-information"
        variant="tonal"
      >
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-body-1 font-weight-bold">You're using V1 (older version)</div>
            <div class="text-body-2">The latest version has improved features and interface.</div>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-arrow-up-bold"
            size="small"
            variant="elevated"
            @click="switchToLatest"
          >
            Switch to Latest (V2)
          </v-btn>
        </div>
      </v-alert>

      <v-alert
        v-else
        class="mb-4"
        closable
        color="success"
        icon="mdi-check-circle"
        variant="tonal"
      >
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-body-1 font-weight-bold">You're using V2 (latest version)</div>
            <div class="text-body-2">Need to go back to the previous version?</div>
          </div>
          <v-btn
            color="grey"
            prepend-icon="mdi-arrow-down"
            size="small"
            variant="text"
            @click="switchToV1"
          >
            Switch to V1
          </v-btn>
        </div>
      </v-alert>

      <!-- Render the appropriate form component -->
      <component :is="currentFormComponent" :token="token" />
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import StaffUpdateFormV1 from '@/components/StaffUpdateFormV1.vue'
  import StaffUpdateFormV2 from '@/components/StaffUpdateFormV2.vue'
  import { useI18n } from '@/composables/useI18n'
  import { getFunctionsBaseUrl } from '@/config/functions'

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  // State
  const loading = ref(true)
  const error = ref(null)
  const errorType = ref(null) // 'network', 'expired', 'temporary', 'invalid'
  const retryCount = ref(0)
  const tokenValid = ref(false)

  // Get token from route params
  const token = computed(() => route.params.token)

  // Get version from query parameter, default to 2 (latest)
  const currentVersion = computed(() => {
    const versionParam = route.query.v
    return versionParam === '1' ? 1 : 2
  })

  // Get the appropriate form component based on version
  const currentFormComponent = computed(() => {
    return currentVersion.value === 1 ? StaffUpdateFormV1 : StaffUpdateFormV2
  })

  // Switch to latest version (V2)
  const switchToLatest = () => {
    router.push({
      path: route.path,
      query: { ...route.query, v: undefined }, // Remove v parameter to default to v2
    })
  }

  // Switch to V1
  const switchToV1 = () => {
    router.push({
      path: route.path,
      query: { ...route.query, v: '1' },
    })
  }

  // Validate token with backend
  const validateToken = async () => {
    try {
      loading.value = true
      error.value = null
      errorType.value = null

      // Validate token exists
      if (!token.value) {
        error.value = 'missing_token'
        errorType.value = 'invalid'
        return
      }

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/validateStaffUpdateToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.value }),
      })

      if (!response.ok) {
        // Set appropriate error type and message
        if (response.status === 404 || response.status === 410) {
          error.value = 'expired_token'
          errorType.value = 'expired'
        } else if (response.status >= 500) {
          error.value = 'server_error'
          errorType.value = 'temporary'
        } else {
          error.value = 'network_error'
          errorType.value = 'network'
        }
        return
      }

      const data = await response.json()

      if (!data.valid) {
        error.value = 'invalid_token'
        errorType.value = 'expired'
        return
      }

      // Token is valid
      tokenValid.value = true
    } catch (error_) {
      console.error('Failed to validate token:', error_)

      // Show friendly error message
      if (error_.message.includes('network') || error_.message.includes('fetch')) {
        error.value = 'network_error'
        errorType.value = 'network'
      } else {
        error.value = 'unexpected_error'
        errorType.value = 'temporary'
      }
    } finally {
      loading.value = false
    }
  }

  // Retry loading data
  const retryLoad = async () => {
    retryCount.value++
    await validateToken()
  }

  // Get user-friendly error title
  const getErrorTitle = () => {
    switch (error.value) {
      case 'missing_token':
      case 'invalid_token':
      case 'expired_token': {
        return t('staffUpdate.linkExpired')
      }
      case 'server_error': {
        return t('staffUpdate.serviceIssue')
      }
      case 'network_error': {
        return t('staffUpdate.connectionIssue')
      }
      default: {
        return t('staffUpdate.unexpectedIssue')
      }
    }
  }

  // Get user-friendly error message
  const getErrorMessage = () => {
    switch (error.value) {
      case 'missing_token':
      case 'invalid_token': {
        return t('staffUpdate.invalidLinkMessage')
      }
      case 'expired_token': {
        return t('staffUpdate.expiredLinkMessage')
      }
      case 'server_error': {
        return t('staffUpdate.serverErrorMessage')
      }
      case 'network_error': {
        return t('staffUpdate.networkErrorMessage')
      }
      default: {
        return t('staffUpdate.unexpectedErrorMessage')
      }
    }
  }

  onMounted(async () => {
    await validateToken()
  })
</script>

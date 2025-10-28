<template>
  <v-container class="py-8">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('updateForm.loadingInfo') }}</p>
    </div>

    <!-- Error State with Friendly Messages -->
    <div v-else-if="error" class="text-center py-12">
      <v-icon color="warning" size="64">mdi-information-outline</v-icon>
      <h2 class="text-h4 mt-4 text-warning">{{ getErrorTitle() }}</h2>
      <p class="text-body-1 mt-2 text-grey-darken-1">{{ getErrorMessage() }}</p>

      <!-- Action buttons based on error type -->
      <div class="mt-6">
        <v-btn
          v-if="errorType === 'network' || errorType === 'temporary'"
          class="mr-2"
          color="primary"
          variant="flat"
          @click="retryLoad"
        >
          <v-icon class="mr-2">mdi-refresh</v-icon>
          Try Again
        </v-btn>

        <v-btn
          color="secondary"
          variant="outlined"
          @click="$router.push('/')"
        >
          <v-icon class="mr-2">mdi-home</v-icon>
          {{ $t('updateForm.goHome') }}
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
        If you continue to have issues, please contact the school office for assistance.
      </v-alert>
    </div>

    <!-- Update Form -->
    <div v-else-if="parentData">
      <v-card>
        <v-card-title class="d-flex align-center bg-primary text-white">
          <v-icon class="mr-2">mdi-account-edit</v-icon>
          {{ $t('updateForm.title') }}
        </v-card-title>

        <v-card-text class="pa-6">
          <!-- Welcome Message -->
          <v-alert
            class="mb-6"
            color="info"
            icon="mdi-information"
            variant="tonal"
          >
            <div class="text-body-1">
              {{ $t('updateForm.welcome', { name: `${parentData.first_name} ${parentData.last_name}` }) }}
            </div>
            <div class="text-body-2 mt-2">
              {{ $t('updateForm.instructions') }}
            </div>
          </v-alert>

          <!-- Opt-Out Warning Box (show if not currently opted out) -->
          <v-alert
            v-if="!parentData.optedOut"
            border="start"
            border-color="warning"
            class="mb-6"
            color="warning"
            icon="mdi-alert-octagon"
            variant="tonal"
          >
            <div class="text-body-1 font-weight-medium">
              {{ $t('updateForm.optOutWarningBox') }}
            </div>
            <div class="text-body-2 mt-2 mb-3">
              {{ $t('updateForm.optOutWarningBoxDescription') }}
            </div>
            <v-btn
              color="error"
              prepend-icon="mdi-account-remove"
              size="small"
              variant="outlined"
              @click="showOptOutDialog = true"
            >
              {{ $t('updateForm.optOutButton') }}
            </v-btn>
          </v-alert>

          <!-- Re-Opt-In Info Box (show if currently opted out) -->
          <v-alert
            v-if="parentData.optedOut"
            border="start"
            border-color="info"
            class="mb-6"
            color="info"
            icon="mdi-information-outline"
            variant="tonal"
          >
            <div class="text-body-1 font-weight-medium">
              {{ $t('updateForm.reOptInWarningBox') }}
            </div>
            <div class="text-body-2 mt-2">
              {{ $t('updateForm.reOptInWarningBoxDescription') }}
            </div>
          </v-alert>

          <v-form ref="formRef" @submit.prevent="submitForm">
            <v-row>
              <!-- Personal Information Section -->
              <v-col cols="12">
                <h3 class="text-h6 font-weight-bold mb-4">
                  <v-icon class="mr-2">mdi-account</v-icon>
                  {{ $t('updateForm.personalInfo') }}
                </h3>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.first_name"
                  :label="$t('updateForm.firstName')"
                  :rules="[rules.required]"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.last_name"
                  :label="$t('updateForm.lastName')"
                  :rules="[rules.required]"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.phone"
                  :error="form.phone && !isValidPhoneFormat(form.phone)"
                  :error-messages="form.phone && !isValidPhoneFormat(form.phone) ? getPhoneValidationMessage(form.phone, $t) : ''"
                  :label="$t('updateForm.phone')"
                  placeholder="(123) 456-7890"
                  variant="outlined"
                  @blur="formatPhoneOnBlur"
                  @input="handlePhoneInput"
                />
              </v-col>

              <!-- Address Section -->
              <v-col cols="12">
                <h3 class="text-h6 font-weight-bold mb-4 mt-4">
                  <v-icon class="mr-2">mdi-map-marker</v-icon>
                  {{ $t('updateForm.address') }}
                </h3>
              </v-col>

              <!-- Address Fields -->
              <v-col cols="12">
                <v-text-field
                  v-model="form.address"
                  :label="$t('updateForm.streetAddress')"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="8">
                <v-text-field
                  v-model="form.city"
                  :label="$t('updateForm.city')"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.postal_code"
                  :error="form.postal_code && !isValidPostalCodeFormat(form.postal_code)"
                  :error-messages="form.postal_code && !isValidPostalCodeFormat(form.postal_code) ? getPostalCodeValidationMessage(form.postal_code, $t) : ''"
                  :label="$t('updateForm.postalCode')"
                  maxlength="7"
                  :placeholder="getSamplePostalCode()"
                  variant="outlined"
                  @blur="formatPostalCodeOnBlur"
                  @input="handlePostalCodeInput"
                />
              </v-col>

              <!-- Same Address Checkbox (only show if other parent exists) -->
              <v-col v-if="otherParentInfo" cols="12">
                <v-checkbox
                  v-model="form.sameAddressAsOther"
                  color="primary"
                  @change="handleSameAddressToggle"
                >
                  <template #label>
                    <span
                      v-html="$t('updateForm.confirmOtherParentAddress', {
                        fullName: `<strong>${otherParentInfo.fullName}</strong>`
                      })"
                    />
                  </template>
                </v-checkbox>
              </v-col>

              <!-- Committee Memberships Section -->
              <v-col cols="12">
                <h3 class="text-h6 font-weight-bold mb-4 mt-4">
                  <v-icon class="mr-2">mdi-account-group</v-icon>
                  {{ $t('updateForm.committees') }}
                </h3>
              </v-col>

              <v-col cols="12">
                <div class="mb-4">
                  <p class="text-body-2 text-grey-darken-1 mb-4">
                    {{ $t('updateForm.committeeInstructions') }}
                  </p>

                  <div class="committee-grid">
                    <div
                      v-for="committee in availableCommittees"
                      :key="committee.id"
                      class="committee-item"
                    >
                      <v-checkbox
                        v-model="form.committees"
                        class="committee-checkbox"
                        color="primary"
                        density="compact"
                        hide-details
                        :label="committee.name"
                        :value="committee.id"
                        @change="handleCommitteeChange(committee.id)"
                      />

                      <v-select
                        v-if="form.committees.includes(committee.id)"
                        v-model="form.committeeRoles[committee.id]"
                        class="committee-role-select mt-2"
                        density="compact"
                        hide-details
                        :items="getCommitteeRoles(committee.name)"
                        :label="$t('updateForm.role')"
                        variant="outlined"
                      />
                    </div>
                  </div>
                </div>
              </v-col>

              <!-- Interests & Skills Section -->
              <v-col cols="12">
                <h3 class="text-h6 font-weight-bold mb-4 mt-4">
                  <v-icon class="mr-2">mdi-star</v-icon>
                  {{ $t('updateForm.interests') }}
                </h3>
              </v-col>

              <v-col cols="12">
                <div class="mb-4">
                  <p class="text-body-2 text-grey-darken-1 mb-4">
                    {{ $t('updateForm.interestsInstructions') }}
                  </p>

                  <div class="interests-grid">
                    <v-checkbox
                      v-for="interest in availableInterests"
                      :key="interest.id"
                      v-model="form.interests"
                      class="interest-checkbox"
                      color="primary"
                      density="compact"
                      hide-details
                      :label="interest.name"
                      :value="interest.id"
                    />
                  </div>
                </div>
              </v-col>

              <!-- Submit Button -->
              <v-col class="text-center pt-6" cols="12">
                <v-btn
                  color="primary"
                  :loading="submitting"
                  prepend-icon="mdi-content-save"
                  size="large"
                  type="submit"
                >
                  {{ $t('updateForm.submit') }}
                </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
      </v-card>
    </div>

    <!-- Opt-Out Confirmation Dialog -->
    <v-dialog v-model="showOptOutDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center bg-error text-white">
          <v-icon class="mr-2">mdi-alert-octagon</v-icon>
          {{ $t('updateForm.optOutDialogTitle') }}
        </v-card-title>

        <v-card-text class="pa-6">
          <div class="text-body-1 mb-4">
            {{ $t('updateForm.optOutDialogContent') }}
          </div>

          <v-alert
            class="mb-4"
            color="warning"
            icon="mdi-alert"
            variant="tonal"
          >
            {{ $t('updateForm.optOutDialogWarning') }}
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            color="grey"
            :disabled="optingOut"
            variant="outlined"
            @click="showOptOutDialog = false"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            :loading="optingOut"
            variant="flat"
            @click="confirmOptOut"
          >
            {{ optingOut ? $t('updateForm.optOutProcessing') : $t('updateForm.optOutDialogConfirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'
  import { getCommitteeRoles } from '@/config/committees'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { getAvailableInterests } from '@/config/interests'
  import { formatPhoneForDisplay, formatPhoneForStorage, getPhoneValidationMessage, isValidPhoneFormat } from '@/utils/phoneFormatter'
  import { formatPostalCodeForDisplay, formatPostalCodeForStorage, getPostalCodeValidationMessage, getSamplePostalCode, isValidPostalCodeFormat } from '@/utils/postalCodeFormatter'

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  // State
  const loading = ref(true)
  const submitting = ref(false)
  const error = ref(null)
  const errorType = ref(null) // 'network', 'expired', 'temporary', 'invalid'
  const retryCount = ref(0)
  const parentData = ref(null)
  const availableCommittees = ref([])
  const availableInterests = ref([])
  const otherParentHasAddress = ref(false)
  const otherParentInfo = ref(null)
  const formRef = ref(null)
  const showOptOutDialog = ref(false)
  const optingOut = ref(false)

  // Form data
  const form = ref({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    sameAddressAsOther: false,
    committees: [],
    committeeRoles: {}, // { committeeId: role }
    interests: [], // Array of selected interest IDs
  })

  // Validation rules
  const rules = {
    required: value => !!value || t('validation.required'),
  }

  // Get token from route params
  const token = computed(() => route.params.token)

  // Handle same address toggle
  function handleSameAddressToggle () {
    // Don't clear address fields - they should remain populated for user reference
    // The actual address saving logic is handled in submitForm where empty values
    // are sent when sameAddressAsOther is true
  }

  // Handle committee checkbox change
  function handleCommitteeChange (committeeId) {
    if (form.value.committees.includes(committeeId)) {
      // Committee was checked, set default role if not already set
      if (!form.value.committeeRoles[committeeId]) {
        const committee = availableCommittees.value.find(c => c.id === committeeId)
        const roles = getCommitteeRoles(committee?.name)
        form.value.committeeRoles[committeeId] = roles[0] || 'Membre'
      }
    } else {
      // Committee was unchecked, remove role
      delete form.value.committeeRoles[committeeId]
    }
  }

  // Phone formatting methods
  function formatPhoneOnBlur () {
    if (form.value.phone) {
      // Format for display when user finishes editing
      form.value.phone = formatPhoneForDisplay(formatPhoneForStorage(form.value.phone))
    }
  }

  function handlePhoneInput (event) {
    // Allow users to type freely, validation happens on blur/submit
    const value = event.target ? event.target.value : event
    form.value.phone = value
  }

  // Postal code formatting methods
  function formatPostalCodeOnBlur () {
    if (form.value.postal_code) {
      // Format for display when user finishes editing
      form.value.postal_code = formatPostalCodeForDisplay(formatPostalCodeForStorage(form.value.postal_code))
    }
  }

  function handlePostalCodeInput (event) {
    // Allow users to type freely, auto-format with space
    const value = event.target ? event.target.value : event
    const alphanumeric = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

    if (alphanumeric.length <= 6) {
      // Format as A9A 9A9 while typing
      form.value.postal_code = alphanumeric.length <= 3 ? alphanumeric : `${alphanumeric.slice(0, 3)} ${alphanumeric.slice(3)}`
    }
    // Don't update if more than 6 alphanumeric characters
  }

  // Load parent data using token with friendly error handling
  async function loadParentData () {
    try {
      loading.value = true
      error.value = null
      errorType.value = null

      // Validate token exists
      if (!token.value) {
        await logErrorToAnalytics('missing_token', { message: 'Token parameter missing from URL' })
        error.value = 'missing_token'
        errorType.value = 'invalid'
        return
      }

      const baseUrl = getFunctionsBaseUrl()

      console.log('Loading parent data with:', {
        token: token.value,
        tokenLength: token.value?.length,
        baseUrl,
      })

      const response = await fetch(`${baseUrl}/validateUpdateTokenV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.value }),
      })

      if (!response.ok) {
        let errorMessage = t('updateForm.serverError')

        try {
          // Try to get detailed error message from server response
          const errorData = await response.json()
          console.error('Server error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
            valid: errorData.valid,
          })

          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (jsonError) {
          console.error('Could not parse server error response:', jsonError)
          console.error('Response status:', response.status, response.statusText)
        }

        // Log error for admin review and show friendly error
        await logErrorToAnalytics('token_validation_failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          errorData,
          token: token.value?.slice(0, 8) + '...',
          retryCount: retryCount.value,
        })

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
        await logErrorToAnalytics('invalid_token_response', {
          error: data.error,
          token: token.value?.slice(0, 8) + '...',
          retryCount: retryCount.value,
        })
        error.value = 'invalid_token'
        errorType.value = 'expired'
        return
      }

      // Set parent data and form values
      parentData.value = data.parent
      availableCommittees.value = data.availableCommittees || []
      availableInterests.value = getAvailableInterests()
      otherParentHasAddress.value = data.otherParentHasAddress || false
      otherParentInfo.value = data.otherParentInfo || null

      // Use parent committee memberships from API response (no need to parse)
      const parentCommittees = data.parentCommittees || []
      const parentCommitteeRoles = data.parentCommitteeRoles || {}

      // Pre-fill form with existing data
      form.value = {
        first_name: data.parent.first_name || '',
        last_name: data.parent.last_name || '',
        phone: formatPhoneForDisplay(data.parent.phone || ''), // Format phone for display
        address: data.parent.address || '',
        city: data.parent.city || '',
        postal_code: formatPostalCodeForDisplay(data.parent.postal_code || ''), // Format postal code for display
        sameAddressAsOther: false,
        committees: parentCommittees,
        committeeRoles: parentCommitteeRoles,
        interests: Array.isArray(data.parent.interests) ? data.parent.interests : [],
      }
    } catch (error_) {
      console.error('Failed to load parent data:', error_)
      // Log error for admin review
      await logErrorToAnalytics('load_parent_data_error', {
        error: error_.message,
        stack: error_.stack,
        token: token.value?.slice(0, 8) + '...',
        retryCount: retryCount.value,
      })

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

  // Handle opt-out confirmation
  async function confirmOptOut () {
    try {
      optingOut.value = true

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/processParentOptOutV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.value,
        }),
      })

      if (!response.ok) {
        // Log error for admin review
        await logErrorToAnalytics('opt_out_failed', {
          status: response.status,
          statusText: response.statusText,
          parentEmail: parentData.value?.email || 'unknown',
        })

        // Show user-friendly error
        if (response.status === 404 || response.status === 410) {
          error.value = 'expired_token'
          errorType.value = 'expired'
        } else {
          error.value = 'opt_out_error'
          errorType.value = 'temporary'
        }
        showOptOutDialog.value = false
        return
      }

      const result = await response.json()

      // Log successful opt-out for analytics
      await logErrorToAnalytics('opt_out_success', {
        parentEmail: parentData.value?.email || 'unknown',
      })

      // Redirect to success page
      router.push({
        path: '/update-success',
        query: {
          hasAccount: result.hasAccount ? '1' : '0',
          email: parentData.value.email,
          optedOut: '1',
        },
      })
    } catch (error_) {
      console.error('Failed to process opt-out:', error_)
      // Log error for admin review
      await logErrorToAnalytics('opt_out_exception', {
        error: error_.message,
        stack: error_.stack,
        parentEmail: parentData.value?.email || 'unknown',
      })

      // Show user-friendly error
      error.value = 'opt_out_error'
      errorType.value = 'network'
      showOptOutDialog.value = false
    } finally {
      optingOut.value = false
    }
  }

  // Submit form
  async function submitForm () {
    try {
      // Validate form
      const { valid } = await formRef.value.validate()
      if (!valid) return

      submitting.value = true

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/processParentUpdateV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.value,
          parentData: {
            first_name: form.value.first_name,
            last_name: form.value.last_name,
            phone: formatPhoneForStorage(form.value.phone),
            address: form.value.address,
            city: form.value.city,
            postal_code: formatPostalCodeForStorage(form.value.postal_code),
            sameAddressAsOther: form.value.sameAddressAsOther,
            committees: form.value.committees,
            committeeRoles: form.value.committeeRoles,
            interests: form.value.interests,
          },
        }),
      })

      if (!response.ok) {
        // Log detailed error for admin review
        await logErrorToAnalytics('form_submission_failed', {
          status: response.status,
          statusText: response.statusText,
          formData: { ...form.value, phone: '***', address: '***' },
          parentEmail: parentData.value?.email || 'unknown',
        })

        // Show user-friendly error based on status
        if (response.status === 404 || response.status === 410) {
          error.value = 'expired_token'
          errorType.value = 'expired'
        } else {
          error.value = 'submission_error'
          errorType.value = 'temporary'
        }
        return
      }

      const result = await response.json()

      // Log successful submission for analytics
      await logErrorToAnalytics('form_submission_success', {
        parentEmail: parentData.value?.email || 'unknown',
        committees: form.value.committees.length,
        interests: form.value.interests.length,
      })

      // Redirect to success page
      router.push({
        path: '/update-success',
        query: {
          hasAccount: result.hasAccount ? '1' : '0',
          email: parentData.value.email,
        },
      })
    } catch (error_) {
      console.error('Failed to submit form:', error_)
      // Log error for admin review
      await logErrorToAnalytics('form_submission_exception', {
        error: error_.message,
        stack: error_.stack,
        formData: { ...form.value, phone: '***', address: '***' },
        parentEmail: parentData.value?.email || 'unknown',
      })

      // Show user-friendly error
      error.value = 'submission_error'
      errorType.value = 'network'
    } finally {
      submitting.value = false
    }
  }

  // Retry loading data
  async function retryLoad () {
    retryCount.value++
    await loadParentData()
  }

  // Get user-friendly error title
  function getErrorTitle () {
    switch (error.value) {
      case 'missing_token':
      case 'invalid_token':
      case 'expired_token': {
        return 'Update Link Expired'
      }
      case 'server_error': {
        return 'Temporary Service Issue'
      }
      case 'network_error': {
        return 'Connection Issue'
      }
      case 'submission_error': {
        return 'Submission Issue'
      }
      case 'opt_out_error': {
        return 'Opt-out Issue'
      }
      default: {
        return 'Unexpected Issue'
      }
    }
  }

  // Get user-friendly error message
  function getErrorMessage () {
    switch (error.value) {
      case 'missing_token':
      case 'invalid_token': {
        return 'This update link appears to be invalid. Please check that you used the complete link from your email.'
      }
      case 'expired_token': {
        return 'This update link has expired or the update period has ended. Please contact the school office if you need assistance.'
      }
      case 'server_error': {
        return 'We\'re experiencing temporary technical difficulties. Please try again in a few minutes.'
      }
      case 'network_error': {
        return 'Unable to connect to our servers. Please check your internet connection and try again.'
      }
      case 'submission_error': {
        return 'We encountered an issue while saving your information. Your data has been preserved and our technical team will review it.'
      }
      case 'opt_out_error': {
        return 'We encountered an issue while processing your opt-out request. Please try again or contact the school office.'
      }
      default: {
        return 'An unexpected issue occurred. Our technical team has been notified and will review your request.'
      }
    }
  }

  // Categorize errors for Firebase Analytics
  function getErrorCategory (eventName) {
    if (eventName.includes('token')) return 'authentication'
    if (eventName.includes('network') || eventName.includes('fetch')) return 'network'
    if (eventName.includes('submission')) return 'form_processing'
    if (eventName.includes('opt_out')) return 'opt_out'
    if (eventName.includes('server')) return 'server_error'
    return 'unknown'
  }

  // Log event to Firebase Analytics for admin review
  async function logErrorToAnalytics (eventName, errorDetails) {
    try {
      // Enhanced error context
      const errorContext = {
        ...errorDetails,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        token: token.value?.slice(0, 8) + '...', // Safe partial token
        sessionId: crypto.randomUUID(), // Unique session identifier
      }

      // Use appropriate console method based on event type
      const isSuccessEvent = eventName.includes('success')
      if (isSuccessEvent) {
        console.log(`Analytics Event [${eventName}]:`, errorContext)
      } else {
        console.error(`Analytics Error [${eventName}]:`, errorContext)
      }

      // Firebase Analytics implementation
      try {
        const { analytics } = await import('@/firebase')
        const { logEvent } = await import('firebase/analytics')

        // Get analytics instance
        const analyticsInstance = analytics()

        // Only log if analytics is available
        if (analyticsInstance) {
          // Log to Firebase Analytics
          await logEvent(analyticsInstance, 'parent_update_error', {
            error_type: eventName,
            // Firebase Analytics has parameter limitations, so we'll use key fields
            status: errorContext.status?.toString() || 'unknown',
            retry_count: errorContext.retryCount?.toString() || '0',
            error_category: getErrorCategory(eventName),
            // Custom dimensions for detailed analysis
            custom_error_details: JSON.stringify({
              error: errorContext.error,
              token_partial: errorContext.token,
              timestamp: errorContext.timestamp,
            }).slice(0, 500), // Firebase has 500 char limit
          })
        }
      } catch (analyticsError) {
        console.error('Firebase Analytics logging failed:', analyticsError)
      }

      // For now, we'll log to console with clear formatting for admin review
      const groupIcon = isSuccessEvent ? '✅' : '🚨'
      console.group(`${groupIcon} FIREBASE ANALYTICS: ${eventName}`)
      if (isSuccessEvent) {
        console.log('Event Data:', {
          event_name: 'parent_update_event',
          parameters: {
            event_type: eventName,
            ...errorContext,
          },
        })
      } else {
        console.error('Event Data:', {
          event_name: 'parent_update_error',
          parameters: {
            error_type: eventName,
            ...errorContext,
          },
        })
      }
      console.groupEnd()
    } catch (analyticsError) {
      console.error('Failed to log error to analytics:', analyticsError)
    }
  }

  onMounted(() => {
    loadParentData()
  })
</script>

<style scoped>
.v-card-title {
  border-radius: 4px 4px 0 0;
  word-wrap: break-word;
  white-space: normal;
  line-height: 1.3;
}

.committee-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px 20px;
  align-items: start;
}

.interests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 8px 12px;
  align-items: start;
}

.committee-item {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
}

.committee-checkbox {
  width: 100%;
  margin: 0;
}

.committee-checkbox :deep(.v-input__control) {
  min-height: 32px;
  width: 100%;
}

.committee-checkbox :deep(.v-checkbox .v-selection-control__wrapper) {
  height: 32px;
}

.committee-checkbox :deep(.v-label) {
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.2;
  max-width: calc(100% - 48px);
  font-weight: 500;
}

.committee-role-select {
  width: 100%;
}

.committee-role-select :deep(.v-field__input) {
  min-height: 32px;
}

.interest-checkbox {
  width: 100%;
  margin: 0;
}

.interest-checkbox :deep(.v-input__control) {
  min-height: 28px;
  width: 100%;
}

.interest-checkbox :deep(.v-checkbox .v-selection-control__wrapper) {
  height: 28px;
}

.interest-checkbox :deep(.v-label) {
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.1;
  font-size: 0.875rem;
  font-weight: 400;
}

/* Submit button text wrapping */
.v-btn :deep(.v-btn__content) {
  white-space: normal;
  word-wrap: break-word;
  text-align: center;
  line-height: 1.2;
}

@media (max-width: 600px) {
  .committee-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .interests-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .committee-item {
    padding: 8px;
  }

  /* Ensure title wraps properly on mobile */
  .v-card-title {
    padding: 12px 16px;
    font-size: 1.15rem !important;
    line-height: 1.2;
  }

  /* Make submit button more compact on mobile */
  .v-btn.v-btn--size-large {
    min-width: 120px;
    padding: 0 16px;
  }

  .v-btn.v-btn--size-large :deep(.v-btn__content) {
    font-size: 0.9rem;
  }
}

@media (max-width: 400px) {
  /* Extra small screens */
  .v-card-title {
    font-size: 1.1rem !important;
    padding: 10px 12px;
  }

  .v-btn.v-btn--size-large {
    min-width: 100px;
    padding: 0 12px;
  }

  .v-btn.v-btn--size-large :deep(.v-btn__content) {
    font-size: 0.85rem;
  }
}
</style>

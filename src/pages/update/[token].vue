<template>
  <v-container>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-title-large mt-4">{{ $i18n('updateForm.loadingInfo') }}</p>
    </div>

    <!-- Error State with Friendly Messages -->
    <div v-else-if="error" class="text-center py-12">
      <v-icon color="warning" size="64">mdi-information-outline</v-icon>
      <h2 class="text-headline-large mt-4 text-warning">{{ $i18n(`updateForm.error.${errorKey}.title`) }}</h2>
      <p class="text-body-large mt-2 text-medium-emphasis">{{ $i18n(`updateForm.error.${errorKey}.message`) }}</p>

      <!-- Action buttons based on error type -->
      <div class="mt-6">
        <v-btn
          v-if="errorType === 'network' || errorType === 'temporary'"
          class="me-2"
          color="primary"
          prepend-icon="mdi-refresh"
          variant="flat"
          @click="retryLoad"
        >
          {{ $i18n('common.retry') }}
        </v-btn>

        <v-btn
          color="secondary"
          prepend-icon="mdi-home"
          variant="outlined"
          @click="$router.push('/')"
        >
          {{ $i18n('updateForm.goHome') }}
        </v-btn>
      </div>

      <!-- Contact info for persistent issues -->
      <v-alert
        v-if="retryCount >= 2"
        class="mt-6 mx-auto"
        color="info"
        icon="mdi-email"
        max-width="500"
        variant="tonal"
      >
        {{ $i18n('updateForm.error.contactOffice') }}
      </v-alert>
    </div>

    <!-- Update Form -->
    <div v-else-if="parentData">
      <!-- Welcome -->
      <div class="mb-6">
        <h2 class="text-headline-small font-weight-bold mb-2">
          {{ $i18n('updateForm.welcome', parentData.fullName || `${parentData.first_name} ${parentData.last_name}`) }}
        </h2>

        <p class="text-body-large text-medium-emphasis">
          {{ $i18n('updateForm.instructions') }}
        </p>
      </div>

      <!-- Re-Opt-In Info (show if currently opted out) -->
      <v-alert
        v-if="parentData.optedOut"
        class="mb-6"
        color="info"
        icon="mdi-information-outline"
        :text="$i18n('updateForm.reOptInWarningBoxDescription')"
        :title="$i18n('updateForm.reOptInWarningBox')"
        variant="tonal"
      />

      <v-form ref="formRef" @submit.prevent="submitForm">
        <!-- Personal Information Section -->
        <v-card class="mb-6">
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" color="primary">mdi-account</v-icon>
            {{ $i18n('updateForm.personalInfo') }}
          </v-card-title>

          <v-card-text class="pt-4">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.first_name"
                  density="compact"
                  :label="`${$i18n('updateForm.firstName')} *`"
                  :rules="[rules.required]"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.last_name"
                  density="compact"
                  :label="`${$i18n('updateForm.lastName')} *`"
                  :rules="[rules.required]"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.phone"
                  density="compact"
                  :error="form.phone && !isValidPhoneFormat(form.phone)"
                  :error-messages="form.phone && !isValidPhoneFormat(form.phone) ? getPhoneValidationMessage(form.phone, $i18n) : ''"
                  :label="$i18n('updateForm.phone')"
                  placeholder="(123) 456-7890"
                  variant="outlined"
                  @blur="formatPhoneOnBlur"
                  @input="handlePhoneInput"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Address Section -->
        <v-card class="mb-6">
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" color="primary">mdi-map-marker</v-icon>
            {{ $i18n('updateForm.address') }}
          </v-card-title>

          <v-card-text class="pt-4">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="form.address"
                  density="compact"
                  :label="$i18n('updateForm.streetAddress')"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="8">
                <v-text-field
                  v-model="form.city"
                  density="compact"
                  :label="$i18n('updateForm.city')"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.postal_code"
                  density="compact"
                  :error="form.postal_code && !isValidPostalCodeFormat(form.postal_code)"
                  :error-messages="form.postal_code && !isValidPostalCodeFormat(form.postal_code) ? getPostalCodeValidationMessage(form.postal_code, $i18n) : ''"
                  :label="$i18n('updateForm.postalCode')"
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
                  density="compact"
                  hide-details
                >
                  <template #label>
                    <span
                      v-html="$i18n('updateForm.confirmOtherParentAddress', otherParentNameHtml)"
                    />
                  </template>
                </v-checkbox>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Committee Memberships Section -->
        <v-card class="mb-6">
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" :color="ENTITY_STYLES.committee.color">{{ ENTITY_STYLES.committee.icon }}</v-icon>
            {{ $i18n('updateForm.committees') }}
          </v-card-title>

          <v-card-text>
            <p class="text-body-medium text-medium-emphasis mb-4">
              {{ $i18n('updateForm.committeeInstructions') }}
            </p>

            <div class="committee-grid">
              <div
                v-for="committee in availableCommittees"
                :key="committee.id"
                class="committee-item"
              >
                <v-checkbox
                  v-model="form.committees"
                  class="flex-grow-1"
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
                  class="committee-role-select"
                  density="compact"
                  hide-details
                  :items="getCommitteeRoles(committee.name)"
                  :label="$i18n('updateForm.role')"
                  variant="outlined"
                />
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Interests & Skills Section -->
        <v-card class="mb-6">
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" :color="ENTITY_STYLES.interests.color">{{ ENTITY_STYLES.interests.icon }}</v-icon>
            {{ $i18n('updateForm.interests') }}
          </v-card-title>

          <v-card-text>
            <p class="text-body-medium text-medium-emphasis mb-4">
              {{ $i18n('updateForm.interestsInstructions') }}
            </p>

            <div class="interests-grid">
              <v-checkbox
                v-for="interest in availableInterests"
                :key="interest.id"
                v-model="form.interests"
                color="primary"
                density="compact"
                hide-details
                :label="interest.name"
                :value="interest.id"
              />
            </div>
          </v-card-text>
        </v-card>

        <!-- Submit -->
        <div class="text-center pt-2">
          <!-- Privacy notice at the point of collection (Law 25); opens in a new tab so the form is not lost -->
          <p class="text-body-medium text-medium-emphasis mb-4 mx-auto privacy-notice">
            {{ $i18n('updateForm.privacyNotice') }}
            <a class="text-no-wrap" href="/privacy" rel="noopener" target="_blank">{{ $i18n('legal.privacyPolicy') }}</a>
          </p>

          <v-btn
            color="primary"
            :loading="submitting"
            prepend-icon="mdi-content-save"
            size="large"
            type="submit"
          >
            {{ $i18n('updateForm.submit') }}
          </v-btn>

          <!-- Opt-out (only if not currently opted out) -->
          <p v-if="!parentData.optedOut" class="text-body-medium text-medium-emphasis mt-8">
            {{ $i18n('updateForm.optOutPrompt') }}
            <a class="text-no-wrap" href="#" role="button" @click.prevent="showOptOutDialog = true">{{ $i18n('updateForm.optOutButton') }}</a>
          </p>
        </div>
      </v-form>
    </div>

    <!-- Opt-Out Confirmation Dialog -->
    <v-dialog v-model="showOptOutDialog" max-width="500px" :persistent="optingOut">
      <v-card>
        <v-card-title class="d-flex align-center bg-error text-white">
          <v-icon class="me-2">mdi-alert-octagon</v-icon>
          {{ $i18n('updateForm.optOutDialogTitle') }}
        </v-card-title>

        <v-card-text class="pa-6">
          <p class="text-body-large mb-4">
            {{ $i18n('updateForm.optOutDialogContent') }}
          </p>

          <p class="text-body-medium text-medium-emphasis">
            {{ $i18n('updateForm.optOutDialogWarning') }}
          </p>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />

          <v-btn
            :disabled="optingOut"
            variant="outlined"
            @click="showOptOutDialog = false"
          >
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="error"
            :loading="optingOut"
            variant="flat"
            @click="confirmOptOut"
          >
            {{ optingOut ? $i18n('updateForm.optOutProcessing') : $i18n('updateForm.optOutDialogConfirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useTranslate } from '@/composables/useTranslate'
  import { getCommitteeRoles } from '@/config/committees'
  import { ENTITY_STYLES } from '@/config/entities'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { getAvailableInterests } from '@/config/interests'
  import { formatPhoneForDisplay, formatPhoneForStorage, getPhoneValidationMessage, isValidPhoneFormat } from '@/utils/phoneFormatter'
  import { formatPostalCodeForDisplay, formatPostalCodeForStorage, getPostalCodeValidationMessage, getSamplePostalCode, isValidPostalCodeFormat } from '@/utils/postalCodeFormatter'

  definePage({ meta: { titleKey: 'updateForm.title', hideRefresh: true } })

  const $i18n = useTranslate()
  const route = useRoute()
  const router = useRouter()
  // State
  const loading = ref(true)
  const submitting = ref(false)
  const error = ref(null)
  const errorType = ref(null) // 'network', 'expired', 'temporary', 'invalid'
  const retryCount = ref(0)
  const parentData = ref(null)
  const availableCommittees = ref([])
  const availableInterests = ref([])
  const otherParentInfo = ref(null)

  // Escaped because it is rendered with v-html
  const otherParentNameHtml = computed(() => {
    const name = otherParentInfo.value?.fullName || ''
    const escaped = name.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c])
    return `<strong>${escaped}</strong>`
  })
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
    required: value => !!value || $i18n('validation.required'),
  }

  // Get token from route params
  const token = computed(() => route.params.token)

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
    const alphanumeric = value.replace(/[^A-Z0-9]/gi, '').toUpperCase()

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
        error.value = 'missing_token'
        errorType.value = 'invalid'
        return
      }

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/validateUpdateTokenV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.value }),
      })

      if (!response.ok) {
        try {
          // Try to get detailed error message from server response
          const errorData = await response.json()
          console.error('Server error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
            valid: errorData.valid,
          })
        } catch (jsonError) {
          console.error('Could not parse server error response:', jsonError)
          console.error('Response status:', response.status, response.statusText)
        }

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

      // Set parent data and form values
      parentData.value = data.parent
      availableCommittees.value = data.availableCommittees || []
      availableInterests.value = getAvailableInterests()
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

      // Redirect to success page
      router.push({
        path: '/update-success',
        query: {
          account: result.accountStatus,
          email: parentData.value.email,
          optedOut: '1',
        },
      })
    } catch (error_) {
      console.error('Failed to process opt-out:', error_)

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

      // Redirect to success page
      router.push({
        path: '/update-success',
        query: {
          account: result.accountStatus,
          email: parentData.value.email,
        },
      })
    } catch (error_) {
      console.error('Failed to submit form:', error_)

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

  // Error code → updateForm.error.<key> title and message
  const ERROR_KEYS = {
    missing_token: 'invalidLink',
    invalid_token: 'invalidLink',
    expired_token: 'expiredLink',
    server_error: 'server',
    network_error: 'network',
    submission_error: 'submission',
    opt_out_error: 'optOut',
  }
  const errorKey = computed(() => ERROR_KEYS[error.value] || 'unexpected')

  onMounted(() => {
    loadParentData()
  })
</script>

<style scoped>
.privacy-notice {
  max-width: 600px;
}

.committee-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 4px 24px;
}

/* Same height whether or not the role picker shows, so rows line up */
.committee-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
}

.committee-role-select {
  flex: 0 0 160px;
}

.interests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 0 24px;
}
</style>

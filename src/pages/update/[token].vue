<template>
  <v-container class="py-8">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('updateForm.loadingInfo') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <v-icon color="error" size="64">mdi-alert-circle</v-icon>
      <h2 class="text-h4 mt-4 text-error">{{ $t('updateForm.errorTitle') }}</h2>
      <p class="text-body-1 mt-2 text-grey-darken-1">{{ error }}</p>
      <v-btn class="mt-4" color="primary" variant="outlined" @click="$router.push('/')">
        {{ $t('updateForm.goHome') }}
      </v-btn>
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
                  :label="$t('updateForm.phone')"
                  variant="outlined"
                />
              </v-col>

              <!-- Address Section -->
              <v-col cols="12">
                <h3 class="text-h6 font-weight-bold mb-4 mt-4">
                  <v-icon class="mr-2">mdi-map-marker</v-icon>
                  {{ $t('updateForm.address') }}
                </h3>
              </v-col>

              <!-- Same Address Checkbox (only show if other parent has address) -->
              <v-col v-if="otherParentHasAddress" cols="12">
                <v-checkbox
                  v-model="form.sameAddressAsOther"
                  color="primary"
                  :label="$t('updateForm.sameAddressAsOther')"
                  @change="handleSameAddressToggle"
                />
              </v-col>

              <!-- Address Fields (disabled if same as other parent) -->
              <v-col cols="12">
                <v-text-field
                  v-model="form.address"
                  :disabled="form.sameAddressAsOther"
                  :label="$t('updateForm.streetAddress')"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="8">
                <v-text-field
                  v-model="form.city"
                  :disabled="form.sameAddressAsOther"
                  :label="$t('updateForm.city')"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.postal_code"
                  :disabled="form.sameAddressAsOther"
                  :label="$t('updateForm.postalCode')"
                  variant="outlined"
                />
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

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  // State
  const loading = ref(true)
  const submitting = ref(false)
  const error = ref(null)
  const parentData = ref(null)
  const availableCommittees = ref([])
  const availableInterests = ref([])
  const otherParentHasAddress = ref(false)
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
  const handleSameAddressToggle = () => {
    if (form.value.sameAddressAsOther) {
      // Clear address fields when selecting same address
      form.value.address = ''
      form.value.city = ''
      form.value.postal_code = ''
    }
  }

  // Helper function to get committee IDs and roles that the parent belongs to
  const getParentCommitteeIds = (parentEmail, committees) => {
    if (!parentEmail || !committees) {
      return []
    }

    const parentCommittees = []
    const parentRoles = {}

    for (const committee of committees) {
      if (committee.members && committee.members.length > 0) {
        const memberEntry = committee.members.find(member => member.email === parentEmail)
        if (memberEntry) {
          parentCommittees.push(committee.id)
          // Convert English "Member" to French "Membre" for consistency
          let role = memberEntry.role || 'Member'
          if (role === 'Member') {
            role = 'Membre'
          }
          parentRoles[committee.id] = role
        }
      }
    }

    console.log(`Parent ${parentEmail} belongs to committees:`, parentCommittees)
    console.log(`Parent ${parentEmail} roles:`, parentRoles)

    // Update form roles
    form.value.committeeRoles = parentRoles

    return parentCommittees
  }

  // Handle committee checkbox change
  const handleCommitteeChange = committeeId => {
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

  // Load parent data using token
  const loadParentData = async () => {
    try {
      loading.value = true
      error.value = null

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/validateUpdateToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.value }),
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(t('updateForm.invalidToken'))
        } else if (response.status === 410) {
          throw new Error(t('updateForm.expiredToken'))
        } else {
          throw new Error(t('updateForm.serverError'))
        }
      }

      const data = await response.json()

      if (!data.valid) {
        throw new Error(data.error || t('updateForm.invalidToken'))
      }

      // Set parent data and form values
      parentData.value = data.parent
      availableCommittees.value = data.availableCommittees || []
      availableInterests.value = getAvailableInterests()
      otherParentHasAddress.value = data.otherParentHasAddress || false

      // Pre-fill form with existing data
      form.value = {
        first_name: data.parent.first_name || '',
        last_name: data.parent.last_name || '',
        phone: data.parent.phone || '',
        address: data.parent.address || '',
        city: data.parent.city || '',
        postal_code: data.parent.postal_code || '',
        sameAddressAsOther: false,
        committees: getParentCommitteeIds(data.parent.email, data.availableCommittees),
        committeeRoles: {}, // Will be populated by getParentCommitteeIds
        interests: Array.isArray(data.parent.interests) ? data.parent.interests : [],
      }
    } catch (error_) {
      console.error('Failed to load parent data:', error_)
      error.value = error_.message
    } finally {
      loading.value = false
    }
  }

  // Handle opt-out confirmation
  const confirmOptOut = async () => {
    try {
      optingOut.value = true

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/processParentOptOut`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.value,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

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
      error.value = t('updateForm.submitError')
      showOptOutDialog.value = false
    } finally {
      optingOut.value = false
    }
  }

  // Submit form
  const submitForm = async () => {
    try {
      // Validate form
      const { valid } = await formRef.value.validate()
      if (!valid) return

      submitting.value = true

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/processParentUpdate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.value,
          parentData: {
            first_name: form.value.first_name,
            last_name: form.value.last_name,
            phone: form.value.phone,
            address: form.value.sameAddressAsOther ? '' : form.value.address,
            city: form.value.sameAddressAsOther ? '' : form.value.city,
            postal_code: form.value.sameAddressAsOther ? '' : form.value.postal_code,
            sameAddressAsOther: form.value.sameAddressAsOther,
            committees: form.value.committees,
            committeeRoles: form.value.committeeRoles,
            interests: form.value.interests,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      // Redirect to success page or show success message
      router.push({
        path: '/update-success',
        query: {
          hasAccount: result.hasAccount ? '1' : '0',
          email: parentData.value.email,
        },
      })
    } catch (error_) {
      console.error('Failed to submit form:', error_)
      error.value = t('updateForm.submitError')
    } finally {
      submitting.value = false
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

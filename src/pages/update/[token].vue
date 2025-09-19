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
                  v-model="form.phone1"
                  :label="$t('updateForm.primaryPhone')"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.phone2"
                  :label="$t('updateForm.secondaryPhone')"
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

                  <v-row>
                    <v-col
                      v-for="committee in availableCommittees"
                      :key="committee.id"
                      cols="12"
                      sm="6"
                    >
                      <v-checkbox
                        v-model="form.committees"
                        color="primary"
                        :label="committee.name"
                        :value="committee.id"
                      />
                    </v-col>
                  </v-row>
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
                <v-textarea
                  v-model="form.interests"
                  :label="$t('updateForm.interestsPlaceholder')"
                  rows="4"
                  variant="outlined"
                />
              </v-col>

              <!-- Directory Participation Section -->
              <v-col cols="12">
                <h3 class="text-h6 font-weight-bold mb-4 mt-4">
                  <v-icon class="mr-2">mdi-book-open-page-variant</v-icon>
                  {{ $t('updateForm.directoryParticipation') }}
                </h3>
              </v-col>

              <v-col cols="12">
                <v-radio-group v-model="form.directoryOption" color="primary">
                  <v-radio
                    :label="$t('updateForm.fullParticipation')"
                    value="full"
                  />
                  <v-radio
                    :label="$t('updateForm.limitedParticipation')"
                    value="limited"
                  />
                  <v-radio
                    :label="$t('updateForm.optOut')"
                    value="optOut"
                  />
                </v-radio-group>

                <v-alert
                  v-if="form.directoryOption === 'optOut'"
                  class="mt-4"
                  color="warning"
                  icon="mdi-alert"
                  variant="tonal"
                >
                  {{ $t('updateForm.optOutWarning') }}
                </v-alert>
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
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'
  import { getFunctionsBaseUrl } from '@/config/functions'

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  // State
  const loading = ref(true)
  const submitting = ref(false)
  const error = ref(null)
  const parentData = ref(null)
  const availableCommittees = ref([])
  const otherParentHasAddress = ref(false)
  const formRef = ref(null)

  // Form data
  const form = ref({
    first_name: '',
    last_name: '',
    phone1: '',
    phone2: '',
    address: '',
    city: '',
    postal_code: '',
    sameAddressAsOther: false,
    committees: [],
    interests: '',
    directoryOption: 'full',
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
      otherParentHasAddress.value = data.otherParentHasAddress || false

      // Pre-fill form with existing data
      form.value = {
        first_name: data.parent.first_name || '',
        last_name: data.parent.last_name || '',
        phone1: data.parent.phone1 || '',
        phone2: data.parent.phone2 || '',
        address: data.parent.address || '',
        city: data.parent.city || '',
        postal_code: data.parent.postal_code || '',
        sameAddressAsOther: false,
        committees: data.parent.committees || [],
        interests: data.parent.interests || '',
        directoryOption: data.parent.directoryOptOut ? 'optOut' : 'full',
      }
    } catch (error_) {
      console.error('Failed to load parent data:', error_)
      error.value = error_.message
    } finally {
      loading.value = false
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
            phone1: form.value.phone1,
            phone2: form.value.phone2,
            address: form.value.sameAddressAsOther ? '' : form.value.address,
            city: form.value.sameAddressAsOther ? '' : form.value.city,
            postal_code: form.value.sameAddressAsOther ? '' : form.value.postal_code,
            sameAddressAsOther: form.value.sameAddressAsOther,
            committees: form.value.committees,
            interests: form.value.interests,
            directoryOptOut: form.value.directoryOption === 'optOut',
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
}
</style>

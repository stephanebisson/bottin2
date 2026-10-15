<template>
  <div>
    <!-- Re-Opt-In Info (show if currently opted out) -->
    <v-alert
      v-if="parent.optedOut"
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
                :error="!!form.phone && !isValidPhoneFormat(form.phone)"
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
                :error="!!form.postal_code && !isValidPostalCodeFormat(form.postal_code)"
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

        <div class="d-flex justify-center ga-2">
          <v-btn
            v-if="cancelable"
            :disabled="submitting"
            size="large"
            variant="text"
            @click="emit('cancel')"
          >
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="primary"
            :loading="submitting"
            prepend-icon="mdi-content-save"
            size="large"
            type="submit"
          >
            {{ $i18n('updateForm.submit') }}
          </v-btn>
        </div>

        <!-- Opt-out (only if not currently opted out) -->
        <div v-if="!parent.optedOut" class="mt-10">
          <p class="text-body-medium text-medium-emphasis mb-2">
            {{ $i18n('updateForm.optOutPrompt') }}
          </p>

          <v-btn
            color="error"
            prepend-icon="mdi-account-remove"
            size="small"
            variant="outlined"
            @click="showOptOutDialog = true"
          >
            {{ $i18n('updateForm.optOutButton') }}
          </v-btn>
        </div>
      </div>
    </v-form>

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
  </div>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { getCommitteeRoles } from '@/config/committees'
  import { ENTITY_STYLES } from '@/config/entities'
  import { getAvailableInterests } from '@/config/interests'
  import { formatPhoneForDisplay, formatPhoneForStorage, getPhoneValidationMessage, isValidPhoneFormat } from '@/utils/phoneFormatter'
  import { formatPostalCodeForDisplay, formatPostalCodeForStorage, getPostalCodeValidationMessage, getSamplePostalCode, isValidPostalCodeFormat } from '@/utils/postalCodeFormatter'

  /**
   * The parent update form, shared by the emailed-link page (/update/[token])
   * and the signed-in profile edit page (/profile/edit). The page loads the
   * data and saves it (useParentUpdate); this component only edits it.
   */
  const props = defineProps({
    parent: { type: Object, required: true },
    availableCommittees: { type: Array, default: () => [] },
    otherParentInfo: { type: Object, default: null },
    parentCommittees: { type: Array, default: () => [] },
    parentCommitteeRoles: { type: Object, default: () => ({}) },
    submitting: { type: Boolean, default: false },
    optingOut: { type: Boolean, default: false },
    // Show a cancel button next to submit
    cancelable: { type: Boolean, default: false },
  })

  const emit = defineEmits(['submit', 'opt-out', 'cancel'])

  const $i18n = useTranslate()
  const availableInterests = getAvailableInterests()

  // Escaped because it is rendered with v-html
  const otherParentNameHtml = computed(() => {
    const name = props.otherParentInfo?.fullName || ''
    const escaped = name.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c])
    return `<strong>${escaped}</strong>`
  })
  const formRef = ref(null)
  const showOptOutDialog = ref(false)

  // Close the dialog once the opt-out request is done (success navigates away; failure shows an error)
  watch(() => props.optingOut, (now, before) => {
    if (before && !now) showOptOutDialog.value = false
  })

  // Form data, pre-filled with the parent's current information
  const form = ref({
    first_name: props.parent.first_name || '',
    last_name: props.parent.last_name || '',
    phone: formatPhoneForDisplay(props.parent.phone || ''),
    address: props.parent.address || '',
    city: props.parent.city || '',
    postal_code: formatPostalCodeForDisplay(props.parent.postal_code || ''),
    sameAddressAsOther: false,
    committees: [...props.parentCommittees],
    committeeRoles: { ...props.parentCommitteeRoles }, // { committeeId: role }
    interests: Array.isArray(props.parent.interests) ? [...props.parent.interests] : [], // Array of selected interest IDs
  })

  // Validation rules
  const rules = {
    required: value => !!value || $i18n('validation.required'),
  }

  // Handle committee checkbox change
  function handleCommitteeChange (committeeId) {
    if (form.value.committees.includes(committeeId)) {
      // Committee was checked, set default role if not already set
      if (!form.value.committeeRoles[committeeId]) {
        const committee = props.availableCommittees.find(c => c.id === committeeId)
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

  function confirmOptOut () {
    emit('opt-out')
  }

  async function submitForm () {
    const { valid } = await formRef.value.validate()
    if (!valid) return

    emit('submit', {
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
    })
  }
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

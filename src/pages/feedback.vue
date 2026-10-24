<template>
  <v-container>
    <v-row class="justify-center">
      <v-col cols="12" lg="6" md="8">
        <!-- Page Header -->
        <div class="text-center mb-6">
          <v-icon class="mb-4" color="primary" size="64">mdi-message-text</v-icon>

          <p class="text-body-large text-medium-emphasis">
            {{ $i18n('feedback.description') }}
          </p>
        </div>

        <!-- Success Message -->
        <v-alert
          v-if="successMessage"
          class="mb-4"
          closable
          icon="mdi-check-circle"
          :text="successMessage"
          type="success"
          @click:close="successMessage = null"
        />

        <!-- Error Message -->
        <v-alert
          v-if="errorMessage"
          class="mb-4"
          closable
          :text="errorMessage"
          type="error"
          @click:close="errorMessage = null"
        />

        <!-- Feedback Form -->
        <v-card>
          <v-card-text class="pa-6">
            <v-form
              ref="formRef"
              v-model="formValid"
              @submit.prevent="handleSubmit"
            >
              <!-- Message Field -->
              <v-textarea
                v-model="message"
                auto-grow
                clearable
                counter="2000"
                :label="$i18n('feedback.messageLabel')"
                :placeholder="$i18n('feedback.messagePlaceholder')"
                rows="8"
                :rules="messageRules"
                variant="outlined"
              />

              <!-- Info Text -->
              <v-alert
                class="mb-4"
                color="info"
                density="compact"
                icon="mdi-information"
                type="info"
                variant="tonal"
              >
                {{ $i18n('feedback.privacyNote') }}
              </v-alert>

              <!-- Submit Button -->
              <v-btn
                block
                color="primary"
                :disabled="!formValid || submitting"
                :loading="submitting"
                size="large"
                type="submit"
                variant="elevated"
              >
                <v-icon start>mdi-send</v-icon>
                {{ $i18n('feedback.submitButton') }}
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { getFunctionsBaseUrl, secureFetch } from '@/config/functions.js'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  definePage({ meta: { titleKey: 'feedback.title' } })

  const $i18n = useTranslate()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // Component state
  const formRef = ref(null)
  const formValid = ref(false)
  const message = ref('')
  const submitting = ref(false)
  const successMessage = ref(null)
  const errorMessage = ref(null)
  const parentProfile = computed(() => firebaseStore.currentParent)

  // Validation rules
  const messageRules = [
    v => !!v || $i18n('feedback.validation.messageRequired'),
    v => (v && v.length >= 10) || $i18n('feedback.validation.messageTooShort'),
    v => (v && v.length <= 2000) || $i18n('feedback.validation.messageTooLong'),
  ]

  // Submit feedback
  async function handleSubmit () {
    // Validate form
    const { valid } = await formRef.value.validate()
    if (!valid) return

    // Ensure parent profile is loaded
    if (!parentProfile.value) {
      errorMessage.value = $i18n('feedback.error.parentNotFound')
      return
    }

    try {
      submitting.value = true
      errorMessage.value = null

      // Only the text: the function sets the sender and status itself
      const idToken = await authStore.user.getIdToken()
      const response = await secureFetch(`${getFunctionsBaseUrl()}/submitFeedback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ message: message.value }),
      })
      if (!response.ok) {
        throw new Error(`submitFeedback failed: HTTP ${response.status}`)
      }

      // Show success message
      successMessage.value = $i18n('feedback.success')

      // Reset form
      message.value = ''
      formRef.value.reset()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      errorMessage.value = $i18n('feedback.error.submitFailed')
    } finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    if (!parentProfile.value) {
      errorMessage.value = $i18n('feedback.error.parentNotFound')
    }
  })
</script>

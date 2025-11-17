<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" lg="6" md="8">
        <!-- Page Header -->
        <div class="text-center mb-6">
          <v-icon class="mb-4" color="primary" size="64">mdi-message-text</v-icon>
          <h1 class="text-h4 font-weight-bold mb-2">
            {{ $i18n('feedback.title') }}
          </h1>
          <p class="text-body-1 text-grey-darken-1">
            {{ $i18n('feedback.description') }}
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <v-progress-circular color="primary" indeterminate size="64" />
          <p class="text-h6 mt-4">{{ $i18n('common.loading') }}</p>
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
        <v-card v-if="!loading">
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
                counter="5000"
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
  import { onMounted, ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { FeedbackRepository } from '@/repositories/FeedbackRepository'
  import { ParentRepository } from '@/repositories/ParentRepository'
  import { useAuthStore } from '@/stores/auth'


  // Get i18n function from vue-banana-i18n
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  const authStore = useAuthStore()
  const feedbackRepository = new FeedbackRepository()
  const parentRepository = new ParentRepository()

  // Component state
  const formRef = ref(null)
  const formValid = ref(false)
  const message = ref('')
  const submitting = ref(false)
  const successMessage = ref(null)
  const errorMessage = ref(null)
  const loading = ref(true)
  const parentProfile = ref(null)

  // Validation rules
  const messageRules = [
    v => !!v || $i18n('feedback.validation.messageRequired'),
    v => (v && v.length >= 10) || $i18n('feedback.validation.messageTooShort'),
    v => (v && v.length <= 5000) || $i18n('feedback.validation.messageTooLong'),
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

      // Create feedback
      await feedbackRepository.create({
        parent_id: parentProfile.value.id,
        message: message.value,
        status: 'pending',
      })

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

  // Load current user's parent record on mount
  onMounted(async () => {
    try {
      loading.value = true

      // Ensure we have user auth data
      if (!authStore.isAuthenticated || !authStore.user?.email) {
        errorMessage.value = 'User must be authenticated to submit feedback'
        return
      }

      // Load only this user's parent record by email
      parentProfile.value = await parentRepository.getByEmail(authStore.user.email)

      if (!parentProfile.value) {
        errorMessage.value = $i18n('feedback.error.parentNotFound')
      }
    } catch (error) {
      console.error('Error loading parent data:', error)
      errorMessage.value = 'Failed to load your profile data'
    } finally {
      loading.value = false
    }
  })
</script>

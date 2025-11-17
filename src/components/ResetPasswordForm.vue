<template>
  <v-form v-model="formValid" @submit.prevent="handleReset">
    <v-card-title class="text-h5 text-center pb-2">
      {{ $i18n('auth.resetPassword') }}
    </v-card-title>

    <v-card-text>
      <p class="text-body-2 text-grey-darken-1 mb-4">
        {{ $i18n('auth.resetPasswordInstructions') }}
      </p>

      <v-text-field
        v-model="email"
        autocomplete="email"
        :label="$i18n('auth.email')"
        prepend-inner-icon="mdi-email"
        required
        :rules="emailRules"
        type="email"
        variant="outlined"
      />

      <!-- Error Alert -->
      <v-alert
        v-if="authStore.error"
        class="mb-4"
        closable
        :text="authStore.error"
        type="error"
        @click:close="authStore.clearError()"
      />

      <!-- Success Alert -->
      <v-alert
        v-if="resetSent"
        class="mb-4"
        :text="$i18n('auth.resetEmailSent')"
        type="success"
      />

      <!-- Back to Login Link -->
      <div class="text-center mb-4">
        <v-btn
          color="primary"
          size="small"
          variant="text"
          @click="$emit('back-to-login')"
        >
          {{ $i18n('auth.backToLogin') }}
        </v-btn>
      </div>
    </v-card-text>

    <v-card-actions class="px-6 pb-6">
      <v-btn
        block
        color="primary"
        :disabled="!formValid || authStore.loading || resetSent"
        :loading="authStore.loading"
        size="large"
        type="submit"
        variant="elevated"
      >
        {{ resetSent ? $i18n('auth.emailSent') : $i18n('auth.sendResetEmail') }}
      </v-btn>
    </v-card-actions>
  </v-form>
</template>

<script setup>
  import { ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useAuthStore } from '@/stores/auth'

  defineEmits(['back-to-login'])

  const authStore = useAuthStore()
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)

  // Form data
  const email = ref('')
  const formValid = ref(false)
  const resetSent = ref(false)

  // Validation rules
  const emailRules = [
    v => !!v || $i18n('validation.emailRequired'),
    v => /.+@.+\..+/.test(v) || $i18n('validation.emailInvalid'),
  ]

  // Handle password reset
  async function handleReset () {
    if (!formValid.value) return

    try {
      await authStore.resetPassword(email.value)
      resetSent.value = true

      // Auto-redirect after 5 seconds
      setTimeout(() => {
        resetSent.value = false
      }, 5000)
    } catch (error) {
      // Error is handled in the store
      console.error('Password reset failed:', error)
    }
  }
</script>

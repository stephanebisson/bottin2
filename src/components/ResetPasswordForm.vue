<template>
  <v-form v-model="formValid" @submit.prevent="handleReset">
    <v-card-title class="text-h5 text-center pb-2">
      {{ $t('auth.resetPassword') }}
    </v-card-title>
    
    <v-card-text>
      <p class="text-body-2 text-grey-darken-1 mb-4">
        {{ $t('auth.resetPasswordInstructions') }}
      </p>
      
      <v-text-field
        v-model="email"
        :label="$t('auth.email')"
        :rules="emailRules"
        autocomplete="email"
        prepend-inner-icon="mdi-email"
        type="email"
        variant="outlined"
        required
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
        type="success"
        :text="$t('auth.resetEmailSent')"
      />
      
      <!-- Back to Login Link -->
      <div class="text-center mb-4">
        <v-btn
          color="primary"
          variant="text"
          size="small"
          @click="$emit('back-to-login')"
        >
          {{ $t('auth.backToLogin') }}
        </v-btn>
      </div>
    </v-card-text>
    
    <v-card-actions class="px-6 pb-6">
      <v-btn
        :disabled="!formValid || authStore.loading || resetSent"
        :loading="authStore.loading"
        block
        color="primary"
        size="large"
        type="submit"
        variant="elevated"
      >
        {{ resetSent ? $t('auth.emailSent') : $t('auth.sendResetEmail') }}
      </v-btn>
    </v-card-actions>
  </v-form>
</template>

<script setup>
  import { ref } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { useI18n } from '@/composables/useI18n'

  defineEmits(['back-to-login'])

  const authStore = useAuthStore()
  const { t } = useI18n()

  // Form data
  const email = ref('')
  const formValid = ref(false)
  const resetSent = ref(false)

  // Validation rules
  const emailRules = [
    v => !!v || t('validation.emailRequired'),
    v => /.+@.+\..+/.test(v) || t('validation.emailInvalid')
  ]

  // Handle password reset
  const handleReset = async () => {
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
<template>
  <v-form v-model="formValid" @submit.prevent="handleLogin">
    <v-card-title class="text-h5 text-center pb-2">
      {{ $i18n('auth.login') }}
    </v-card-title>

    <v-card-text>
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

      <v-text-field
        v-model="password"
        :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
        autocomplete="current-password"
        :label="$i18n('auth.password')"
        prepend-inner-icon="mdi-lock"
        required
        :rules="passwordRules"
        :type="showPassword ? 'text' : 'password'"
        variant="outlined"
        @click:append-inner="showPassword = !showPassword"
      />

      <!-- Error Alert -->
      <v-alert
        v-if="authStore.error"
        class="mb-4"
        closable
        :text="translateAuthError(authStore.error)"
        type="error"
        @click:close="authStore.clearError()"
      />

      <!-- Forgot Password Link -->
      <div class="text-center mb-4">
        <v-btn
          color="primary"
          size="small"
          variant="text"
          @click="$emit('show-reset')"
        >
          {{ $i18n('auth.forgotPassword') }}
        </v-btn>
      </div>
    </v-card-text>

    <v-card-actions class="px-6 pb-6">
      <v-btn
        block
        color="primary"
        :disabled="!formValid || authStore.loading"
        :loading="authStore.loading"
        size="large"
        type="submit"
        variant="elevated"
      >
        {{ $i18n('auth.signIn') }}
      </v-btn>
    </v-card-actions>
  </v-form>
</template>

<script setup>
  import { ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useRouter } from 'vue-router'
  import { useAuthErrors } from '@/composables/useAuthErrors'
  import { useAuthStore } from '@/stores/auth'

  defineEmits(['show-reset'])

  const router = useRouter()
  const authStore = useAuthStore()

  // Get i18n function from vue-banana-i18n
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)

  const { translateAuthError } = useAuthErrors()

  // Form data
  const email = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const formValid = ref(false)

  // Validation rules
  const emailRules = [
    v => !!v || $i18n('validation.emailRequired'),
    v => /.+@.+\..+/.test(v) || $i18n('validation.emailInvalid'),
  ]

  const passwordRules = [
    v => !!v || $i18n('validation.passwordRequired'),
    v => (v && v.length >= 6) || $i18n('validation.passwordMinLength'),
  ]

  // Handle login
  async function handleLogin () {
    if (!formValid.value) return

    try {
      await authStore.login(email.value, password.value)

      // Redirect to home page after successful login
      router.push('/')
    } catch (error) {
      // Check if error is due to unverified email
      if (error.message === 'EMAIL_NOT_VERIFIED') {
        console.log('📧 Email not verified, redirecting to verification page')
        // Clear the error since we're handling it with a redirect
        authStore.clearError()
        // Redirect to email verification page (user is still logged in)
        router.push('/email-verification-required?returning=true')
      } else {
        // Error is handled in the store for other types of errors
        console.error('Login failed:', error)
      }
    }
  }
</script>

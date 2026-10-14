<template>
  <v-form v-model="formValid" @submit.prevent="handleLogin">
    <v-card-title class="text-headline-small text-center pb-2">
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
  import { useRouter } from 'vue-router'
  import { useAuthErrors } from '@/composables/useAuthErrors'
  import { useTranslate } from '@/composables/useTranslate'
  import { useAuthStore } from '@/stores/auth'

  defineEmits(['show-reset'])

  const props = defineProps({
    // Prefills the email field, e.g. when coming from the update confirmation page
    initialEmail: { type: String, default: '' },
  })

  const router = useRouter()
  const authStore = useAuthStore()

  const $i18n = useTranslate()

  const { translateAuthError } = useAuthErrors()

  // Form data
  const email = ref(props.initialEmail)
  const password = ref('')
  const showPassword = ref(false)
  const formValid = ref(false)

  // Validation rules
  const emailRules = [
    v => !!v || $i18n('validation.emailRequired'),
    v => /.[^\n\r@\u2028\u2029]*@.+\..+/.test(v) || $i18n('validation.emailInvalid'),
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

<template>
  <v-form v-model="formValid" @submit.prevent="handleLogin">
    <v-card-title class="text-h5 text-center pb-2">
      {{ $t('auth.login') }}
    </v-card-title>

    <v-card-text>
      <v-text-field
        v-model="email"
        autocomplete="email"
        :label="$t('auth.email')"
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
        :label="$t('auth.password')"
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
        :text="authStore.error"
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
          {{ $t('auth.forgotPassword') }}
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
        {{ $t('auth.signIn') }}
      </v-btn>
    </v-card-actions>
  </v-form>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'
  import { useAuthStore } from '@/stores/auth'

  defineEmits(['show-reset'])

  const router = useRouter()
  const authStore = useAuthStore()
  const { t } = useI18n()

  // Form data
  const email = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const formValid = ref(false)

  // Validation rules
  const emailRules = [
    v => !!v || t('validation.emailRequired'),
    v => /.+@.+\..+/.test(v) || t('validation.emailInvalid'),
  ]

  const passwordRules = [
    v => !!v || t('validation.passwordRequired'),
    v => (v && v.length >= 6) || t('validation.passwordMinLength'),
  ]

  // Handle login
  const handleLogin = async () => {
    if (!formValid.value) return

    try {
      await authStore.login(email.value, password.value)

      // Redirect to home page after successful login
      router.push('/')
    } catch (error) {
      // Error is handled in the store
      console.error('Login failed:', error)
    }
  }
</script>

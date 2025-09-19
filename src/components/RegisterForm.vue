<template>
  <v-form v-model="formValid" @submit.prevent="handleRegister">
    <v-card-title class="text-h5 text-center pb-2">
      {{ $t('auth.register') }}
    </v-card-title>
    
    <v-card-text>
      <v-text-field
        v-model="email"
        :label="$t('auth.email')"
        :rules="emailRules"
        :loading="emailValidationLoading"
        :color="emailAuthorized === true ? 'success' : emailAuthorized === false ? 'error' : 'primary'"
        autocomplete="email"
        prepend-inner-icon="mdi-email"
        :append-inner-icon="
          emailValidationLoading ? 'mdi-loading mdi-spin' : 
          emailAuthorized === true ? 'mdi-check-circle' :
          emailAuthorized === false ? 'mdi-close-circle' : ''
        "
        type="email"
        variant="outlined"
        required
      />

      <!-- Email Authorization Status -->
      <div v-if="email && /.+@.+\..+/.test(email)" class="text-caption mt-1 mb-3">
        <v-progress-linear
          v-if="emailValidationLoading"
          color="primary"
          indeterminate
          height="2"
        />
        <div
          v-else-if="emailAuthorized === true"
          class="text-success d-flex align-center"
        >
          <v-icon size="small" class="me-1">mdi-check-circle</v-icon>
          <span v-if="userInfo.displayName">
            Welcome {{ userInfo.displayName }}! 
            <span class="text-caption">({{ userInfo.userType === 'parent' ? 'Parent' : 'Staff' }})</span>
          </span>
          <span v-else>
            {{ $t('validation.emailAuthorized') }}
          </span>
        </div>
        <div
          v-else-if="emailAuthorized === false"
          class="text-error d-flex align-center"
        >
          <v-icon size="small" class="me-1">mdi-close-circle</v-icon>
          {{ $t('validation.emailNotAuthorized') }}
        </div>
      </div>
      
      <v-text-field
        v-model="password"
        :label="$t('auth.password')"
        :rules="passwordRules"
        :type="showPassword ? 'text' : 'password'"
        :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock"
        variant="outlined"
        required
        @click:append-inner="showPassword = !showPassword"
      />
      
      <v-text-field
        v-model="confirmPassword"
        :label="$t('auth.confirmPassword')"
        :rules="confirmPasswordRules"
        :type="showConfirmPassword ? 'text' : 'password'"
        :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock-check"
        variant="outlined"
        required
        @click:append-inner="showConfirmPassword = !showConfirmPassword"
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
      
      <!-- Terms and Conditions -->
      <v-checkbox
        v-model="agreeToTerms"
        :rules="termsRules"
        color="primary"
        hide-details="auto"
      >
        <template #label>
          <span class="text-body-2">
            {{ $t('auth.agreeToTerms') }}
          </span>
        </template>
      </v-checkbox>
    </v-card-text>
    
    <v-card-actions class="px-6 pb-6">
      <v-btn
        :disabled="!formValid || authStore.loading"
        :loading="authStore.loading"
        block
        color="primary"
        size="large"
        type="submit"
        variant="elevated"
      >
        {{ $t('auth.createAccount') }}
      </v-btn>
    </v-card-actions>
  </v-form>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { useI18n } from '@/composables/useI18n'

  const router = useRouter()
  const authStore = useAuthStore()
  const { t } = useI18n()

  // Form data
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const showPassword = ref(false)
  const showConfirmPassword = ref(false)
  const agreeToTerms = ref(false)
  const formValid = ref(false)
  const emailValidationLoading = ref(false)
  const emailAuthorized = ref(null) // null = not checked, true = authorized, false = not authorized

  // Validation rules
  const emailRules = [
    v => !!v || t('validation.emailRequired'),
    v => /.+@.+\..+/.test(v) || t('validation.emailInvalid'),
    v => emailAuthorized.value !== false || t('validation.emailNotAuthorized')
  ]

  const passwordRules = [
    v => !!v || t('validation.passwordRequired'),
    v => (v && v.length >= 6) || t('validation.passwordMinLength'),
    v => /(?=.*[a-z])/.test(v) || t('validation.passwordLowercase'),
    v => /(?=.*[A-Z])/.test(v) || t('validation.passwordUppercase'),
    v => /(?=.*\d)/.test(v) || t('validation.passwordNumber')
  ]

  const confirmPasswordRules = [
    v => !!v || t('validation.confirmPasswordRequired'),
    v => v === password.value || t('validation.passwordsMatch')
  ]

  const termsRules = [
    v => v === true || t('validation.termsRequired')
  ]

  // Store user info for display
  const userInfo = ref({ authorized: null, displayName: '', userType: '' })

  // Email validation watcher with debouncing
  let emailValidationTimeout = null
  watch(email, (newEmail) => {
    // Clear previous timeout
    if (emailValidationTimeout) {
      clearTimeout(emailValidationTimeout)
    }

    if (!newEmail || !/.+@.+\..+/.test(newEmail)) {
      emailAuthorized.value = null
      userInfo.value = { authorized: null, displayName: '', userType: '' }
      return
    }

    // Debounce email validation
    emailValidationTimeout = setTimeout(async () => {
      emailValidationLoading.value = true
      try {
        const info = await authStore.getUserInfo(newEmail)
        emailAuthorized.value = info.authorized
        userInfo.value = info
      } catch (error) {
        console.error('Email validation failed:', error)
        emailAuthorized.value = null
        userInfo.value = { authorized: null, displayName: '', userType: '' }
      } finally {
        emailValidationLoading.value = false
      }
    }, 500)
  })

  // Handle registration
  const handleRegister = async () => {
    if (!formValid.value) return

    try {
      await authStore.register(email.value, password.value)
      
      // Redirect to home page after successful registration
      router.push('/')
    } catch (error) {
      // Error is handled in the store
      console.error('Registration failed:', error)
    }
  }
</script>
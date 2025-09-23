<template>
  <v-form v-model="formValid" @submit.prevent="handleRegister">
    <v-card-title class="text-h5 text-center pb-2">
      {{ $t('auth.register') }}
    </v-card-title>

    <v-card-text>
      <v-text-field
        v-model="email"
        :append-inner-icon="
          emailValidationLoading ? 'mdi-loading mdi-spin' :
          emailAuthorized === true ? 'mdi-check-circle' :
          emailAuthorized === false ? 'mdi-close-circle' : ''
        "
        autocomplete="email"
        :color="emailAuthorized === true ? 'success' : emailAuthorized === false ? 'error' : 'primary'"
        :label="$t('auth.email')"
        :loading="emailValidationLoading"
        prepend-inner-icon="mdi-email"
        required
        :rules="emailRules"
        type="email"
        variant="outlined"
      />

      <!-- Email Authorization Status -->
      <div v-if="email && /.+@.+\..+/.test(email)" class="text-caption mt-1 mb-3">
        <v-progress-linear
          v-if="emailValidationLoading"
          color="primary"
          height="2"
          indeterminate
        />
        <div
          v-else-if="emailAuthorized === true"
          class="text-success d-flex align-center"
        >
          <v-icon class="me-1" size="small">mdi-check-circle</v-icon>
          <span v-if="userInfo.displayName">
            {{ $t('registerForm.welcome') }}{{ userInfo.displayName }}!
            <span class="text-caption">({{ userInfo.userType === 'parent' ? $t('registerForm.parent') : $t('registerForm.staff') }})</span>
          </span>
          <span v-else>
            {{ $t('validation.emailAuthorized') }}
          </span>
        </div>
        <div
          v-else-if="emailAuthorized === false"
          class="text-error d-flex align-center"
        >
          <v-icon class="me-1" size="small">mdi-close-circle</v-icon>
          {{ $t('validation.emailNotAuthorized') }}
        </div>
      </div>

      <v-text-field
        v-model="password"
        :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
        autocomplete="new-password"
        :label="$t('auth.password')"
        prepend-inner-icon="mdi-lock"
        required
        :rules="passwordRules"
        :type="showPassword ? 'text' : 'password'"
        variant="outlined"
        @click:append-inner="showPassword = !showPassword"
      />

      <v-text-field
        v-model="confirmPassword"
        :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
        autocomplete="new-password"
        :label="$t('auth.confirmPassword')"
        prepend-inner-icon="mdi-lock-check"
        required
        :rules="confirmPasswordRules"
        :type="showConfirmPassword ? 'text' : 'password'"
        variant="outlined"
        @click:append-inner="showConfirmPassword = !showConfirmPassword"
      />

      <!-- Network Status Alert -->
      <v-alert
        v-if="!authStore.serviceHealth.isOnline"
        class="mb-4"
        icon="mdi-wifi-off"
        :text="$t('auth.offlineMessage')"
        type="warning"
      />

      <!-- Service Status Alert -->
      <v-alert
        v-if="authStore.serviceHealth.isOnline && !authStore.serviceHealth.firebaseReachable"
        class="mb-4"
        icon="mdi-cloud-alert"
        :text="$t('auth.authServiceIssues')"
        type="warning"
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

      <!-- Terms and Conditions -->
      <v-checkbox
        v-model="agreeToTerms"
        color="primary"
        hide-details="auto"
        :rules="termsRules"
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
        block
        color="primary"
        :disabled="!formValid || authStore.loading"
        :loading="authStore.loading"
        size="large"
        type="submit"
        variant="elevated"
      >
        {{ $t('auth.createAccount') }}
      </v-btn>
    </v-card-actions>

    <!-- Debug Panel (Development Only) -->
    <v-card-actions v-if="isDevelopment" class="px-6 pb-2">
      <v-expansion-panels class="w-100" variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title class="text-caption">
            {{ $t('registerForm.debugInfo') }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="text-caption">
              <div><strong>{{ $t('registerForm.network') }}</strong> {{ authStore.serviceHealth.isOnline ? $t('registerForm.online') : $t('registerForm.offline') }}</div>
              <div><strong>{{ $t('registerForm.firebase') }}</strong> {{ authStore.serviceHealth.firebaseReachable ? $t('registerForm.reachable') : $t('registerForm.unreachable') }}</div>
              <div><strong>{{ $t('registerForm.lastCheck') }}</strong> {{ authStore.serviceHealth.lastChecked ? new Date(authStore.serviceHealth.lastChecked).toLocaleTimeString() : $t('registerForm.never') }}</div>
              <div><strong>{{ $t('registerForm.emailStatus') }}</strong> {{ emailAuthorized === null ? $t('registerForm.notChecked') : emailAuthorized ? $t('registerForm.authorized') : $t('registerForm.notAuthorized') }}</div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-actions>
  </v-form>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthErrors } from '@/composables/useAuthErrors'
  import { useI18n } from '@/composables/useI18n'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const authStore = useAuthStore()
  const { t } = useI18n()
  const { translateAuthError } = useAuthErrors()

  // Environment check for debug panel
  const isDevelopment = computed(() => import.meta.env.DEV)

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
    v => emailAuthorized.value !== false || t('validation.emailNotAuthorized'),
  ]

  const passwordRules = [
    v => !!v || t('validation.passwordRequired'),
    v => (v && v.length >= 6) || t('validation.passwordMinLength'),
    v => /(?=.*[a-z])/.test(v) || t('validation.passwordLowercase'),
    v => /(?=.*[A-Z])/.test(v) || t('validation.passwordUppercase'),
    v => /(?=.*\d)/.test(v) || t('validation.passwordNumber'),
  ]

  const confirmPasswordRules = [
    v => !!v || t('validation.confirmPasswordRequired'),
    v => v === password.value || t('validation.passwordsMatch'),
  ]

  const termsRules = [
    v => v === true || t('validation.termsRequired'),
  ]

  // Store user info for display
  const userInfo = ref({ authorized: null, displayName: '', userType: '' })

  // Email validation watcher with debouncing
  let emailValidationTimeout = null
  watch(email, newEmail => {
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
        const info = await authStore.validateAndGetUserInfo(newEmail)
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

      // Navigate directly to email verification page since user is now registered but unverified
      router.push('/email-verification-required?newRegistration=true')
    } catch (error) {
      // Error is handled in the store
      console.error('Registration failed:', error)
    }
  }
</script>

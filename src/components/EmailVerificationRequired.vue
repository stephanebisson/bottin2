<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" lg="4" md="6">
        <v-card class="mx-auto" max-width="400">
          <v-card-title class="text-h5 text-center pa-6">
            <v-icon class="mb-4" color="warning" size="64">
              mdi-email-alert
            </v-icon>
            <div>{{ $t('auth.emailVerificationRequired') }}</div>
          </v-card-title>

          <v-card-text class="text-center">
            <!-- Step-by-step instructions for new registrations -->
            <div v-if="isNewRegistration" class="mb-4">
              <p class="mb-3 text-h6 text-success">
                🎉 {{ $t('auth.accountCreatedSuccessfully') }}
              </p>
              <p class="mb-4">
                {{ $t('auth.accountCreatedPleaseVerify') }}
              </p>

              <!-- Step-by-step guide -->
              <v-list class="bg-transparent text-start" density="compact">
                <v-list-item class="ps-0" prepend-icon="mdi-numeric-1-circle">
                  <v-list-item-title class="text-body-2">
                    {{ $t('auth.step1CheckEmail') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="ps-0" prepend-icon="mdi-numeric-2-circle">
                  <v-list-item-title class="text-body-2">
                    {{ $t('auth.step2ClickLink') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="ps-0" prepend-icon="mdi-numeric-3-circle">
                  <v-list-item-title class="text-body-2">
                    {{ $t('auth.step3AutoRedirect') }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </div>

            <!-- For returning users or blocked access -->
            <div v-else class="mb-4">
              <div v-if="isReturningUser">
                <p class="mb-3 text-h6 text-warning">
                  🔐 {{ $t('auth.loginBlockedEmailNotVerified') }}
                </p>
                <p class="mb-4">
                  {{ $t('auth.mustVerifyBeforeAccess') }}
                </p>
              </div>
              <div v-else-if="isBlockedAccess">
                <p class="mb-3 text-h6 text-error">
                  🚫 {{ $t('auth.accessBlockedEmailNotVerified') }}
                </p>
                <p class="mb-4">
                  {{ $t('auth.verifyToUnlockAccess') }}
                </p>
              </div>
              <div v-else>
                <p class="mb-4">
                  {{ $t('auth.pleaseVerifyEmail') }}
                </p>
                <p class="mb-4 text-medium-emphasis">
                  {{ $t('auth.verificationEmailSent') }}
                </p>
              </div>
            </div>

            <!-- Success Alert -->
            <v-alert
              v-if="verificationSent"
              class="mb-4"
              closable
              icon="mdi-check-circle"
              :text="$t('auth.verificationEmailSentSuccess')"
              type="success"
              @click:close="verificationSent = false"
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
          </v-card-text>

          <v-card-actions class="px-6 pb-6">
            <v-col>
              <v-btn
                block
                class="text-wrap text-center"
                color="primary"
                :disabled="authStore.loading"
                :loading="authStore.loading"
                size="large"
                style="white-space: normal; height: auto; min-height: 48px;"
                variant="elevated"
                @click="resendVerification"
              >
                {{ $t('auth.resendVerificationEmail') }}
              </v-btn>

              <v-btn
                block
                class="mt-3"
                color="secondary"
                :disabled="checkingVerification"
                :loading="checkingVerification"
                size="large"
                variant="outlined"
                @click="manualRefresh"
              >
                {{ $t('auth.iHaveVerifiedEmail') }}
              </v-btn>

              <!-- Auto-check status indicator -->
              <div v-if="autoCheckInterval && !checkingVerification" class="text-center mt-2">
                <v-chip
                  class="text-caption"
                  color="primary"
                  size="small"
                  variant="outlined"
                >
                  <v-icon class="me-1" size="small">mdi-autorenew</v-icon>
                  {{ $t('auth.autoCheckingIn', { seconds: timeLeft }) }}
                </v-chip>
              </div>

              <div v-if="checkingVerification" class="text-center mt-2">
                <v-chip
                  class="text-caption"
                  color="success"
                  size="small"
                >
                  <v-icon class="me-1" size="small">mdi-loading mdi-spin</v-icon>
                  {{ $t('auth.checkingVerification') }}
                </v-chip>
              </div>

              <v-btn
                block
                class="mt-3"
                color="error"
                size="large"
                variant="text"
                @click="signOut"
              >
                {{ $t('auth.logout') }}
              </v-btn>

              <!-- Debug button for development -->
              <v-btn
                v-if="isDevelopment"
                block
                class="mt-2"
                color="info"
                size="small"
                variant="outlined"
                @click="debugUserState"
              >
                {{ $t('auth.debugUserState') }}
              </v-btn>
            </v-col>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'
  import { auth } from '@/firebase'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  const { t } = useI18n()

  // Development mode check
  const isDevelopment = computed(() => import.meta.env.DEV)

  // Component state
  const verificationSent = ref(false)
  const autoCheckInterval = ref(null)
  const checkingVerification = ref(false)
  const timeLeft = ref(30) // Seconds until next auto-check
  const countdownInterval = ref(null)

  // Detect if user came from registration, returning login, or blocked access
  const isNewRegistration = ref(route.query.newRegistration === 'true')
  const isReturningUser = ref(route.query.returning === 'true')
  const isBlockedAccess = ref(route.query.blocked === 'true')

  // Auto-check for email verification every 30 seconds
  const startAutoCheck = () => {
    // Initial check after 10 seconds (give email service time to deliver)
    setTimeout(checkVerificationStatus, 10_000)

    // Then check every 30 seconds
    autoCheckInterval.value = setInterval(checkVerificationStatus, 30_000)

    // Start countdown timer
    startCountdown()
  }

  const startCountdown = () => {
    timeLeft.value = 30
    countdownInterval.value = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        timeLeft.value = 30 // Reset for next cycle
      }
    }, 1000)
  }

  const stopAutoCheck = () => {
    if (autoCheckInterval.value) {
      clearInterval(autoCheckInterval.value)
      autoCheckInterval.value = null
    }
    if (countdownInterval.value) {
      clearInterval(countdownInterval.value)
      countdownInterval.value = null
    }
  }

  const checkVerificationStatus = async () => {
    if (checkingVerification.value) return // Prevent multiple simultaneous checks

    try {
      checkingVerification.value = true
      console.log('Auto-checking email verification status...')

      const isVerified = await authStore.refreshUser()

      if (isVerified) {
        console.log('🎉 Email verified! Redirecting to home page...')
        stopAutoCheck()

        // Show success message briefly before redirect
        verificationSent.value = true
        setTimeout(() => {
          router.push({
            path: '/',
            query: { welcome: 'verified' }, // Add welcome flag for home page
          })
        }, 1500)
      }
    } catch (error) {
      console.error('Auto-verification check failed:', error)
    } finally {
      checkingVerification.value = false
    }
  }

  const resendVerification = async () => {
    try {
      await authStore.sendVerificationEmail()
      verificationSent.value = true

      // Reset auto-check timer when email is resent
      stopAutoCheck()
      setTimeout(startAutoCheck, 2000) // Wait 2 seconds then start checking
    } catch (error) {
      console.error('Failed to resend verification email:', error)
    }
  }

  const manualRefresh = async () => {
    console.log('👆 Manual refresh button clicked')

    // Clear any existing errors
    authStore.clearError()
    checkingVerification.value = true

    try {
      // Use the enhanced refresh method
      const isVerified = await authStore.refreshUser()

      if (isVerified) {
        console.log('🎉 Manual refresh detected verification!')
        verificationSent.value = true

        // Stop auto-checking and redirect
        stopAutoCheck()
        setTimeout(() => {
          router.push({
            path: '/',
            query: { welcome: 'verified' },
          })
        }, 1500)
      } else {
        console.log('❌ Manual refresh - still not verified')

        // Add helpful debugging info for user
        authStore.setError(
          t('auth.emailStillNotVerified') + t('auth.differentBrowserHint'),
        )
      }
    } catch (error) {
      console.error('Manual refresh failed:', error)
      authStore.setError(t('auth.failedCheckVerificationStatus'))
    } finally {
      checkingVerification.value = false
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    console.log('📧 Email verification page loaded')
    if (isNewRegistration.value) {
      console.log('🆕 New registration - starting auto-verification check')
      startAutoCheck()
    } else if (isReturningUser.value) {
      console.log('🔄 Returning user with unverified email - starting auto-verification check')
      startAutoCheck()
    } else if (isBlockedAccess.value) {
      console.log('🚫 User blocked from accessing protected route - starting auto-verification check')
      startAutoCheck()
    }
  })

  onUnmounted(() => {
    console.log('🧹 Cleaning up verification page')
    stopAutoCheck()
  })

  const signOut = async () => {
    try {
      await authStore.logout()
      router.push('/auth')
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  // Debug function for development
  const debugUserState = async () => {
    console.log('🔧 === DEBUG USER STATE ===')
    console.log('Current route query:', route.query)
    console.log('Auth store user:', authStore.user)
    console.log('Auth store isEmailVerified:', authStore.isEmailVerified)
    console.log('Firebase auth.currentUser:', auth.currentUser)

    if (auth.currentUser) {
      console.log('Firebase user details:', {
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified,
        uid: auth.currentUser.uid,
        providerData: auth.currentUser.providerData,
      })

      // Try to get fresh token
      try {
        const token = await auth.currentUser.getIdToken(true)
        const tokenPayload = JSON.parse(atob(token.split('.')[1]))
        console.log('Token payload email_verified:', tokenPayload.email_verified)
      } catch (tokenError) {
        console.error('Failed to decode token:', tokenError)
      }
    }

    console.log('=== END DEBUG ===')
  }
</script>

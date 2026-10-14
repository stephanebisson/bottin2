<template>
  <v-container class="fill-height d-flex align-center flex-wrap" fluid>
    <v-row class="align-center justify-center">
      <v-col cols="12" lg="4" md="6">
        <v-card class="mx-auto" max-width="400">
          <v-card-title class="text-headline-small text-center pa-6">
            <v-icon class="mb-4" color="warning" size="64">
              mdi-email-alert
            </v-icon>

            <div>{{ $i18n('auth.emailVerificationRequired') }}</div>
          </v-card-title>

          <v-card-text class="text-center">
            <!-- Step-by-step instructions for new registrations -->
            <div v-if="isNewRegistration" class="mb-4">
              <p class="mb-3 text-title-large text-success">
                🎉 {{ $i18n('auth.accountCreatedSuccessfully') }}
              </p>

              <p class="mb-4">
                {{ $i18n('auth.accountCreatedPleaseVerify') }}
              </p>

              <!-- Step-by-step guide -->
              <v-list class="bg-transparent text-start" density="compact">
                <v-list-item class="ps-0" prepend-icon="mdi-numeric-1-circle">
                  <v-list-item-title class="text-body-medium">
                    {{ $i18n('auth.step1CheckEmail') }}
                  </v-list-item-title>
                </v-list-item>

                <v-list-item class="ps-0" prepend-icon="mdi-numeric-2-circle">
                  <v-list-item-title class="text-body-medium">
                    {{ $i18n('auth.step2ClickLink') }}
                  </v-list-item-title>
                </v-list-item>

                <v-list-item class="ps-0" prepend-icon="mdi-numeric-3-circle">
                  <v-list-item-title class="text-body-medium">
                    {{ $i18n('auth.step3AutoRedirect') }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </div>

            <!-- For returning users or blocked access -->
            <div v-else class="mb-4">
              <div v-if="isReturningUser">
                <p class="mb-3 text-title-large text-warning">
                  🔐 {{ $i18n('auth.loginBlockedEmailNotVerified') }}
                </p>

                <p class="mb-4">
                  {{ $i18n('auth.mustVerifyBeforeAccess') }}
                </p>
              </div>

              <div v-else-if="isBlockedAccess">
                <p class="mb-3 text-title-large text-error">
                  🚫 {{ $i18n('auth.accessBlockedEmailNotVerified') }}
                </p>

                <p class="mb-4">
                  {{ $i18n('auth.verifyToUnlockAccess') }}
                </p>
              </div>

              <div v-else>
                <p class="mb-4">
                  {{ $i18n('auth.pleaseVerifyEmail') }}
                </p>

                <p class="mb-4 text-medium-emphasis">
                  {{ $i18n('auth.verificationEmailSent') }}
                </p>
              </div>
            </div>

            <!-- Success Alert -->
            <v-alert
              v-if="verificationSent"
              class="mb-4"
              closable
              icon="mdi-check-circle"
              :text="$i18n('auth.verificationEmailSentSuccess')"
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
                {{ $i18n('auth.resendVerificationEmail') }}
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
                {{ $i18n('auth.iHaveVerifiedEmail') }}
              </v-btn>

              <!-- Auto-check status indicator -->
              <div v-if="autoCheckInterval && !checkingVerification" class="text-center mt-2">
                <v-chip
                  class="text-body-small"
                  color="primary"
                  size="small"
                  variant="outlined"
                >
                  <v-icon class="me-1" size="small">mdi-autorenew</v-icon>
                  {{ $i18n('auth.autoCheckingIn', timeLeft) }}
                </v-chip>
              </div>

              <div v-if="checkingVerification" class="text-center mt-2">
                <v-chip
                  class="text-body-small"
                  color="success"
                  size="small"
                >
                  <v-icon class="me-1" size="small">mdi-loading mdi-spin</v-icon>
                  {{ $i18n('auth.checkingVerification') }}
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
                {{ $i18n('auth.logout') }}
              </v-btn>
            </v-col>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { onMounted, onUnmounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useTranslate } from '@/composables/useTranslate'
  import { useAuthStore } from '@/stores/auth'

  const $i18n = useTranslate()
  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  // Development mode check

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
  function startAutoCheck () {
    // Initial check after 10 seconds (give email service time to deliver)
    setTimeout(checkVerificationStatus, 10_000)

    // Then check every 30 seconds
    autoCheckInterval.value = setInterval(checkVerificationStatus, 30_000)

    // Start countdown timer
    startCountdown()
  }

  function startCountdown () {
    timeLeft.value = 30
    countdownInterval.value = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        timeLeft.value = 30 // Reset for next cycle
      }
    }, 1000)
  }

  function stopAutoCheck () {
    if (autoCheckInterval.value) {
      clearInterval(autoCheckInterval.value)
      autoCheckInterval.value = null
    }
    if (countdownInterval.value) {
      clearInterval(countdownInterval.value)
      countdownInterval.value = null
    }
  }

  async function checkVerificationStatus () {
    if (checkingVerification.value) return // Prevent multiple simultaneous checks

    try {
      checkingVerification.value = true

      const isVerified = await authStore.refreshUser()

      if (isVerified) {
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

  async function resendVerification () {
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

  async function manualRefresh () {
    // Clear any existing errors
    authStore.clearError()
    checkingVerification.value = true

    try {
      // Use the enhanced refresh method
      const isVerified = await authStore.refreshUser()

      if (isVerified) {
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
        // Add helpful debugging info for user
        authStore.setError(
          $i18n('auth.emailStillNotVerified') + $i18n('auth.differentBrowserHint'),
        )
      }
    } catch (error) {
      console.error('Manual refresh failed:', error)
      authStore.setError($i18n('auth.failedCheckVerificationStatus'))
    } finally {
      checkingVerification.value = false
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    if (isNewRegistration.value) {
      startAutoCheck()
    } else if (isReturningUser.value) {
      startAutoCheck()
    } else if (isBlockedAccess.value) {
      startAutoCheck()
    }
  })

  onUnmounted(() => {
    stopAutoCheck()
  })

  async function signOut () {
    try {
      await authStore.logout()
      router.push('/auth')
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

</script>

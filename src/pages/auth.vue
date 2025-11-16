<template>
  <v-container class="fill-height" fluid>
    <!-- Loading overlay for email verification processing -->
    <v-overlay v-model="processingVerification" class="align-center justify-center" persistent>
      <v-card class="pa-6 text-center" elevation="10">
        <v-progress-circular
          class="mb-4"
          color="primary"
          indeterminate
          size="64"
        />
        <h3 class="text-h6 mb-2">{{ $t('auth.verifyingEmail') }}</h3>
        <p class="text-body-2 text-medium-emphasis">{{ $t('auth.pleaseWait') }}</p>
      </v-card>
    </v-overlay>

    <v-row align="center" justify="center">
      <v-col cols="12" lg="4" md="6" sm="8">
        <!-- Email Verification Success Alert -->
        <v-alert
          v-if="showEmailVerifiedSuccess"
          class="mb-4"
          closable
          icon="mdi-check-circle"
          prominent
          type="success"
          @click:close="showEmailVerifiedSuccess = false"
        >
          <v-alert-title class="text-h6">
            {{ $t('auth.emailVerifiedSuccess') }}
          </v-alert-title>
          <div class="mt-2">
            {{ $t('auth.emailVerifiedLoginPrompt') }}
          </div>
        </v-alert>

        <v-card class="mx-auto" max-width="500">
          <!-- Show Reset Form -->
          <template v-if="showReset">
            <ResetPasswordForm @back-to-login="showReset = false" />
          </template>

          <!-- Show Login/Register Tabs -->
          <template v-else>
            <v-tabs
              v-model="activeTab"
              class="mb-4"
              color="primary"
              grow
            >
              <v-tab value="login">
                {{ $t('auth.login') }}
              </v-tab>
              <v-tab value="register">
                {{ $t('auth.register') }}
              </v-tab>
            </v-tabs>

            <v-tabs-window v-model="activeTab">
              <!-- Login Tab -->
              <v-tabs-window-item value="login">
                <LoginForm @show-reset="showReset = true" />
              </v-tabs-window-item>

              <!-- Register Tab -->
              <v-tabs-window-item value="register">
                <RegisterForm />
              </v-tabs-window-item>
            </v-tabs-window>
          </template>
        </v-card>

        <!-- Back to App Link for authenticated users -->
        <div v-if="authStore.isAuthenticated" class="text-center mt-4">
          <v-btn
            color="primary"
            variant="text"
            @click="$router.push('/')"
          >
            <v-icon start>mdi-home</v-icon>
            {{ $t('auth.backToApp') }}
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { applyActionCode } from 'firebase/auth'
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import LoginForm from '@/components/LoginForm.vue'
  import RegisterForm from '@/components/RegisterForm.vue'
  import ResetPasswordForm from '@/components/ResetPasswordForm.vue'
  import { useI18n } from '@/composables/useI18n'
  import { auth } from '@/firebase'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  const { t } = useI18n()

  // Component state
  const activeTab = ref('login')
  const showReset = ref(false)
  const showEmailVerifiedSuccess = ref(false)
  const processingVerification = ref(false)

  // Handle Firebase action codes (email verification, password reset, etc.)
  async function handleActionCode () {
    const mode = route.query.mode
    const oobCode = route.query.oobCode

    if (!mode || !oobCode) {
      return false // No action code to process
    }

    console.log(`📧 Processing Firebase action: ${mode}`)

    try {
      if (mode === 'verifyEmail') {
        // Show loading overlay
        processingVerification.value = true

        // Apply the email verification code
        await applyActionCode(auth, oobCode)
        console.log('✅ Email verified successfully!')

        // Check if user is currently logged in
        const isLoggedIn = !!auth.currentUser

        if (isLoggedIn) {
          // User is logged in - refresh their session and redirect directly to home
          console.log('🔄 Reloading user to get updated emailVerified status...')
          await auth.currentUser.reload()

          // CRITICAL: Force refresh the auth token to update emailVerified in token claims
          console.log('🔄 Force refreshing auth token...')
          await auth.currentUser.getIdToken(true) // Force refresh = true

          // Update auth store with the refreshed user
          await authStore.refreshUser()

          // Verify that email is now marked as verified
          console.log('✅ Email verified status:', auth.currentUser.emailVerified)

          // Small delay to ensure token is fully propagated
          await new Promise(resolve => setTimeout(resolve, 500))

          console.log('🎉 User was logged in - redirecting directly to home with welcome message')
          // Use replace to avoid back button issues
          router.replace({
            path: '/',
            query: { welcome: 'verified' },
          })
          return true
        } else {
          // User is NOT logged in - show success on login page
          console.log('👤 User was not logged in - showing success message on auth page')
          // Hide loading overlay
          processingVerification.value = false
          // Use replace with a clean URL and show the success alert
          router.replace({
            path: '/auth',
            query: { emailVerified: 'true' },
          })
          // Don't return true - let the page render with the success message
          return false
        }
      } else if (mode === 'resetPassword') {
        // For password reset, redirect to reset password form with the code
        router.push({
          path: '/auth',
          query: { resetCode: oobCode },
        })
        showReset.value = true
        return true
      }
    } catch (error) {
      console.error('❌ Failed to process action code:', error)
      // Hide loading overlay
      processingVerification.value = false
      // Show error and continue to normal auth page
      authStore.setError(
        error.code === 'auth/invalid-action-code'
          ? t('auth.invalidOrExpiredLink')
          : t('auth.verificationFailed'),
      )
      // Clear the query params to show clean URL
      router.replace({ path: '/auth', query: {} })
      return false
    }
  }

  // Redirect if already authenticated
  onMounted(async () => {
    // Wait for auth initialization
    await authStore.initializeAuth()

    // Check for action codes first (email verification, password reset, etc.)
    const actionHandled = await handleActionCode()
    if (actionHandled) {
      return // Action code handled, no need to continue
    }

    // Check if we should show email verified success message
    if (route.query.emailVerified === 'true') {
      showEmailVerifiedSuccess.value = true
      // Set active tab to login
      activeTab.value = 'login'
      // Clean up the URL after a short delay
      setTimeout(() => {
        router.replace({ path: '/auth', query: {} })
      }, 500)
    }

    // If user is already authenticated, redirect to home
    if (authStore.isAuthenticated) {
      router.push('/')
    }
  })
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%);
}
</style>

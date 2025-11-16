<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" lg="4" md="6" sm="8">
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
        // Apply the email verification code
        await applyActionCode(auth, oobCode)
        console.log('✅ Email verified successfully!')

        // Refresh the current user to get updated emailVerified status
        if (auth.currentUser) {
          await auth.currentUser.reload()
          await authStore.refreshUser()
        }

        // Redirect to home with success message
        router.push({
          path: '/',
          query: { welcome: 'verified' },
        })
        return true
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
      // Show error and continue to normal auth page
      authStore.setError(
        error.code === 'auth/invalid-action-code'
          ? t('auth.invalidOrExpiredLink')
          : t('auth.verificationFailed'),
      )
    }

    // Clear the query params to show clean URL
    router.replace({ path: '/auth', query: {} })
    return false
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

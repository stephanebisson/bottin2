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
            <p class="mb-4">
              {{ $t('auth.pleaseVerifyEmail') }}
            </p>
            <p class="mb-4 text-medium-emphasis">
              {{ $t('auth.verificationEmailSent') }}
            </p>

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
                color="primary"
                :disabled="authStore.loading"
                :loading="authStore.loading"
                size="large"
                variant="elevated"
                @click="resendVerification"
              >
                {{ $t('auth.resendVerificationEmail') }}
              </v-btn>

              <v-btn
                block
                class="mt-3"
                color="secondary"
                size="large"
                variant="outlined"
                @click="refreshAuth"
              >
                {{ $t('auth.iHaveVerifiedEmail') }}
              </v-btn>

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
            </v-col>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'
  import { auth } from '@/firebase'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const authStore = useAuthStore()
  const { t } = useI18n()
  const verificationSent = ref(false)

  const resendVerification = async () => {
    try {
      await authStore.sendVerificationEmail()
      verificationSent.value = true
    } catch (error) {
      console.error('Failed to resend verification email:', error)
    }
  }

  const refreshAuth = async () => {
    try {
      // Clear any existing errors
      authStore.clearError()

      console.log('Refreshing user verification status...')

      // Use the auth store method to refresh user
      const isVerified = await authStore.refreshUser()

      console.log('Email verified:', isVerified)

      if (isVerified) {
        console.log('Email is verified, navigating to home page')
        // Navigate to home page
        router.push('/')
      } else {
        authStore.setError(t('auth.emailStillNotVerified'))
      }
    } catch (error) {
      console.error('Failed to refresh auth status:', error)
      authStore.setError(t('auth.failedCheckVerificationStatus'))
    }
  }

  const signOut = async () => {
    try {
      await authStore.logout()
      router.push('/auth')
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }
</script>

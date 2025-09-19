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
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { useI18n } from '@/composables/useI18n'
  import LoginForm from '@/components/LoginForm.vue'
  import RegisterForm from '@/components/RegisterForm.vue'
  import ResetPasswordForm from '@/components/ResetPasswordForm.vue'

  const router = useRouter()
  const authStore = useAuthStore()
  const { t } = useI18n()

  // Component state
  const activeTab = ref('login')
  const showReset = ref(false)

  // Redirect if already authenticated
  onMounted(async () => {
    // Wait for auth initialization
    await authStore.initializeAuth()
    
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
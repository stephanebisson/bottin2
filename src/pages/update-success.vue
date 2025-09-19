<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card>
          <v-card-text class="text-center pa-8">
            <!-- Success Icon -->
            <v-icon color="success" size="80">mdi-check-circle</v-icon>
            
            <!-- Success Title -->
            <h2 class="text-h4 font-weight-bold mt-4 mb-2 text-success">
              {{ $t('updateSuccess.title') }}
            </h2>
            
            <!-- Thank You Message -->
            <p class="text-body-1 mb-6">
              {{ $t('updateSuccess.message') }}
            </p>

            <!-- Account Creation Section -->
            <div v-if="!hasAccount" class="mb-6">
              <v-alert
                color="info"
                icon="mdi-account-plus"
                variant="tonal"
                class="mb-4"
              >
                <div class="text-body-1 font-weight-medium mb-2">
                  {{ $t('updateSuccess.createAccountTitle') }}
                </div>
                <div class="text-body-2">
                  {{ $t('updateSuccess.createAccountMessage') }}
                </div>
              </v-alert>

              <v-btn
                color="primary"
                prepend-icon="mdi-account-plus"
                size="large"
                @click="goToAccountCreation"
              >
                {{ $t('updateSuccess.createAccount') }}
              </v-btn>
            </div>

            <!-- Account Exists Section -->
            <div v-else class="mb-6">
              <v-alert
                color="success"
                icon="mdi-account-check"
                variant="tonal"
                class="mb-4"
              >
                <div class="text-body-1">
                  {{ $t('updateSuccess.accountExists') }}
                </div>
              </v-alert>

              <v-btn
                color="primary"
                prepend-icon="mdi-login"
                size="large"
                @click="goToLogin"
              >
                {{ $t('updateSuccess.signIn') }}
              </v-btn>
            </div>

            <!-- Additional Information -->
            <v-divider class="my-6" />
            
            <div class="text-body-2 text-grey-darken-1">
              <p class="mb-2">
                {{ $t('updateSuccess.nextSteps') }}
              </p>
              <ul class="text-left mt-4">
                <li>{{ $t('updateSuccess.step1') }}</li>
                <li>{{ $t('updateSuccess.step2') }}</li>
                <li>{{ $t('updateSuccess.step3') }}</li>
              </ul>
            </div>

            <!-- Contact Information -->
            <v-alert
              color="grey-lighten-4"
              icon="mdi-help-circle"
              variant="flat"
              class="mt-6"
            >
              <div class="text-body-2">
                {{ $t('updateSuccess.questions') }}
              </div>
            </v-alert>

            <!-- Home Button -->
            <v-btn
              class="mt-4"
              color="grey"
              variant="outlined"
              @click="goHome"
            >
              {{ $t('updateSuccess.backHome') }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  // Get query parameters
  const hasAccount = computed(() => route.query.hasAccount === '1')
  const email = computed(() => route.query.email || '')

  // Navigation methods
  const goToAccountCreation = () => {
    router.push({
      path: '/auth',
      query: { 
        mode: 'register',
        email: email.value,
        fromUpdate: '1'
      }
    })
  }

  const goToLogin = () => {
    router.push({
      path: '/auth',
      query: { 
        mode: 'login',
        email: email.value 
      }
    })
  }

  const goHome = () => {
    router.push('/')
  }

  onMounted(() => {
    // Track successful update completion (for analytics if needed)
    console.log('Parent information update completed successfully')
  })
</script>
<template>
  <v-container class="py-12">
    <v-row class="justify-center">
      <v-col cols="12" lg="6" md="8">
        <v-card>
          <v-card-text class="text-center pa-8">
            <!-- Success Icon -->
            <v-icon color="success" size="80">mdi-check-circle</v-icon>

            <!-- Success Title -->
            <h2 class="text-headline-large font-weight-bold mt-4 mb-2 text-success">
              {{ $i18n('updateSuccess.title') }}
            </h2>

            <!-- Thank You Message -->
            <p class="text-body-large mb-6">
              {{ optedOut ? $i18n('updateSuccess.optedOutMessage') : $i18n('updateSuccess.message') }}
            </p>

            <!-- Online Directory Account Section -->
            <div class="mb-6">
              <v-alert
                class="mb-4 text-left"
                :color="accountSection.color"
                :icon="accountSection.icon"
                variant="tonal"
              >
                <div class="text-body-large font-weight-medium mb-2">
                  {{ $i18n(accountSection.title) }}
                </div>

                <div class="text-body-medium">
                  {{ $i18n(accountSection.message, email) }}
                </div>
              </v-alert>

              <v-btn
                color="primary"
                :prepend-icon="accountSection.buttonIcon"
                size="large"
                @click="goToAuth"
              >
                {{ $i18n(accountSection.button) }}
              </v-btn>
            </div>

            <!-- Contact Information -->
            <v-alert
              class="mt-6"
              color="surface-light"
              icon="mdi-help-circle"
              variant="flat"
            >
              <div class="text-body-medium">
                {{ $i18n('updateSuccess.questions') }}
              </div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  const route = useRoute()
  const router = useRouter()

  // Online directory account status: 'active' | 'unverified' | 'none'
  const accountStatus = computed(() => route.query.account || 'none')
  const email = computed(() => route.query.email || '')
  const optedOut = computed(() => route.query.optedOut === '1')

  const ACCOUNT_SECTIONS = {
    none: {
      color: 'info',
      icon: 'mdi-account-plus',
      title: 'updateSuccess.noAccountTitle',
      message: 'updateSuccess.noAccountMessage',
      button: 'updateSuccess.createAccount',
      buttonIcon: 'mdi-account-plus',
      tab: 'register',
    },
    unverified: {
      color: 'warning',
      icon: 'mdi-email-alert',
      title: 'updateSuccess.unverifiedTitle',
      message: 'updateSuccess.unverifiedMessage',
      button: 'updateSuccess.signIn',
      buttonIcon: 'mdi-login',
      tab: 'login',
    },
    active: {
      color: 'success',
      icon: 'mdi-account-check',
      title: 'updateSuccess.activeTitle',
      message: 'updateSuccess.activeMessage',
      button: 'updateSuccess.openDirectory',
      buttonIcon: 'mdi-book-open-variant',
      tab: 'login',
    },
  }

  const accountSection = computed(() => ACCOUNT_SECTIONS[accountStatus.value] || ACCOUNT_SECTIONS.none)

  // /auth sends already signed-in users straight to the directory
  function goToAuth () {
    router.push({
      path: '/auth',
      query: { tab: accountSection.value.tab, email: email.value },
    })
  }
</script>

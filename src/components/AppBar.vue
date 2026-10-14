<template>
  <v-app-bar
    class="app-bar-fixed"
    :class="{ 'mobile-app-bar': mobile }"
    color="primary"
    dark
    elevation="1"
  >
    <v-app-bar-nav-icon @click="$emit('toggle-drawer')" />

    <v-toolbar-title class="app-title" tag="h1">
      {{ pageTitle }}
    </v-toolbar-title>

    <v-spacer v-if="!mobile" />

    <div class="d-flex align-center" :class="{ 'ml-auto': mobile }">
      <!-- Refresh Button (tablet/desktop, when authenticated, hidden on small mobile) -->
      <template v-if="authStore.isAuthenticated && !smAndDown">
        <v-tooltip location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              icon
              :loading="isRefreshing"
              variant="text"
              @click="handleRefresh"
            >
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </template>

          <span>{{ $i18n('common.refresh') }}</span>
        </v-tooltip>
      </template>

      <!-- User Menu (when authenticated) -->
      <template v-if="authStore.isAuthenticated">
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              icon
              variant="text"
            >
              <v-avatar color="surface" size="32">
                <span v-if="userInitials" class="text-body-medium font-weight-bold text-primary">{{ userInitials }}</span>
                <v-icon v-else color="primary">mdi-account</v-icon>
              </v-avatar>
            </v-btn>
          </template>

          <v-list>
            <!-- User Info -->
            <v-list-item>
              <v-list-item-title class="font-weight-bold">
                {{ currentUserFullName }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ authStore.userEmail }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider />

            <!-- Profile -->
            <v-list-item
              prepend-icon="mdi-account-edit"
              @click="$router.push('/profile')"
            >
              <v-list-item-title>{{ $i18n('nav.profile') }}</v-list-item-title>
            </v-list-item>

            <!-- Feedback -->
            <v-list-item
              prepend-icon="mdi-message-text"
              @click="$router.push('/feedback')"
            >
              <v-list-item-title>{{ $i18n('footer.sendFeedback') }}</v-list-item-title>
            </v-list-item>

            <v-divider />

            <!-- Logout -->
            <v-list-item
              :loading="authStore.loading"
              prepend-icon="mdi-logout"
              @click="handleLogout"
            >
              <v-list-item-title>{{ $i18n('auth.logout') }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>

      <!-- Login Button (when not authenticated) -->
      <template v-else>
        <v-tooltip location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              icon
              variant="text"
              @click="$router.push('/auth')"
            >
              <v-icon>mdi-account-outline</v-icon>
            </v-btn>
          </template>

          <span>{{ $i18n('auth.login') }}</span>
        </v-tooltip>
      </template>
    </div>
  </v-app-bar>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useTranslate } from '@/composables/useTranslate'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  defineEmits(['toggle-drawer'])

  const route = useRoute()
  const router = useRouter()
  const { mobile, smAndDown } = useDisplay()

  const $i18n = useTranslate()

  // Access stores
  const firebaseStore = useFirebaseDataStore()
  const authStore = useAuthStore()

  // Refresh state
  const isRefreshing = ref(false)

  const currentParent = computed(() => firebaseStore.currentParent)

  // Get current user's full name from parent record
  const currentUserFullName = computed(() => {
    return currentParent.value?.fullName || authStore.userDisplayName || ''
  })

  // Initials from the parent record; the avatar shows an icon when there is none
  const userInitials = computed(() => {
    const parent = currentParent.value
    if (!parent) return ''
    return `${parent.first_name.charAt(0)}${parent.last_name.charAt(0)}`.toUpperCase()
  })

  // Pages declare their title with definePage({ meta: { titleKey } }); others show the app name
  const pageTitle = computed(() => $i18n(route.meta.titleKey || 'nav.schoolDirectory'))

  async function handleRefresh () {
    try {
      isRefreshing.value = true
      console.log('AppBar: Refreshing all data...')

      // Force refresh all DTO data (bypasses cache)
      await firebaseStore.loadAllDTOData(true)

      console.log('AppBar: All data refreshed successfully')
    } catch (error) {
      console.error('AppBar: Error refreshing data', error)
    } finally {
      isRefreshing.value = false
    }
  }

  async function handleLogout () {
    try {
      await authStore.logout()
      router.push('/auth')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
</script>

<style scoped>
  /* Fixed app bar - Vuetify 3 removed the app prop */
  .app-bar-fixed {
    position: fixed !important;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
  }

  /* Native mobile app styling */
  .mobile-app-bar {
    /* Support safe areas for notched devices (iPhone X+, etc) */
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-top: env(safe-area-inset-top);
  }

  /* App title responsive handling */
  .app-title {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* On mobile, reduce title size and ensure proper spacing */
  @media (max-width: 600px) {
    .app-title {
      font-size: 1.1rem !important;
      max-width: calc(100vw - 200px);
    }
  }
</style>

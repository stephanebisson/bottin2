<template>
  <v-app-bar
    class="app-bar-fixed"
    :class="{ 'mobile-app-bar': mobile }"
    color="primary"
    dark
    elevation="2"
  >
    <v-app-bar-nav-icon @click="$emit('toggle-drawer')" />

    <v-toolbar-title class="app-title">
      {{ pageTitle }}
    </v-toolbar-title>

    <v-spacer v-if="!mobile" />

    <div class="d-flex align-center" :class="{ 'ml-auto': mobile }">
      <!-- Messaging Icon (when authenticated and chat enabled) -->
      <template v-if="authStore.isAuthenticated && messagingShellRef && currentUserHasChat">
        <v-badge
          color="error"
          :content="unreadCount"
          :model-value="unreadCount > 0"
        >
          <v-btn
            icon="mdi-forum"
            variant="text"
            @click="handleToggleMessaging"
          />
        </v-badge>
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
              <v-avatar color="primary" size="32">
                <v-icon>mdi-account</v-icon>
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
              <v-list-item-title>{{ $t('nav.profile') }}</v-list-item-title>
            </v-list-item>

            <!-- Feedback -->
            <v-list-item
              prepend-icon="mdi-message-text"
              @click="$router.push('/feedback')"
            >
              <v-list-item-title>{{ $t('footer.sendFeedback') }}</v-list-item-title>
            </v-list-item>

            <v-divider />

            <!-- Logout -->
            <v-list-item
              :loading="authStore.loading"
              prepend-icon="mdi-logout"
              @click="handleLogout"
            >
              <v-list-item-title>{{ $t('auth.logout') }}</v-list-item-title>
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
          <span>{{ $t('auth.login') }}</span>
        </v-tooltip>
      </template>
    </div>
  </v-app-bar>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import ThemeSelector from '@/components/ThemeSelector.vue'
  import { useI18n } from '@/composables/useI18n'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const props = defineProps({
    messagingShellRef: {
      type: Object,
      default: null,
    },
  })

  defineEmits(['toggle-drawer'])

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const { mobile } = useDisplay()

  // Access stores
  const firebaseStore = useFirebaseDataStore()
  const { dataStats } = firebaseStore
  const authStore = useAuthStore()

  // Get current parent
  const currentParent = computed(() => {
    if (!authStore.isAuthenticated || !authStore.userEmail) return null
    return firebaseStore.parentsDTO.find(p => p.email === authStore.userEmail)
  })

  // Check if current user has chat enabled
  const currentUserHasChat = computed(() => {
    return currentParent.value?.hasChatEnabled || false
  })

  // Get current user's full name from parent record
  const currentUserFullName = computed(() => {
    return currentParent.value?.fullName || authStore.userDisplayName || ''
  })

  // Computed property to safely access messaging shell's unread count
  const unreadCount = computed(() => {
    try {
      if (!props.messagingShellRef) return 0
      // The ref might not be set yet, or the component might not expose totalUnreadCount
      const count = props.messagingShellRef.totalUnreadCount
      if (typeof count === 'number') return count
      if (count?.value !== undefined) return count.value
      return 0
    } catch {
      return 0
    }
  })

  function handleToggleMessaging() {
    if (props.messagingShellRef?.toggleMessaging) {
      props.messagingShellRef.toggleMessaging()
    }
  }

  const pageTitle = computed(() => {
    const routeName = route.name

    switch (routeName) {
      case 'classes': {
        return t('classes.title')
      }
      case 'students': {
        return t('students.title')
      }
      case 'parents': {
        return t('parents.title')
      }
      case 'staff': {
        return t('staff.title')
      }
      case 'committees': {
        return t('committees.title')
      }
      case 'admin': {
        return t('admin.title')
      }
      case 'index': {
        return t('nav.schoolDirectory')
      }
      default: {
        return t('nav.schoolDirectory')
      }
    }
  })

  const lastUpdatedFormatted = computed(() => {
    if (!dataStats.value.lastUpdated) return ''
    const date = new Date(dataStats.value.lastUpdated)
    return date.toLocaleTimeString()
  })

  async function refreshData () {
    await firebaseStore.refreshData()
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

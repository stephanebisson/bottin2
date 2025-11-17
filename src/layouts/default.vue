<template>
  <v-app>
    <AppBar
      v-if="!isPrintPage"
      :messaging-shell-ref="messagingShellRef"
      @toggle-drawer="drawer = !drawer"
    />

    <NavigationDrawer v-if="!isPrintPage" v-model="drawer" />

    <!-- Pull-to-refresh indicator -->
    <div
      v-if="!isPrintPage && (isPulling || isRefreshing)"
      class="pull-refresh-indicator"
      :style="{
        transform: `translateY(${Math.min(pullDistance, 80)}px)`,
        opacity: Math.min(pullDistance / 80, 1)
      }"
    >
      <v-progress-circular
        color="primary"
        :indeterminate="isRefreshing"
        :model-value="isPulling && !isRefreshing ? (pullDistance / 80) * 100 : undefined"
        size="32"
      />
    </div>

    <v-main :class="{ 'main-content': !isPrintPage }">
      <router-view />
    </v-main>

    <AppFooter v-if="!isPrintPage" />

    <!-- Messaging System -->
    <MessagingShell
      v-if="!isPrintPage && authStore.isAuthenticated && currentUserHasChat"
      ref="messagingShellRef"
      :chat-enabled="currentUserHasChat"
      :current-user-email="authStore.userEmail"
      :current-user-name="currentUserFullName"
    />

    <!-- PWA Update Prompt -->
    <UpdatePrompt />
  </v-app>
</template>

<script setup>
  import { computed, provide, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import AppBar from '@/components/AppBar.vue'
  import AppFooter from '@/components/AppFooter.vue'
  import MessagingShell from '@/components/messaging/MessagingShell.vue'
  import NavigationDrawer from '@/components/NavigationDrawer.vue'
  import UpdatePrompt from '@/components/UpdatePrompt.vue'
  import { usePullToRefresh } from '@/composables/usePullToRefresh'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  const { mobile } = useDisplay()
  const route = useRoute()

  // Reference to MessagingShell component
  const messagingShellRef = ref(null)

  // Provide to all child components
  provide('messagingShell', messagingShellRef)

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

  // Note: currentUserEmail is passed directly from authStore.userEmail to MessagingShell

  // Check if current route is a print page
  const isPrintPage = computed(() => {
    return route.path === '/admin/print'
  })

  // Check if current route is an update page that should have drawer collapsed
  const isUpdatePage = computed(() => {
    const path = route.path
    return path.startsWith('/update/') || path.startsWith('/staff-update/')
  })

  // Drawer state - closed on mobile by default
  // On desktop: closed for update pages, open for other pages
  const drawer = ref(mobile.value ? false : !isUpdatePage.value)

  // Global refresh handler
  async function handleRefresh () {
    try {
      console.log('Pull-to-refresh: Refreshing all data...')

      // Force refresh all DTO data (bypasses cache)
      await firebaseStore.loadAllDTOData(true)

      console.log('Pull-to-refresh: All data refreshed successfully')
    } catch (error) {
      console.error('Pull-to-refresh: Error refreshing data', error)
    }
  }

  // Pull-to-refresh functionality
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh(handleRefresh, {
    threshold: 80,
    maxPull: 120,
    disabled: isPrintPage.value,
  })

  // Watch for mobile state changes and adjust drawer accordingly
  watch(mobile, newMobile => {
    // On mobile close drawer, on desktop check if it's an update page
    drawer.value = newMobile ? false : !isUpdatePage.value
  }, { immediate: false })

  // Watch for route changes and adjust drawer for desktop
  watch(isUpdatePage, newIsUpdatePage => {
    // Only adjust on desktop
    if (!mobile.value) {
      drawer.value = !newIsUpdatePage
    }
  })
</script>

<style scoped>
  /* Add padding to account for fixed app bar */
  .main-content {
    padding-top: 64px !important;
  }

  /* Pull-to-refresh indicator */
  .pull-refresh-indicator {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
    pointer-events: none;
  }
</style>

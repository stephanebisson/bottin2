<template>
  <v-app>
    <AppBar
      v-if="!isPrintPage"
      :messaging-shell-ref="messagingShellRef"
      @toggle-drawer="drawer = !drawer"
    />

    <NavigationDrawer v-if="!isPrintPage" v-model="drawer" />

    <v-main :class="{ 'main-content': !isPrintPage }">
      <router-view />
    </v-main>

    <AppFooter v-if="!isPrintPage && !mobile" />

    <!-- Messaging System -->
    <MessagingShell
      v-if="!isPrintPage && authStore.isAuthenticated && currentUserHasChat"
      ref="messagingShellRef"
      :chat-enabled="currentUserHasChat"
      :current-user-email="authStore.userEmail"
      :current-user-name="authStore.userDisplayName"
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

  // Check if current user has chat enabled
  const currentUserHasChat = computed(() => {
    if (!authStore.isAuthenticated || !authStore.userEmail) return false
    const currentParent = firebaseStore.parentsDTO.find(p => p.email === authStore.userEmail)
    return currentParent?.hasChatEnabled || false
  })

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
</style>

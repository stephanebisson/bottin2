<template>
  <v-app>
    <AppBar
      v-if="!isPrintPage"
      :messaging-shell-ref="messagingShellRef"
      @toggle-drawer="drawer = !drawer"
    />

    <NavigationDrawer v-if="!isPrintPage" v-model="drawer" />

    <v-main>
      <router-view />
    </v-main>

    <AppFooter v-if="!isPrintPage" />

    <!-- Messaging System -->
    <MessagingShell
      v-if="!isPrintPage && authStore.isAuthenticated"
      ref="messagingShellRef"
      :current-user-email="authStore.userEmail"
      :current-user-name="authStore.userDisplayName"
    />
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
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()

  const { mobile } = useDisplay()
  const route = useRoute()

  // Reference to MessagingShell component
  const messagingShellRef = ref(null)

  // Provide to all child components
  provide('messagingShell', messagingShellRef)

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

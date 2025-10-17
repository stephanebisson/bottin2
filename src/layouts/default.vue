<template>
  <v-app>
    <AppBar v-if="!isPrintPage" @toggle-drawer="drawer = !drawer" />

    <NavigationDrawer v-if="!isPrintPage" v-model="drawer" />

    <v-main>
      <router-view />
    </v-main>

    <AppFooter v-if="!isPrintPage" />
  </v-app>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import AppBar from '@/components/AppBar.vue'
  import AppFooter from '@/components/AppFooter.vue'
  import NavigationDrawer from '@/components/NavigationDrawer.vue'

  const { mobile } = useDisplay()
  const route = useRoute()

  // Check if current route is a print page
  const isPrintPage = computed(() => {
    return route.path === '/admin/directory-print'
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

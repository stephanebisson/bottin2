<template>
  <v-app>
    <AppBar @toggle-drawer="drawer = !drawer" />

    <NavigationDrawer v-model="drawer" />

    <v-main>
      <router-view />
    </v-main>

    <AppFooter />
  </v-app>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { useDisplay } from 'vuetify'
  import AppBar from '@/components/AppBar.vue'
  import NavigationDrawer from '@/components/NavigationDrawer.vue'

  const { mobile } = useDisplay()

  // Drawer state - closed on mobile by default, open on desktop
  const drawer = ref(!mobile.value)

  // Watch for mobile state changes and adjust drawer accordingly
  watch(mobile, newMobile => {
    // On mobile close drawer, on desktop open drawer
    drawer.value = newMobile ? false : true
  }, { immediate: false })
</script>

<template>
  <v-app>
    <AppBar
      v-if="!isPrintPage"
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
  </v-app>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import AppBar from '@/components/AppBar.vue'
  import AppFooter from '@/components/AppFooter.vue'
  import NavigationDrawer from '@/components/NavigationDrawer.vue'
  import { usePullToRefresh } from '@/composables/usePullToRefresh'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const firebaseStore = useFirebaseDataStore()

  const { mobile } = useDisplay()
  const route = useRoute()

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
      // Force refresh all DTO data (bypasses cache)
      await firebaseStore.loadAllDTOData(true)
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

<template>
  <v-app-bar
    app
    color="primary"
    dark
    elevation="4"
  >
    <v-app-bar-nav-icon @click="$emit('toggle-drawer')" />

    <v-toolbar-title>
      {{ pageTitle }}
    </v-toolbar-title>

    <v-spacer />

    <!-- User Menu (when authenticated) -->
    <template v-if="authStore.isAuthenticated">
      <v-menu>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
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
              {{ authStore.userDisplayName }}
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
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
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
  </v-app-bar>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ThemeSelector from '@/components/ThemeSelector.vue'
  import { useI18n } from '@/composables/useI18n'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  defineEmits(['toggle-drawer'])

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  // Access stores
  const firebaseStore = useFirebaseDataStore()
  const { dataStats } = firebaseStore
  const authStore = useAuthStore()

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

  const refreshData = async () => {
    await firebaseStore.refreshData()
  }

  const handleLogout = async () => {
    try {
      await authStore.logout()
      router.push({ name: 'auth' })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
</script>

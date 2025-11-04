<template>
  <v-navigation-drawer
    v-model="drawerModel"
    class="navigation-drawer-fixed"
    :permanent="!mobile"
    :temporary="mobile"
    width="280"
  >
    <v-list>
      <!-- App Title -->
      <v-list-item
        class="mb-2"
        prepend-icon="mdi-book-open-page-variant"
        :subtitle="$t('nav.schoolDirectory')"
        :title="$t('nav.schoolDirectorySystem')"
      />

      <!-- User Info (when authenticated) -->
      <template v-if="authStore.isAuthenticated">
        <v-list-item class="mb-2 bg-primary-lighten-5">
          <template #prepend>
            <v-avatar color="primary" size="40">
              <v-icon>mdi-account</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold text-body-2">
            {{ currentUserFullName }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ authStore.userEmail }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>

      <v-divider />

      <!-- Navigation Items (only show when authenticated) -->
      <template v-if="authStore.isAuthenticated">
        <template v-for="item in navigationItems" :key="item.title">
          <!-- Items with subitems -->
          <v-list-group v-if="item.children">
            <template #activator="{ props: activatorProps }">
              <v-list-item
                v-bind="activatorProps"
                :prepend-icon="item.icon"
                :title="item.title"
              />
            </template>
            <v-list-item
              v-for="child in item.children"
              :key="child.title"
              :active="$route.path === child.to"
              link
              :prepend-icon="child.icon"
              :title="child.title"
              :to="child.to"
            />
          </v-list-group>
          <!-- Regular items without subitems -->
          <v-list-item
            v-else
            :active="$route.path === item.to"
            link
            :prepend-icon="item.icon"
            :title="item.title"
            :to="item.to"
          />
        </template>
      </template>

      <!-- Welcome message for unauthenticated users -->
      <template v-else>
        <v-list-item class="text-center py-4">
          <v-list-item-title class="text-body-2 text-grey-darken-1">
            {{ $t('nav.pleaseLogin') }}
          </v-list-item-title>
        </v-list-item>

        <v-list-item class="px-4">
          <v-btn
            block
            color="primary"
            variant="elevated"
            @click="$router.push('/auth')"
          >
            <v-icon start>mdi-login</v-icon>
            {{ $t('auth.login') }}
          </v-btn>
        </v-list-item>
      </template>
    </v-list>


  </v-navigation-drawer>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { useDisplay } from 'vuetify'
  import { useI18n } from '@/composables/useI18n'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false,
    },
  })

  const emit = defineEmits(['update:modelValue'])

  const { mobile } = useDisplay()

  const drawerModel = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  const { t } = useI18n()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // Get current user's full name from parent record
  const currentUserFullName = computed(() => {
    if (!authStore.userEmail) return authStore.userDisplayName || ''
    const currentParent = firebaseStore.parentsDTO.find(p => p.email === authStore.userEmail)
    return currentParent?.fullName || authStore.userDisplayName || ''
  })

  // Admin status tracking
  const isAdmin = ref(false)

  // Check admin status using Firebase Custom Claims
  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAdmin.value = false
      return
    }

    try {
      // Get ID token result which includes custom claims
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      isAdmin.value = !!idTokenResult.claims.admin
    } catch (error) {
      console.error('Failed to check admin status in nav:', error)
      isAdmin.value = false
    }
  }

  // Watch for authentication changes
  watch(() => authStore.isAuthenticated, async newValue => {
    if (newValue) {
      await checkAdminStatus()
    } else {
      isAdmin.value = false
    }
  }, { immediate: true })

  const navigationItems = computed(() => {
    const baseItems = [
      {
        title: t('nav.home'),
        icon: 'mdi-home',
        to: '/',
      },
      {
        title: t('nav.classes'),
        icon: 'mdi-school',
        to: '/classes',
      },
      {
        title: t('directory.title'),
        icon: 'mdi-book-account',
        to: '/families',
      },
      // Temporarily hidden while testing in production
      // {
      //   title: t('map.title'),
      //   icon: 'mdi-map-marker-multiple',
      //   to: '/map',
      // },
      {
        title: t('nav.staff'),
        icon: 'mdi-account-tie',
        to: '/staff',
      },
      {
        title: t('nav.committees'),
        icon: 'mdi-account-group',
        to: '/committees',
      },
    ]

    // Only add admin link if user is admin
    if (isAdmin.value) {
      baseItems.push({
        title: t('admin.title'),
        icon: 'mdi-cog',
        children: [
          {
            title: t('admin.annualUpdateWorkflow'),
            icon: 'mdi-calendar-sync',
            to: '/admin/annual-update',
          },
          {
            title: t('admin.parentsDirectory.title'),
            icon: 'mdi-account-heart-outline',
            to: '/admin/parents',
          },
          {
            title: t('admin.studentsTable.title'),
            icon: 'mdi-account-school-outline',
            to: '/admin/students',
          },
          {
            title: t('admin.staffUpdate.title'),
            icon: 'mdi-account-tie-outline',
            to: '/admin/staff-update',
          },
          {
            title: t('admin.directoryPrint.title'),
            icon: 'mdi-printer',
            to: '/admin/print',
          },
          {
            title: t('feedback.admin.title'),
            icon: 'mdi-message-text',
            to: '/admin/feedback',
          },
        ],
      })
    }

    return baseItems
  })
</script>

<style scoped>
  /* Fixed navigation drawer - ensures it stays viewport-height and fixed position */
  .navigation-drawer-fixed {
    position: fixed !important;
    top: 0;
    bottom: 0;
    left: 0;
    height: 100vh !important;
    max-height: 100vh !important;
    z-index: 999;
  }
</style>

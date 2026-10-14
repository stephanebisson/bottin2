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
        :subtitle="$i18n('nav.schoolDirectory')"
        :title="$i18n('nav.schoolDirectorySystem')"
      >
        <template #prepend>
          <img
            alt=""
            class="me-4"
            height="48"
            src="@/assets/EF_logo_small.png"
            width="48"
          >
        </template>
      </v-list-item>

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
          <v-list-item-title class="text-body-medium text-medium-emphasis">
            {{ $i18n('nav.pleaseLogin') }}
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
            {{ $i18n('auth.login') }}
          </v-btn>
        </v-list-item>
      </template>
    </v-list>

  </v-navigation-drawer>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useDisplay } from 'vuetify'
  import { useAuthStore } from '@/stores/auth'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false,
    },
  })

  const emit = defineEmits(['update:model-value'])

  const { mobile } = useDisplay()

  // Get i18n function from vue-banana-i18n
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)

  const drawerModel = computed({
    get: () => props.modelValue,
    set: value => emit('update:model-value', value),
  })

  const authStore = useAuthStore()

  const navigationItems = computed(() => {
    const baseItems = [
      {
        title: $i18n('nav.home'),
        icon: 'mdi-home',
        to: '/',
      },
      {
        title: $i18n('nav.classes'),
        icon: 'mdi-school',
        to: '/classes',
      },
      {
        title: $i18n('directory.title'),
        icon: 'mdi-book-account',
        to: '/families',
      },
      {
        title: $i18n('nav.staff'),
        icon: 'mdi-account-tie',
        to: '/staff',
      },
      {
        title: $i18n('nav.committees'),
        icon: 'mdi-account-group',
        to: '/committees',
      },
    ]

    // Only add admin link if user is admin
    if (authStore.isAdmin) {
      baseItems.push({
        title: $i18n('admin.title'),
        icon: 'mdi-cog',
        children: [
          {
            title: $i18n('nav.adminMenu.logs'),
            icon: 'mdi-history',
            to: '/admin/logs',
          },
          {
            title: $i18n('nav.adminMenu.parents'),
            icon: 'mdi-account-heart-outline',
            to: '/admin/parents',
          },
          {
            title: $i18n('nav.adminMenu.students'),
            icon: 'mdi-account-school-outline',
            to: '/admin/students',
          },
          {
            title: $i18n('nav.adminMenu.staff'),
            icon: 'mdi-account-tie-outline',
            to: '/admin/staff-update',
          },
          {
            title: $i18n('nav.adminMenu.print'),
            icon: 'mdi-printer',
            to: '/admin/print',
          },
          {
            title: $i18n('nav.adminMenu.feedback'),
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

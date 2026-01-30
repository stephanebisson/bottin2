<template>
  <v-container>
    <!-- Welcome verification success message -->
    <v-alert
      v-if="showWelcomeMessage"
      border="start"
      border-color="success"
      class="mb-6"
      closable
      elevation="2"
      icon="mdi-check-circle"
      prominent
      type="success"
      @click:close="showWelcomeMessage = false"
    >
      <v-alert-title class="text-h5 mb-2">
        🎉 {{ $i18n('auth.emailVerifiedSuccessTitle') }}
      </v-alert-title>
      <div>{{ $i18n('auth.welcomeEmailVerified') }}</div>
    </v-alert>

    <!-- Header Section -->
    <div class="text-center mb-8">
      <h1 class="text-h3 font-weight-bold mb-2">{{ $i18n('nav.schoolDirectory') }}</h1>
      <p class="text-h6 text-grey-darken-1">{{ $i18n('dashboard.welcome') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="firebaseStore.loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $i18n('dashboard.loadingData') }}</p>
    </div>

    <!-- Error State -->
    <div v-if="firebaseStore.error" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.error"
        :title="$i18n('dashboard.errorLoadingData')"
        type="error"
        @click:close="firebaseStore.error = null"
      />
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="!firebaseStore.loading">
      <!-- Navigation Grid -->
      <v-row class="mb-6">
        <v-col
          v-for="navItem in navigationItems"
          :key="navItem.route"
          class="d-flex"
          cols="12"
          md="4"
          sm="6"
        >
          <v-card
            class="navigation-card pa-6 text-center d-flex flex-column"
            elevation="2"
            hover
            style="cursor: pointer; height: 100%; width: 100%;"
            @click="navigateTo(navItem.route)"
          >
            <div class="d-flex flex-column align-center flex-grow-1">
              <v-icon class="mb-4" :color="navItem.color" size="64">{{ navItem.icon }}</v-icon>
              <h3 class="text-h5 font-weight-bold mb-2">{{ navItem.title }}</h3>
              <p class="text-body-2 text-grey-darken-1 mb-3 flex-grow-1">{{ navItem.description }}</p>
            </div>
            <div class="d-flex justify-center gap-3 flex-wrap">
              <v-chip v-if="!navItem.counts" :color="navItem.color" size="small" variant="outlined">
                {{ navItem.count }} {{ navItem.countLabel }}
              </v-chip>
              <template v-else>
                <v-chip
                  v-for="chipData in navItem.counts"
                  :key="chipData.label"
                  class="mx-1"
                  :color="navItem.color"
                  size="small"
                  variant="outlined"
                >
                  {{ chipData.count }} {{ chipData.label }}
                </v-chip>
              </template>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useRoute, useRouter } from 'vue-router'
  import { useFirebaseDataStore } from '@/stores/firebaseData'


  // Get i18n function from vue-banana-i18n
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  const router = useRouter()
  const route = useRoute()

  // Welcome message state
  const showWelcomeMessage = ref(false)

  // Check for welcome query parameter on mount
  onMounted(() => {
    if (route.query.welcome === 'verified') {
      showWelcomeMessage.value = true
      // Clean up the URL
      router.replace({ path: '/', query: {} })
    }
  })

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  // Load DTO data for dashboard
  onMounted(async () => {
    try {
      // Load all DTO data in parallel
      await Promise.all([
        firebaseStore.loadStudentsDTO(),
        firebaseStore.loadParentsDTO(),
        firebaseStore.loadStaffDTO(),
        firebaseStore.loadAllData(), // Still need classes and committees
      ])
    } catch (error) {
      console.error('Error during dashboard initialization:', error)
    }
  })

  // Navigation items for the grid
  const navigationItems = computed(() => [
    {
      title: $i18n('nav.classes'),
      description: $i18n('dashboard.classesDescription'),
      icon: 'mdi-school',
      color: 'primary',
      route: '/classes',
      count: firebaseStore.classes.length,
      countLabel: $i18n('dashboard.classes').toLowerCase(),
    },
    {
      title: $i18n('directory.title'),
      description: $i18n('dashboard.familiesDescription'),
      icon: 'mdi-book-account',
      color: 'secondary',
      route: '/families',
      counts: [
        {
          count: firebaseStore.studentsDTO.length,
          label: $i18n('dashboard.students').toLowerCase(),
        },
        {
          count: firebaseStore.parentsDTO.length,
          label: $i18n('dashboard.parents').toLowerCase(),
        },
      ],
    },
    {
      title: $i18n('nav.staff'),
      description: $i18n('dashboard.staffDescription'),
      icon: 'mdi-account-tie',
      color: 'accent',
      route: '/staff',
      count: firebaseStore.staffDTO.length,
      countLabel: $i18n('dashboard.staffMembers').toLowerCase(),
    },
    {
      title: $i18n('nav.committees'),
      description: $i18n('dashboard.committeesDescription'),
      icon: 'mdi-account-group',
      color: 'warning',
      route: '/committees',
      count: firebaseStore.committees.length,
      countLabel: $i18n('dashboard.committees').toLowerCase(),
    },
  ])

  // Navigation functions
  function navigateTo (route) {
    router.push(route)
  }

</script>

<style scoped>
.navigation-card {
  min-height: 280px;
  flex: 1;
}

.navigation-card:hover {
  transform: translateY(-4px);
  transition: transform 0.3s ease;
}
</style>

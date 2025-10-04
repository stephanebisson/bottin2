<template>
  <v-container>
    <!-- Welcome verification success message -->
    <v-alert
      v-if="showWelcomeMessage"
      class="mb-6"
      closable
      icon="mdi-check-circle"
      :text="$t('auth.welcomeEmailVerified')"
      type="success"
      @click:close="showWelcomeMessage = false"
    />

    <!-- Header Section -->
    <div class="text-center mb-8">
      <h1 class="text-h3 font-weight-bold mb-2">{{ $t('nav.schoolDirectory') }}</h1>
      <p class="text-h6 text-grey-darken-1">{{ $t('dashboard.welcome') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="firebaseStore.loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('dashboard.loadingData') }}</p>
    </div>

    <!-- Error State -->
    <div v-if="firebaseStore.error" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.error"
        :title="$t('dashboard.errorLoadingData')"
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
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const router = useRouter()
  const route = useRoute()
  const { t } = useI18n()

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
      title: t('nav.classes'),
      description: t('dashboard.classesDescription'),
      icon: 'mdi-school',
      color: 'primary',
      route: '/classes',
      count: firebaseStore.classes.length,
      countLabel: t('dashboard.classes').toLowerCase(),
    },
    {
      title: t('nav.directory'),
      description: t('dashboard.familiesDescription'),
      icon: 'mdi-book-account',
      color: 'secondary',
      route: '/families',
      counts: [
        {
          count: firebaseStore.studentsDTO.length,
          label: t('dashboard.students').toLowerCase(),
        },
        {
          count: firebaseStore.parentsDTO.length,
          label: t('dashboard.parents').toLowerCase(),
        },
      ],
    },
    {
      title: t('nav.staff'),
      description: t('dashboard.staffDescription'),
      icon: 'mdi-account-tie',
      color: 'accent',
      route: '/staff',
      count: firebaseStore.staffDTO.length,
      countLabel: t('dashboard.staffMembers').toLowerCase(),
    },
    {
      title: t('nav.committees'),
      description: t('dashboard.committeesDescription'),
      icon: 'mdi-account-group',
      color: 'warning',
      route: '/committees',
      count: firebaseStore.committees.length,
      countLabel: t('dashboard.committees').toLowerCase(),
    },
  ])

  // Navigation functions
  const navigateTo = route => {
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

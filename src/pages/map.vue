<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('map.title') }}</h1>
      <v-chip
        :color="loading ? 'orange' : 'green'"
        :prepend-icon="loading ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
      >
        {{ loadingStatus }}
      </v-chip>
    </div>

    <!-- Error Messages -->
    <div v-if="firebaseStore.parentsErrorDTO" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.parentsErrorDTO"
        :title="$t('map.errorLoadingData')"
        type="error"
        @click:close="firebaseStore.parentsErrorDTO = null"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('map.loadingData') }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="firebaseStore.parentsDTO.length === 0" class="text-center py-8">
      <v-icon color="grey-darken-2" size="64">mdi-map-marker-off</v-icon>
      <p class="text-h6 mt-4 text-grey-darken-2">{{ $t('map.noDataFound') }}</p>
    </div>

    <div v-else>
      <!-- Map Component -->
      <FamilyMapView
        :families="firebaseStore.parentsDTO"
        :loading="loading"
        :students="firebaseStore.studentsDTO"
      />

      <!-- Info Card -->
      <v-card class="mt-6">
        <v-card-title>{{ $t('map.aboutTitle') }}</v-card-title>
        <v-card-text>
          <p class="mb-2">{{ $t('map.aboutDescription') }}</p>
          <v-alert
            v-if="familiesWithoutGeolocation > 0"
            class="mt-4"
            density="compact"
            type="info"
          >
            {{ $t('map.familiesNeedGeocoding', { count: familiesWithoutGeolocation }) }}
          </v-alert>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted } from 'vue'
  import FamilyMapView from '@/components/FamilyMapView.vue'
  import { useI18n } from '@/composables/useI18n'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const { t } = useI18n()

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  // Loading state
  const loading = computed(() => firebaseStore.parentsLoadingDTO)

  // Loading status computed
  const loadingStatus = computed(() => {
    if (loading.value) {
      return t('common.loading')
    }
    const parentsCount = firebaseStore.parentsDTO.length
    return t('map.dataLoaded', { parents: parentsCount })
  })

  // Count families without geolocation
  const familiesWithoutGeolocation = computed(() => {
    return firebaseStore.parentsDTO.filter(parent =>
      !parent.latitude || !parent.longitude,
    ).length
  })

  onMounted(async () => {
    // Load parents and students data
    await Promise.all([
      firebaseStore.loadParentsDTO(),
      firebaseStore.loadStudentsDTO(),
    ])
  })
</script>

<style scoped>
/* Add any page-specific styles here */
</style>

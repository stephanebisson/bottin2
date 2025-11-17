<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $i18n('map.title') }}</h1>
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
        :title="$i18n('map.errorLoadingData')"
        type="error"
        @click:close="firebaseStore.parentsErrorDTO = null"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $i18n('map.loadingData') }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="firebaseStore.parentsDTO.length === 0" class="text-center py-8">
      <v-icon color="grey-darken-2" size="64">mdi-map-marker-off</v-icon>
      <p class="text-h6 mt-4 text-grey-darken-2">{{ $i18n('map.noDataFound') }}</p>
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
        <v-card-title>{{ $i18n('map.aboutTitle') }}</v-card-title>
        <v-card-text>
          <p class="mb-2">{{ $i18n('map.aboutDescription') }}</p>
          <v-alert
            v-if="familiesWithIncompleteAddress > 0"
            class="mt-4"
            density="compact"
            type="warning"
          >
            {{ $i18n('map.familiesIncompleteAddress', familiesWithIncompleteAddress) }}
          </v-alert>
          <v-alert
            v-if="familiesWithoutGeolocation > 0"
            class="mt-4"
            density="compact"
            type="info"
          >
            {{ $i18n('map.familiesNeedGeocoding', familiesWithoutGeolocation) }}
          </v-alert>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import FamilyMapView from '@/components/FamilyMapView.vue'
  import { useFirebaseDataStore } from '@/stores/firebaseData'


  // Get i18n function from vue-banana-i18n
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  // Loading state
  const loading = computed(() => firebaseStore.parentsLoadingDTO)

  // Loading status computed
  const loadingStatus = computed(() => {
    if (loading.value) {
      return $i18n('common.loading')
    }
    const parentsCount = firebaseStore.parentsDTO.length
    return $i18n('map.dataLoaded', parentsCount)
  })

  // Count families with complete addresses that need geocoding
  const familiesWithoutGeolocation = computed(() => {
    return firebaseStore.parentsDTO.filter(parent =>
      parent.address && parent.postal_code && (!parent.latitude || !parent.longitude),
    ).length
  })

  // Count families with incomplete addresses
  const familiesWithIncompleteAddress = computed(() => {
    return firebaseStore.parentsDTO.filter(parent =>
      !parent.address || !parent.postal_code,
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

<template>
  <div class="family-map-container">
    <div id="map" class="map" />

    <!-- Loading overlay -->
    <v-overlay
      class="align-center justify-center"
      contained
      :model-value="loading"
    >
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      />
      <div class="mt-4 text-center">
        {{ $t('map.loading') }}
      </div>
    </v-overlay>

    <!-- Info card when no families have geolocation -->
    <v-alert
      v-if="!loading && geocodedFamiliesCount === 0"
      class="ma-4"
      type="info"
    >
      {{ $t('map.noGeocodedFamilies') }}
    </v-alert>

    <!-- Stats card -->
    <v-card
      v-if="!loading && geocodedFamiliesCount > 0"
      class="map-stats"
      elevation="2"
    >
      <v-card-text>
        <div class="text-caption">
          <strong>{{ geocodedFamiliesCount }}</strong> / {{ totalFamiliesCount }}
          {{ $t('map.familiesOnMap') }}
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
  import L from 'leaflet'
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { CLUSTER_SETTINGS, getSchoolLocation, MAP_DEFAULT_ZOOM } from '@/config/school'
  import 'leaflet/dist/leaflet.css'
  import 'leaflet.markercluster/dist/MarkerCluster.css'
  import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
  import 'leaflet.markercluster'

  const { t } = useI18n()

  const props = defineProps({
    families: {
      type: Array,
      default: () => [],
    },
    students: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
  })

  const map = ref(null)
  const markerClusterGroup = ref(null)
  const schoolMarker = ref(null)
  const geocodedFamiliesCount = ref(0)
  const totalFamiliesCount = ref(0)

  // School location
  const schoolLocation = getSchoolLocation()

  // Custom icon for school
  const schoolIcon = L.divIcon({
    html: '<div style="background-color: #1976d2; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    className: 'school-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  // Custom icon for families
  const familyIcon = L.divIcon({
    html: '<div style="background-color: #4CAF50; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>',
    className: 'family-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })

  const initializeMap = () => {
    // Create map centered on school
    map.value = L.map('map').setView(
      [schoolLocation.latitude, schoolLocation.longitude],
      MAP_DEFAULT_ZOOM,
    )

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.value)

    // Add school marker
    schoolMarker.value = L.marker(
      [schoolLocation.latitude, schoolLocation.longitude],
      { icon: schoolIcon },
    )
      .addTo(map.value)
      .bindPopup(`
        <div style="text-align: center;">
          <strong>${schoolLocation.name}</strong><br>
          ${schoolLocation.address}<br>
          ${schoolLocation.city}, ${schoolLocation.province} ${schoolLocation.postal_code}
        </div>
      `)

    // Initialize marker cluster group
    markerClusterGroup.value = L.markerClusterGroup({
      maxClusterRadius: CLUSTER_SETTINGS.maxClusterRadius,
      disableClusteringAtZoom: CLUSTER_SETTINGS.disableClusteringAtZoom,
      showCoverageOnHover: CLUSTER_SETTINGS.showCoverageOnHover,
      animate: CLUSTER_SETTINGS.animate,
      iconCreateFunction: cluster => {
        const count = cluster.getChildCount()
        let size = 'small'
        if (count > 10) size = 'medium'
        if (count > 20) size = 'large'

        return L.divIcon({
          html: `<div style="
            background-color: #4CAF50;
            color: white;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: ${size === 'small' ? '12px' : (size === 'medium' ? '14px' : '16px')};
            width: ${size === 'small' ? '32px' : (size === 'medium' ? '40px' : '48px')};
            height: ${size === 'small' ? '32px' : (size === 'medium' ? '40px' : '48px')};
          ">${count}</div>`,
          className: 'marker-cluster',
          iconSize: L.point(
            size === 'small' ? 32 : (size === 'medium' ? 40 : 48),
            size === 'small' ? 32 : (size === 'medium' ? 40 : 48),
          ),
        })
      },
    })

    map.value.addLayer(markerClusterGroup.value)

    // Add family markers
    updateMarkers()
  }

  const getStudentsForParent = parentId => {
    return props.students.filter(student =>
      student.parent1_id === parentId || student.parent2_id === parentId,
    )
  }

  const updateMarkers = () => {
    if (!markerClusterGroup.value || !map.value) return

    // Clear existing markers
    markerClusterGroup.value.clearLayers()

    // Count families
    totalFamiliesCount.value = props.families.length

    // Group families by coordinates (same address)
    const locationGroups = new Map()

    for (const family of props.families) {
      if (family.latitude && family.longitude) {
        // Create a key from coordinates (rounded to avoid floating point issues)
        const key = `${family.latitude.toFixed(6)},${family.longitude.toFixed(6)}`

        if (!locationGroups.has(key)) {
          locationGroups.set(key, {
            latitude: family.latitude,
            longitude: family.longitude,
            address: family.address,
            city: family.city,
            postal_code: family.postal_code,
            families: [],
          })
        }

        locationGroups.get(key).families.push(family)
      }
    }

    geocodedFamiliesCount.value = props.families.filter(f => f.latitude && f.longitude).length

    // Create markers for each location
    for (const location of locationGroups.values()) {
      // Get all students at this location
      const allStudents = new Set()
      for (const family of location.families) {
        const students = getStudentsForParent(family.id)
        for (const student of students) {
          allStudents.add(student)
        }
      }

      // Create popup content with all families at this location
      let popupContent = '<div style="min-width: 250px;">'

      // Add address header
      if (location.address || location.city) {
        popupContent += '<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">'
        if (location.address) popupContent += `${location.address}<br>`
        if (location.city) popupContent += `${location.city}, ${location.postal_code || ''}`
        popupContent += '</div>'
      }

      // Add students section if any
      if (allStudents.size > 0) {
        popupContent += '<div style="margin-bottom: 12px; padding: 8px; background-color: #f5f5f5; border-radius: 4px;">'
        popupContent += '<div style="font-weight: bold; margin-bottom: 4px; color: #1976d2;">Students:</div>'
        const sortedStudents = Array.from(allStudents).sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
        )
        for (const student of sortedStudents) {
          popupContent += `<div style="margin-left: 8px;">• ${student.first_name} ${student.last_name}`
          if (student.className) popupContent += ` (${student.className})`
          popupContent += '</div>'
        }
        popupContent += '</div>'
      }

      // Add each parent
      popupContent += '<div style="font-weight: bold; margin-bottom: 4px;">Parents:</div>'
      for (const family of location.families) {
        popupContent += '<div style="margin-top: 6px; margin-left: 8px;">'
        popupContent += `<strong>${family.fullName || `${family.first_name} ${family.last_name}`}</strong><br>`
        if (family.email) popupContent += `<a href="mailto:${family.email}">${family.email}</a><br>`
        if (family.phone) popupContent += `<a href="tel:${family.phone}">${formatPhone(family.phone)}</a><br>`
        popupContent += '</div>'
      }

      popupContent += '</div>'

      // Create marker and add to cluster group first, then bind popup
      const marker = L.marker(
        [location.latitude, location.longitude],
        { icon: familyIcon },
      )

      markerClusterGroup.value.addLayer(marker)
      marker.bindPopup(popupContent)
    }
  }

  const formatPhone = phone => {
    if (!phone) return ''
    const cleaned = phone.toString().replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  // Watch for changes in families or students data
  watch(
    () => [props.families, props.students],
    () => {
      if (map.value) {
        updateMarkers()
      }
    },
    { deep: true },
  )

  onMounted(() => {
    // Use nextTick to ensure DOM is ready
    setTimeout(() => {
      initializeMap()
      // Invalidate map size after initialization
      if (map.value) {
        setTimeout(() => {
          map.value.invalidateSize()
        }, 200)
      }
    }, 100)
  })

  onBeforeUnmount(() => {
    // Clean up map
    if (map.value) {
      map.value.remove()
      map.value = null
    }
  })
</script>

<style scoped>
.family-map-container {
  position: relative;
  width: 100%;
  height: 600px;
}

.map {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.map-stats {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: white;
  padding: 8px;
}
</style>

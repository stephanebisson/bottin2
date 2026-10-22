<template>
  <div v-if="cloud.length > 0" class="mb-6">
    <div class="d-flex align-center text-title-small text-medium-emphasis mb-2">
      <v-icon class="me-1" :color="ENTITY_STYLES.interests.color" size="small">{{ ENTITY_STYLES.interests.icon }}</v-icon>
      {{ $i18n('dashboard.interestCloud') }}
      <v-spacer />

      <v-btn
        append-icon="mdi-chevron-right"
        size="small"
        to="/interests"
        variant="text"
      >
        {{ $i18n('nav.interests') }}
      </v-btn>
    </div>

    <v-card>
      <!-- The more parents share an interest, the bigger its chip; the signed-in parent's own are filled in -->
      <div class="interest-cloud">
        <v-chip
          v-for="interest in cloud"
          :key="interest.id"
          :color="interest.isMine ? ENTITY_STYLES.interests.color : undefined"
          :size="interest.size"
          :to="{ path: '/interests', query: { i: interest.id } }"
          :variant="interest.isMine ? 'flat' : 'tonal'"
        >
          {{ interest.label }}
          <span class="count">{{ interest.count }}</span>
        </v-chip>
      </div>

      <div class="text-body-small text-medium-emphasis px-4 pb-3">
        {{ $i18n('dashboard.interestCloudHint') }}
      </div>
    </v-card>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { ENTITY_STYLES } from '@/config/entities'
  import { isKnownInterest } from '@/config/interests'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const $i18n = useTranslate()
  const firebaseStore = useFirebaseDataStore()

  // Chip sizes from the least to the most shared interest
  const SIZES = ['x-small', 'small', 'default', 'large']

  const cloud = computed(() => {
    const counts = new Map()
    for (const parent of firebaseStore.parentsDTO) {
      if (parent.optedOut) continue
      for (const id of new Set(parent.interests)) {
        if (isKnownInterest(id)) counts.set(id, (counts.get(id) || 0) + 1)
      }
    }
    const max = Math.max(...counts.values())
    const mine = new Set(firebaseStore.currentParent?.interests)
    return [...counts]
      .map(([id, count]) => ({
        id,
        count,
        label: $i18n(`interestOptions.${id}`),
        size: SIZES[Math.min(SIZES.length - 1, Math.floor(count / max * SIZES.length))],
        isMine: mine.has(id),
      }))
      .toSorted((a, b) => a.label.localeCompare(b.label))
  })
</script>

<style scoped>
.interest-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
}

.count {
  margin-inline-start: 6px;
  opacity: 0.6;
  font-size: 0.85em;
}
</style>

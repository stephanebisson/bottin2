<template>
  <v-card v-if="parent" class="mb-6">
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2" color="primary">mdi-home-heart</v-icon>
      {{ $i18n('dashboard.myFamily') }}
      <v-spacer />

      <v-btn
        append-icon="mdi-chevron-right"
        size="small"
        to="/profile"
        variant="text"
      >
        {{ $i18n('dashboard.viewProfile') }}
      </v-btn>
    </v-card-title>

    <v-list v-if="children.length > 0" density="comfortable">
      <v-list-item v-for="child in children" :key="child.id">
        <template #prepend>
          <v-avatar color="secondary" size="40">
            <span class="font-weight-bold">{{ child.first_name.charAt(0) }}{{ child.last_name.charAt(0) }}</span>
          </v-avatar>
        </template>

        <v-list-item-title class="font-weight-bold">
          {{ child.fullName }}
        </v-list-item-title>

        <v-list-item-subtitle>
          <StudentClassInfo :student="child" />
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>

    <v-card-text v-else class="text-medium-emphasis">
      {{ $i18n('profile.noChildrenFound') }}
    </v-card-text>

    <v-card-text v-if="otherParents.length > 0 || committees.length > 0" class="pt-0">
      <div v-if="otherParents.length > 0" class="text-body-medium mb-2">
        <v-icon class="me-1" size="small">mdi-account-multiple</v-icon>
        {{ $i18n('dashboard.withParent', otherParents.map(p => p.fullName).join(', ')) }}
      </div>

      <div v-if="committees.length > 0" class="d-flex flex-wrap align-center ga-2">
        <v-icon size="small">mdi-account-group</v-icon>

        <v-chip
          v-for="committee in committees"
          :key="committee.id"
          size="small"
          to="/committees"
          variant="tonal"
        >
          {{ committee.name }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const $i18n = useTranslate()
  const firebaseStore = useFirebaseDataStore()

  // The signed-in user's parent record; staff-only users have none and see no card
  const parent = computed(() => firebaseStore.currentParent)

  const children = computed(() => {
    if (!parent.value) return []
    const id = parent.value.id
    return firebaseStore.studentsDTO
      .filter(s => s.parent1_id === id || s.parent2_id === id)
      .toSorted((a, b) => (a.level ?? 0) - (b.level ?? 0))
  })

  // The children's other parent(s); more than one in blended families
  const otherParents = computed(() => {
    const ids = new Set(children.value.flatMap(c => [c.parent1_id, c.parent2_id]))
    ids.delete(parent.value?.id)
    return firebaseStore.parentsDTO.filter(p => ids.has(p.id))
  })

  const committees = computed(() => {
    if (!parent.value) return []
    return firebaseStore.committeesDTO
      .filter(c => c.hasMember(parent.value.id))
      .toSorted((a, b) => a.name.localeCompare(b.name))
  })
</script>

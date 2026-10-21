<template>
  <v-row class="mb-2">
    <v-col v-for="card in cards" :key="card.key" cols="12" md="6">
      <v-card class="h-100">
        <v-card-title class="d-flex align-center text-wrap">
          <v-icon class="me-2" :color="card.color">{{ card.icon }}</v-icon>
          {{ card.name }}
        </v-card-title>

        <v-card-subtitle class="d-flex flex-wrap align-center ga-4">
          <a
            :aria-label="$i18n('dashboard.callContact', card.name)"
            class="text-decoration-none text-no-wrap"
            :href="`tel:${card.phone}`"
          >
            <v-icon size="small">mdi-phone</v-icon>
            {{ formatPhoneForDisplay(card.phone) }}
          </a>

          <a
            v-if="card.email"
            :aria-label="$i18n('dashboard.emailContact', card.name)"
            class="text-decoration-none"
            :href="`mailto:${card.email}`"
          >
            <v-icon size="small">mdi-email</v-icon>
            {{ card.email }}
          </a>
        </v-card-subtitle>

        <v-list v-if="card.people.length > 0" density="comfortable" :lines="false">
          <v-list-item v-for="person in card.people" :key="person.id">
            <v-list-item-title class="font-weight-bold text-wrap">
              {{ person.fullName }}
            </v-list-item-title>

            <v-list-item-subtitle>{{ person.title }}</v-list-item-subtitle>

            <template #append>
              <v-btn
                v-if="person.email"
                :aria-label="$i18n('dashboard.emailContact', person.fullName)"
                :href="`mailto:${person.email}`"
                icon="mdi-email"
                size="small"
                variant="text"
              />

              <v-btn
                v-if="person.phone"
                :aria-label="$i18n('dashboard.callContact', person.fullName)"
                :href="`tel:${person.phone}`"
                icon="mdi-phone"
                size="small"
                variant="text"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
  import { computed } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { ENTITY_STYLES } from '@/config/entities'
  import { SCHOOL_LOCATION } from '@/config/school'
  import { SDG_INFO } from '@/config/sdg'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'

  const $i18n = useTranslate()
  const firebaseStore = useFirebaseDataStore()

  // Key people are picked by title, so they follow the staff list as it changes
  function staffWithTitle (group, pattern) {
    return firebaseStore.staffDTO.filter(s => s.group === group && pattern.test(s.title))
  }

  const cards = computed(() => [
    {
      key: 'school',
      ...ENTITY_STYLES.school,
      name: `École ${SCHOOL_LOCATION.name}`,
      phone: SCHOOL_LOCATION.phone,
      email: SCHOOL_LOCATION.email,
      people: [
        ...staffWithTitle('EF', /^direct/i),
        ...staffWithTitle('EF', /secr/i),
      ],
    },
    {
      key: 'sdg',
      ...ENTITY_STYLES.sdg,
      name: SDG_INFO.name,
      phone: SDG_INFO.mainPhone,
      email: SDG_INFO.email,
      people: staffWithTitle('SDG', /coordo|coordi/i),
    },
  ])
</script>

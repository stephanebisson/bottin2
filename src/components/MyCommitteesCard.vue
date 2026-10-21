<template>
  <div v-if="committees.length > 0" class="mb-6">
    <div class="d-flex align-center text-title-small text-medium-emphasis mb-2">
      <v-icon class="me-1" :color="ENTITY_STYLES.committee.color" size="small">{{ ENTITY_STYLES.committee.icon }}</v-icon>
      {{ $i18n('dashboard.myCommittees') }}
      <v-spacer />

      <v-btn
        append-icon="mdi-chevron-right"
        size="small"
        to="/committees"
        variant="text"
      >
        {{ $i18n('nav.committees') }}
      </v-btn>
    </div>

    <!-- One small card per committee, all the same size, as many per row as fit: there is little to say about each -->
    <div class="committee-grid">
      <v-card
        v-for="{ committee, role, chairs, membersMailto } in committees"
        :key="committee.id"
      >
        <router-link class="committee-header bg-primary" :to="`/committees#committee-${committee.id}`">{{ committee.name }}</router-link>

        <!-- Everything else on one line, wrapping as needed -->
        <div class="committee-body d-flex flex-wrap align-center">
          <v-chip
            v-if="role"
            :color="CHAIR_ROLES.includes(role) ? 'primary' : undefined"
            size="x-small"
            variant="tonal"
          >
            {{ role }}
          </v-chip>

          <span class="text-medium-emphasis text-no-wrap">
            {{ $i18n('committees.memberCount', committee.members.length) }}
          </span>

          <!-- The committee's own channels -->
          <span v-if="committee.email || committee.phone || committee.url" class="contact channels">
            <v-btn
              v-if="committee.email"
              :aria-label="$i18n('dashboard.emailContact', committee.name)"
              density="compact"
              :href="`mailto:${committee.email}`"
              icon="mdi-email"
              size="small"
              variant="text"
            />

            <v-btn
              v-if="committee.phone"
              :aria-label="$i18n('dashboard.callContact', committee.name)"
              density="compact"
              :href="`tel:${committee.phone}`"
              icon="mdi-phone"
              size="small"
              variant="text"
            />

            <v-btn
              v-if="committee.url"
              :aria-label="$i18n('dashboard.visitWebsite', committee.name)"
              density="compact"
              :href="ensureHttps(committee.url)"
              icon="mdi-web"
              rel="noopener noreferrer"
              size="small"
              target="_blank"
              variant="text"
            />
          </span>

          <span v-for="{ person: chair, isMe } in chairs" :key="chair.id" class="contact">
            <v-icon class="me-1" color="primary" size="small" :title="$i18n('dashboard.committeeChairs')">mdi-account-star</v-icon>
            {{ chair.fullName }}
            <!-- Never offer to email or call yourself -->
            <v-btn
              v-if="chair.email && !isMe"
              :aria-label="$i18n('dashboard.emailContact', chair.fullName)"
              class="contact-button"
              density="compact"
              :href="`mailto:${chair.email}`"
              icon="mdi-email"
              size="small"
              variant="text"
            />

            <v-btn
              v-if="chair.phone && !isMe"
              :aria-label="$i18n('dashboard.callContact', chair.fullName)"
              class="contact-button"
              density="compact"
              :href="`tel:${chair.phone}`"
              icon="mdi-phone"
              size="small"
              variant="text"
            />
          </span>

          <!-- A chair writes to the whole committee instead -->
          <v-btn
            v-if="membersMailto"
            density="compact"
            :href="membersMailto"
            prepend-icon="mdi-email-multiple"
            size="small"
            variant="text"
          >
            {{ $i18n('dashboard.emailCommitteeMembers') }}
          </v-btn>
        </div>
      </v-card>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { CHAIR_ROLES } from '@/config/committees'
  import { ENTITY_STYLES } from '@/config/entities'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { ensureHttps } from '@/utils/url'

  const $i18n = useTranslate()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // The signed-in user sits on committees as a parent, as staff, or both
  const myIds = computed(() => {
    const email = authStore.userEmail.toLowerCase()
    const staff = email ? firebaseStore.staffDTO.find(s => s.email?.toLowerCase() === email) : null
    return new Set([firebaseStore.currentParent?.id, staff?.id].filter(Boolean))
  })

  // A committee member's parent or staff record; students have no contact info to offer
  function memberPerson (member) {
    if (member.member_type === 'parent') return firebaseStore.parentsDTO.find(p => p.id === member.memberId)
    if (member.member_type === 'staff') return firebaseStore.staffDTO.find(s => s.id === member.memberId)
    return null
  }

  const committees = computed(() => firebaseStore.committeesDTO
    .filter(committee => committee.members.some(m => myIds.value.has(m.memberId)))
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map(committee => {
      const role = committee.members.find(m => myIds.value.has(m.memberId)).role
      const chairs = committee.members
        .filter(m => CHAIR_ROLES.includes(m.role))
        .map(m => {
          const person = memberPerson(m)
          return person && { person, isMe: myIds.value.has(m.memberId) }
        })
        .filter(Boolean)
      return {
        committee,
        role,
        chairs,
        membersMailto: CHAIR_ROLES.includes(role) ? mailtoMembers(committee) : null,
      }
    }),
  )

  // Every other member in Bcc, so members' addresses stay private from each other
  function mailtoMembers (committee) {
    const emails = committee.members
      .filter(m => !myIds.value.has(m.memberId))
      .map(m => memberPerson(m)?.email)
      .filter(Boolean)
    return emails.length > 0 ? `mailto:?bcc=${[...new Set(emails)].join(',')}` : null
  }
</script>

<style scoped>
.committee-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  grid-auto-rows: 1fr;
  gap: 12px;
}

/* The name heads the card in the same blue band as a class card, and opens the committees page at this committee */
.committee-header {
  display: block;
  padding: 8px 16px;
  font-weight: 600;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.committee-header:hover {
  text-decoration: underline;
}

.committee-body {
  gap: 4px 16px;
  padding: 6px 12px 6px 16px;
  font-size: 0.8125rem;
}

/* Shortcuts get room around them so each is easy to tap */
.contact-button {
  margin-inline-start: 14px;
}

/* The committee's shortcuts are spaced like a person's */
.channels .v-btn + .v-btn {
  margin-inline-start: 14px;
}

/* A name and its shortcuts stay together when the line wraps */
.contact {
  white-space: nowrap;
}
</style>

<template>
  <div v-if="parent" class="mb-6">
    <div class="d-flex align-center text-title-small text-medium-emphasis mb-2">
      <v-icon class="me-1" :color="ENTITY_STYLES.family.color" size="small">{{ ENTITY_STYLES.family.icon }}</v-icon>
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
    </div>

    <!-- Each child as the classes page shows their class, with them as its only student -->
    <v-row v-if="children.length > 0">
      <v-col
        v-for="{ child, classItem, reps, classParentsMailto } in children"
        :key="child.id"
        cols="12"
        sm="6"
      >
        <v-card class="d-flex flex-column h-100">
          <ClassCardHeader :class-item="classItem" :placeholder="$i18n('dashboard.classPending')">
            <template #top>
              <div class="child-name">
                {{ child.fullName }}
                <span v-if="child.level" class="child-level">{{ formatGradeLevel(child.level, bananaI18n.locale) }}</span>
              </div>
            </template>

            <template #teacher="{ teacher }">
              {{ teacher.fullName }}
              <v-btn
                v-if="teacher.email"
                :aria-label="$i18n('dashboard.emailContact', teacher.fullName)"
                class="contact-button"
                density="compact"
                :href="`mailto:${teacher.email}`"
                icon="mdi-email"
                size="small"
                variant="text"
              />

              <v-btn
                v-if="teacher.phone"
                :aria-label="$i18n('dashboard.callContact', teacher.fullName)"
                class="contact-button"
                density="compact"
                :href="`tel:${teacher.phone}`"
                icon="mdi-phone"
                size="small"
                variant="text"
              />
            </template>
          </ClassCardHeader>

          <div v-if="reps.length > 0" class="class-reps d-flex align-center ga-2">
            <v-icon color="secondary" size="small" :title="$i18n('classes.parentRepresentatives')">mdi-account-voice</v-icon>

            <div class="class-reps-names">
              <span v-for="rep in reps" :key="rep.id" class="contact">
                {{ rep.fullName }}
                <!-- Never offer to email or call yourself: your own rep entry writes to the whole class instead -->
                <v-btn
                  v-if="rep.email && rep.id !== parent.id"
                  :aria-label="$i18n('dashboard.emailContact', rep.fullName)"
                  class="contact-button"
                  density="compact"
                  :href="`mailto:${rep.email}`"
                  icon="mdi-email"
                  size="small"
                  variant="text"
                />

                <v-btn
                  v-if="rep.id === parent.id && classParentsMailto"
                  :aria-label="$i18n('dashboard.emailClassParents')"
                  class="contact-button"
                  density="compact"
                  :href="classParentsMailto"
                  icon="mdi-email-multiple"
                  size="small"
                  :title="$i18n('dashboard.emailClassParents')"
                  variant="text"
                />

                <v-btn
                  v-if="rep.phone && rep.id !== parent.id"
                  :aria-label="$i18n('dashboard.callContact', rep.fullName)"
                  class="contact-button"
                  density="compact"
                  :href="`tel:${rep.phone}`"
                  icon="mdi-phone"
                  size="small"
                  variant="text"
                />
              </span>
            </div>
          </div>

          <v-spacer />

          <v-card-actions v-if="classItem">
            <v-spacer />

            <v-btn
              append-icon="mdi-chevron-right"
              size="small"
              :to="`/classes#class-${classItem.classLetter}`"
              variant="text"
            >
              {{ $i18n('dashboard.viewClass') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else>
      <v-card-text class="text-medium-emphasis">
        {{ $i18n('profile.noChildrenFound') }}
      </v-card-text>
    </v-card>

    <div v-if="otherParents.length > 0" class="text-body-medium text-medium-emphasis mt-3">
      <v-icon class="me-1" size="small">mdi-account-multiple</v-icon>
      {{ $i18n('dashboard.withParent', otherParents.map(p => p.fullName).join(', ')) }}
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useTranslate } from '@/composables/useTranslate'
  import { ENTITY_STYLES } from '@/config/entities'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { formatGradeLevel } from '@/utils/gradeFormatter'

  const $i18n = useTranslate()
  const bananaI18n = useI18n()
  const firebaseStore = useFirebaseDataStore()

  // The signed-in user's parent record; staff-only users have none and see no card
  const parent = computed(() => firebaseStore.currentParent)

  // Each child with their class and the people to reach about it
  const children = computed(() => {
    if (!parent.value) return []
    const id = parent.value.id
    return firebaseStore.studentsDTO
      .filter(s => s.parent1_id === id || s.parent2_id === id)
      .toSorted((a, b) => (a.level ?? 0) - (b.level ?? 0))
      .map(child => {
        const classItem = child.className ? firebaseStore.classes.find(c => c.classLetter === child.className) : null
        const isRep = !!classItem && [classItem.parent_rep_1, classItem.parent_rep_2].includes(id)
        return {
          child,
          classItem,
          reps: classItem
            ? [classItem.parent_rep_1, classItem.parent_rep_2]
              .filter(Boolean)
              .map(repId => firebaseStore.parentsDTO.find(p => p.id === repId))
              .filter(Boolean)
            : [],
          classParentsMailto: isRep ? mailtoClassParents(classItem) : null,
        }
      })
  })

  // Every parent of the class in Bcc, so parents' addresses stay private from each other
  function mailtoClassParents (classItem) {
    const parentIds = new Set(firebaseStore.studentsDTO
      .filter(s => s.className === classItem.classLetter)
      .flatMap(s => [s.parent1_id, s.parent2_id]))
    const emails = firebaseStore.parentsDTO
      .filter(p => parentIds.has(p.id) && p.email)
      .map(p => p.email)
    return emails.length > 0 ? `mailto:?bcc=${emails.join(',')}` : null
  }

  // The children's other parent(s) living at the same address; more than one in blended families
  const otherParents = computed(() => {
    const ids = new Set(children.value.flatMap(({ child }) => [child.parent1_id, child.parent2_id]))
    ids.delete(parent.value?.id)
    return firebaseStore.parentsDTO.filter(p => ids.has(p.id) && parent.value.sharesAddressWith(p))
  })
</script>

<style scoped>
/* Same reps row as a class card on the classes page */
.class-reps {
  padding: 6px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.8125rem;
}

.class-reps-names {
  display: flex;
  flex-wrap: wrap;
  gap: 0 16px;
}

/* Shortcuts get room around them so each is easy to tap */
.contact-button {
  margin-inline-start: 14px;
}

/* A name and its shortcuts stay together when the line wraps */
.contact {
  white-space: nowrap;
}

/* The child leads the card, above their class */
.child-name {
  margin-bottom: 2px;
  font-size: 1rem;
  font-weight: 600;
}

.child-level {
  margin-left: 6px;
  font-size: 0.8125rem;
  font-weight: 400;
  opacity: 0.8;
}
</style>

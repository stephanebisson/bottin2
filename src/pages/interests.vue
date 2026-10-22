<template>
  <v-container>
    <div v-if="firebaseStore.parentsErrorDTO" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.parentsErrorDTO"
        :title="$i18n('directory.errorLoadingData')"
        type="error"
        @click:close="firebaseStore.parentsErrorDTO = null"
      />
    </div>

    <div v-if="firebaseStore.studentsLoadingDTO || firebaseStore.parentsLoadingDTO" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-title-large mt-4">{{ $i18n('directory.loadingData') }}</p>
    </div>

    <div v-else>
      <!-- Filters -->
      <v-card class="mb-6">
        <v-card-text>
          <!-- One chip group for all the themes: a group per theme would each drop the others' selection -->
          <v-chip-group
            v-model="selected"
            :color="ENTITY_STYLES.interests.color"
            column
            filter
            multiple
          >
            <div v-for="group in interestGroups" :key="group.id" class="w-100 mb-2">
              <div class="text-title-small text-medium-emphasis">{{ group.label }}</div>

              <div class="d-flex flex-wrap">
                <v-chip
                  v-for="interest in group.interests"
                  :key="interest.id"
                  :disabled="!counts.get(interest.id)"
                  size="small"
                  :value="interest.id"
                >
                  {{ interest.label }}
                  <span class="count">{{ counts.get(interest.id) || 0 }}</span>
                </v-chip>
              </div>
            </div>
          </v-chip-group>

          <div class="d-flex align-center flex-wrap ga-4 mt-2">
            <!-- Parents with any of the interests, or only those with all of them -->
            <v-btn-toggle
              v-model="matchAll"
              color="primary"
              density="comfortable"
              mandatory
              variant="outlined"
            >
              <v-btn :value="false">{{ $i18n('interests.matchAny') }}</v-btn>
              <v-btn :value="true">{{ $i18n('interests.matchAll') }}</v-btn>
            </v-btn-toggle>

            <v-select
              v-model="selectedClass"
              clearable
              density="comfortable"
              hide-details
              :items="classOptions"
              :label="$i18n('directory.filterByClass')"
              :placeholder="$i18n('directory.allClasses')"
              prepend-inner-icon="mdi-school"
              style="max-width: 280px;"
              variant="outlined"
            />

            <v-btn
              v-if="selected.length > 0"
              prepend-icon="mdi-close"
              variant="text"
              @click="selected = []"
            >
              {{ $i18n('common.clear') }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <div v-if="selected.length === 0" class="text-center py-8 text-medium-emphasis">
        <v-icon :color="ENTITY_STYLES.interests.color" size="64">{{ ENTITY_STYLES.interests.icon }}</v-icon>
        <p class="text-title-large mt-4">{{ $i18n('interests.pickPrompt') }}</p>
      </div>

      <template v-else>
        <!-- Everyone found, to invite to an activity -->
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <div class="text-title-small text-medium-emphasis">
            {{ $i18n('interests.parentCount', results.length) }}
          </div>

          <v-spacer />

          <v-btn
            :disabled="emails.length === 0"
            :href="`mailto:?bcc=${emails.join(',')}`"
            prepend-icon="mdi-email-multiple"
            size="small"
            variant="tonal"
          >
            {{ $i18n('interests.emailAll') }}
          </v-btn>

          <!-- For a long list, which can be too long for a mailto link, or to paste elsewhere -->
          <v-btn
            :disabled="emails.length === 0"
            :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
            size="small"
            variant="text"
            @click="copyEmails"
          >
            {{ copied ? $i18n('interests.emailsCopied', emails.length) : $i18n('interests.copyEmails') }}
          </v-btn>
        </div>

        <v-card v-if="results.length > 0">
          <v-list :lines="false">
            <v-list-item v-for="{ parent, children, matched, others } in results" :key="parent.id">
              <v-list-item-title class="font-weight-bold text-wrap">{{ parent.fullName }}</v-list-item-title>

              <!-- One line per child, with the same short class label as elsewhere (level and teacher) -->
              <v-list-item-subtitle v-for="child in children" :key="child.id" class="text-wrap">
                {{ [child.first_name, formatStudentTeacher(child, firebaseStore.classes, firebaseStore.staffDTO, bananaI18n.locale)].filter(Boolean).join(' · ') }}
              </v-list-item-subtitle>

              <!-- The interests searched for first, then the rest of the parent's -->
              <div class="d-flex flex-wrap align-center ga-1 mt-1">
                <v-chip
                  v-for="id in matched"
                  :key="id"
                  :color="ENTITY_STYLES.interests.color"
                  size="x-small"
                  variant="flat"
                >
                  {{ $i18n(`interestOptions.${id}`) }}
                </v-chip>

                <span v-if="others.length > 0" class="text-body-small text-medium-emphasis ms-1">
                  {{ getInterestNames(others, $i18n).join(', ') }}
                </span>
              </div>

              <template #append>
                <v-btn
                  v-if="parent.email"
                  :aria-label="$i18n('dashboard.emailContact', parent.fullName)"
                  :href="`mailto:${parent.email}`"
                  icon="mdi-email"
                  size="small"
                  variant="text"
                />

                <v-btn
                  v-if="parent.phone"
                  :aria-label="$i18n('dashboard.callContact', parent.fullName)"
                  :href="`tel:${parent.phone}`"
                  icon="mdi-phone"
                  size="small"
                  variant="text"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <div v-else class="text-center py-8 text-medium-emphasis">
          {{ $i18n('interests.noResults') }}
        </div>
      </template>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useRoute, useRouter } from 'vue-router'
  import { useTranslate } from '@/composables/useTranslate'
  import { ENTITY_STYLES } from '@/config/entities'
  import { getInterestNames, getSortedInterestGroups, isKnownInterest } from '@/config/interests'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { formatStudentTeacher } from '@/utils/gradeFormatter'

  definePage({ meta: { titleKey: 'interests.title' } })

  const $i18n = useTranslate()
  const bananaI18n = useI18n()
  const route = useRoute()
  const router = useRouter()
  const firebaseStore = useFirebaseDataStore()

  onMounted(async () => {
    try {
      await Promise.all([
        firebaseStore.loadStudentsDTO(),
        firebaseStore.loadParentsDTO(),
        firebaseStore.loadStaffDTO(),
        firebaseStore.loadClasses(),
      ])
    } catch (error) {
      console.error('Error loading interests page data:', error)
    }
  })

  const interestGroups = getSortedInterestGroups($i18n)

  // The selection lives in the URL (?i=cuisine,jardinage), so the home page cloud can link here and a search can be shared
  const selected = ref(String(route.query.i || '').split(',').filter(id => isKnownInterest(id)))
  const matchAll = ref(false)
  const selectedClass = ref(null)

  watch(selected, ids => {
    router.replace({ query: ids.length > 0 ? { i: ids.join(',') } : {} })
  })

  // Everyone but the signed-in parent, in the list and in the counts; opted-out parents have no data to show
  const candidates = computed(() => firebaseStore.parentsDTO
    .filter(parent => !parent.optedOut && parent.id !== firebaseStore.currentParent?.id)
    .map(parent => ({
      parent,
      interests: parent.interests.filter(id => isKnownInterest(id)),
      children: firebaseStore.studentsDTO
        .filter(s => s.parent1_id === parent.id || s.parent2_id === parent.id)
        .toSorted((a, b) => a.first_name.localeCompare(b.first_name)),
    }))
    .filter(({ interests }) => interests.length > 0),
  )

  const counts = computed(() => {
    const counts = new Map()
    for (const { interests } of candidates.value) {
      for (const id of new Set(interests)) counts.set(id, (counts.get(id) || 0) + 1)
    }
    return counts
  })

  const classOptions = computed(() => firebaseStore.classes
    .map(classItem => {
      const teacher = firebaseStore.staffDTO.find(s => s.id === classItem.teacher)
      return {
        title: teacher ? `${teacher.first_name} ${teacher.last_name} (${classItem.classCode})` : classItem.className,
        value: classItem.classLetter,
      }
    })
    .toSorted((a, b) => a.value.localeCompare(b.value)),
  )

  // Parents with the most of the selected interests first
  const results = computed(() => candidates.value
    .filter(({ children }) => !selectedClass.value || children.some(child => child.className === selectedClass.value))
    .map(candidate => ({
      ...candidate,
      matched: selected.value.filter(id => candidate.interests.includes(id)),
      others: candidate.interests.filter(id => !selected.value.includes(id)),
    }))
    .filter(({ matched }) => matchAll.value ? matched.length === selected.value.length : matched.length > 0)
    .toSorted((a, b) => b.matched.length - a.matched.length || a.parent.fullName.localeCompare(b.parent.fullName)),
  )

  const emails = computed(() => [...new Set(results.value.map(({ parent }) => parent.email).filter(Boolean))])

  const copied = ref(false)

  async function copyEmails () {
    try {
      await navigator.clipboard.writeText(emails.value.join(', '))
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch (error) {
      console.error('Error copying emails:', error)
    }
  }
</script>

<style scoped>
.count {
  margin-inline-start: 6px;
  opacity: 0.6;
  font-size: 0.85em;
}
</style>

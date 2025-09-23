<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('staff.title') }}</h1>
      <v-chip
        :color="firebaseStore.loading ? 'orange' : 'green'"
        :prepend-icon="firebaseStore.loading ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
      >
        {{ firebaseStore.loading ? $t('common.loading') : searchQuery ? $t('staff.staffFiltered', { filtered: filteredStaffGroups.reduce((acc, group) => acc + group.members.length, 0), total: firebaseStore.staff.length }) : $t('staff.staffLoaded', { count: firebaseStore.staff.length }) }}
      </v-chip>
    </div>

    <div v-if="firebaseStore.error" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.error"
        :title="$t('staff.errorLoadingStaff')"
        type="error"
        @click:close="firebaseStore.error = null"
      />
    </div>

    <div v-if="firebaseStore.loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('staff.loadingStaff') }}</p>
    </div>

    <div v-else-if="firebaseStore.staff.length === 0" class="text-center py-8">
      <v-icon color="grey-darken-2" size="64">mdi-account-tie-outline</v-icon>
      <p class="text-h6 mt-4 text-grey-darken-2">{{ $t('staff.noStaffFound') }}</p>
    </div>

    <div v-else>
      <!-- Search Bar -->
      <v-card class="mb-4">
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            clearable
            hide-details
            :label="$t('staff.searchStaff')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </v-card-text>
      </v-card>

      <!-- Staff Groups -->
      <div v-for="group in filteredStaffGroups" :key="group.name" class="mb-6">
        <!-- Group Header -->
        <div class="d-flex align-center mb-3">
          <v-icon class="me-3" color="primary" size="large">
            {{ getGroupIcon(group.name) }}
          </v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold text-primary">
              {{ group.name }}
            </h2>
            <p class="text-body-2 text-grey-darken-1 ma-0">
              {{ $t('staff.memberCount', { count: group.members.length }) }}
            </p>
          </div>
        </div>

        <!-- Staff Members Grid -->
        <v-row>
          <v-col
            v-for="member in group.members"
            :key="member.id"
            cols="12"
            lg="3"
            md="4"
            sm="6"
          >
            <v-card class="d-flex flex-column" height="100%">
              <!-- Staff Member Header -->
              <v-card-title class="pb-2">
                <div class="text-h6 font-weight-bold">
                  <HighlightedText
                    :query="searchQuery"
                    :text="`${member.first_name} ${member.last_name}`"
                  />
                </div>
              </v-card-title>

              <v-card-text class="flex-grow-1 pt-0">
                <!-- Title -->
                <div v-if="member.title" class="mb-2">
                  <v-chip
                    color="primary"
                    size="small"
                    variant="outlined"
                  >
                    <HighlightedText :query="searchQuery" :text="member.title" />
                  </v-chip>
                </div>

                <!-- Contact Information -->
                <div class="mb-3">
                  <div v-if="member.email" class="mb-2 d-flex align-center">
                    <v-icon class="me-2" color="primary" size="small">mdi-email</v-icon>
                    <a class="text-decoration-none text-body-2" :href="`mailto:${member.email}`">
                      <HighlightedText :query="searchQuery" :text="member.email" />
                    </a>
                  </div>

                  <div v-if="member.phone" class="mb-2 d-flex align-center">
                    <v-icon class="me-2" color="primary" size="small">mdi-phone</v-icon>
                    <a class="text-decoration-none text-body-2" :href="`tel:${member.phone}`">
                      {{ formatPhone(member.phone) }}
                    </a>
                  </div>
                </div>

                <!-- CE Information -->
                <div v-if="member.ce_role || member.ce_hierarchy" class="mb-3">
                  <v-divider class="mb-2" />
                  <div class="text-subtitle-2 font-weight-medium mb-1 text-primary">
                    <v-icon class="me-1" size="small">mdi-sitemap</v-icon>
                    {{ $t('staff.ceInformation') }}
                  </div>

                  <div v-if="member.ce_role" class="text-body-2 mb-1">
                    <strong>{{ $t('staff.role') }}:</strong> {{ member.ce_role }}
                  </div>

                  <div v-if="member.ce_hierarchy" class="text-body-2">
                    <strong>{{ $t('staff.hierarchy') }}:</strong> {{ member.ce_hierarchy }}
                  </div>
                </div>

                <!-- Classes Taught -->
                <div v-if="getClassesTaught(member.id).length > 0" class="mb-3">
                  <v-divider class="mb-2" />
                  <div class="text-subtitle-2 font-weight-medium mb-1 text-primary">
                    <v-icon class="me-1" size="small">mdi-school</v-icon>
                    {{ $t('staff.classesTaught') }}
                  </div>
                  <div class="d-flex flex-wrap gap-1">
                    <v-chip
                      v-for="classLetter in getClassesTaught(member.id)"
                      :key="classLetter"
                      color="secondary"
                      size="x-small"
                      variant="outlined"
                    >
                      {{ classLetter }}
                    </v-chip>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import HighlightedText from '@/components/HighlightedText.vue'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { matchesAnyField } from '@/utils/search'
  import { useI18n } from '@/composables/useI18n'

  const searchQuery = ref('')
  const { t } = useI18n()

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  const groupedStaff = computed(() => {
    // Group staff by directory_table
    const groups = {}

    for (const member of firebaseStore.staff) {
      const groupName = member.directory_table || t('staff.otherStaff')

      if (!groups[groupName]) {
        groups[groupName] = []
      }

      groups[groupName].push(member)
    }

    // Convert to array and sort groups and members
    return Object.entries(groups).map(([name, members]) => ({
      name,
      members: members.sort((a, b) => {
        const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
        const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
        return nameA.localeCompare(nameB)
      }),
    })).sort((a, b) => {
      // Put "Other Staff" at the end
      if (a.name === 'Other Staff') return 1
      if (b.name === 'Other Staff') return -1
      return a.name.localeCompare(b.name)
    })
  })

  const filteredStaffGroups = computed(() => {
    return groupedStaff.value.map(group => ({
      ...group,
      members: group.members.filter(member => {
        const searchFields = [
          `${member.first_name} ${member.last_name}`,
          member.title || '',
          member.email || '',
          member.directory_table || '',
        ]

        return matchesAnyField(searchFields, searchQuery.value)
      }),
    })).filter(group => group.members.length > 0)
  })

  const getClassesTaught = staffId => {
    return firebaseStore.classes
      .filter(classItem => classItem.teacher === staffId)
      .map(classItem => classItem.classLetter)
      .sort()
  }

  const getGroupIcon = groupName => {
    const groupLower = groupName.toLowerCase()

    if (groupLower.includes('administration') || groupLower.includes('direction')) {
      return 'mdi-account-tie'
    } else if (groupLower.includes('teacher') || groupLower.includes('enseignant')) {
      return 'mdi-school'
    } else if (groupLower.includes('support') || groupLower.includes('aide')) {
      return 'mdi-account-heart'
    } else if (groupLower.includes('maintenance') || groupLower.includes('entretien')) {
      return 'mdi-tools'
    } else if (groupLower.includes('secretary') || groupLower.includes('secrétaire')) {
      return 'mdi-file-document'
    } else if (groupLower.includes('specialist') || groupLower.includes('spécialiste')) {
      return 'mdi-star'
    } else {
      return 'mdi-account-group'
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

  onMounted(() => {
    firebaseStore.loadAllData()
  })
</script>

<style scoped>
a {
  color: inherit;
}

a:hover {
  color: rgb(var(--v-theme-primary));
}

.gap-1 {
  gap: 0.25rem;
}
</style>

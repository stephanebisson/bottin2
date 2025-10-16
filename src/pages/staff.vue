<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('staff.title') }}</h1>
      <v-chip
        :color="firebaseStore.staffLoadingDTO ? 'orange' : 'green'"
        :prepend-icon="firebaseStore.staffLoadingDTO ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
      >
        {{ firebaseStore.staffLoadingDTO ? $t('common.loading') : searchQuery ? $t('staff.staffFiltered', { filtered: filteredStaffGroups.reduce((acc, group) => acc + group.subgroups.reduce((subAcc, subgroup) => subAcc + subgroup.members.length, 0), 0), total: firebaseStore.staffDTO.length }) : $t('staff.staffLoaded', { count: firebaseStore.staffDTO.length }) }}
      </v-chip>
    </div>

    <div v-if="firebaseStore.staffErrorDTO" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.staffErrorDTO"
        :title="$t('staff.errorLoadingStaff')"
        type="error"
        @click:close="firebaseStore.staffErrorDTO = null"
      />
    </div>

    <div v-if="firebaseStore.staffLoadingDTO" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('staff.loadingStaff') }}</p>
    </div>

    <div v-else-if="firebaseStore.staffDTO.length === 0" class="text-center py-8">
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
      <div v-for="group in filteredStaffGroups" :key="group.name" class="mb-8">
        <!-- Group Header (h2) -->
        <h2 class="text-h4 font-weight-bold text-primary mb-6">
          {{ group.name }}
        </h2>

        <!-- Subgroups -->
        <div v-for="subgroup in group.subgroups" :key="subgroup.name" class="mb-6">
          <!-- Subgroup Header (h3) -->
          <div class="d-flex align-center mb-3">
            <v-icon class="me-3" color="primary" size="large">
              {{ getGroupIcon(group.group, subgroup.subgroup) }}
            </v-icon>
            <div>
              <h3 class="text-h5 font-weight-bold text-primary">
                {{ subgroup.name }}
              </h3>
              <p class="text-body-2 text-grey-darken-1 ma-0">
                {{ $t('staff.memberCount', { count: subgroup.members.length }) }}
              </p>
            </div>
          </div>

          <!-- Staff Members Grid -->
          <v-row>
            <v-col
              v-for="member in subgroup.members"
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
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import HighlightedText from '@/components/HighlightedText.vue'
  import { useI18n } from '@/composables/useI18n'
  import { GROUP_DISPLAY_NAMES, GROUP_SUBGROUP_MAPPING, STAFF_GROUPS, SUBGROUP_DISPLAY_NAMES } from '@/config/staffGroups'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { matchesAnyField } from '@/utils/search'

  const searchQuery = ref('')
  const { t } = useI18n()

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  const groupedStaff = computed(() => {
    // Create hierarchical group structure: groups contain subgroups
    const hierarchicalGroups = []

    // Process each group in the defined order (EF, SDG)
    for (const group of STAFF_GROUPS) {
      const subgroups = GROUP_SUBGROUP_MAPPING[group]
      const groupSubgroups = []

      // Process each subgroup in order
      for (const subgroup of subgroups) {
        // Find staff members for this group/subgroup combination
        const members = firebaseStore.staffDTO.filter(member =>
          member.group === group && member.subgroup === subgroup,
        )

        if (members.length > 0) {
          // Sort members by order field, then alphabetically by last name, first name
          const sortedMembers = members.sort((a, b) => {
            // Primary sort: by order field
            const orderA = a.order || 99
            const orderB = b.order || 99
            if (orderA !== orderB) {
              return orderA - orderB
            }
            // Secondary sort: alphabetically by name
            const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
            const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
            return nameA.localeCompare(nameB)
          })

          groupSubgroups.push({
            subgroup,
            name: SUBGROUP_DISPLAY_NAMES[subgroup] || subgroup,
            members: sortedMembers,
          })
        }
      }

      // Only add group if it has subgroups with members
      if (groupSubgroups.length > 0) {
        hierarchicalGroups.push({
          group,
          name: GROUP_DISPLAY_NAMES[group] || group,
          subgroups: groupSubgroups,
        })
      }
    }

    // Add staff without group/subgroup at the end
    const ungroupedMembers = firebaseStore.staffDTO.filter(member =>
      !member.group || !member.subgroup,
    )

    if (ungroupedMembers.length > 0) {
      hierarchicalGroups.push({
        group: null,
        name: t('staff.otherStaff'),
        subgroups: [{
          subgroup: null,
          name: t('staff.otherStaff'),
          members: ungroupedMembers.sort((a, b) => {
            // Primary sort: by order field
            const orderA = a.order || 99
            const orderB = b.order || 99
            if (orderA !== orderB) {
              return orderA - orderB
            }
            // Secondary sort: alphabetically by name
            const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
            const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
            return nameA.localeCompare(nameB)
          }),
        }],
      })
    }

    return hierarchicalGroups
  })

  const filteredStaffGroups = computed(() => {
    return groupedStaff.value.map(group => ({
      ...group,
      subgroups: group.subgroups.map(subgroup => ({
        ...subgroup,
        members: subgroup.members.filter(member => {
          const searchFields = [
            member.fullName,
            member.title || '',
            member.email || '',
            member.group || '',
            member.subgroup || '',
          ]

          return matchesAnyField(searchFields, searchQuery.value)
        }),
      })).filter(subgroup => subgroup.members.length > 0),
    })).filter(group => group.subgroups.length > 0)
  })

  const getClassesTaught = staffId => {
    return firebaseStore.classes
      .filter(classItem => classItem.teacher === staffId)
      .map(classItem => classItem.classLetter)
      .sort()
  }

  const getGroupIcon = (group, subgroup) => {
    // Icon mapping based on group/subgroup
    if (group === 'EF') {
      switch (subgroup) {
        case 'admin': {
          return 'mdi-account-tie'
        }
        case 'teacher': {
          return 'mdi-school'
        }
        case 'specialist': {
          return 'mdi-star'
        }
      // No default
      }
    } else if (group === 'SDG') {
      if (subgroup === 'resp') {
        return 'mdi-account-cog'
      } else if (subgroup === 'edu') {
        return 'mdi-teach'
      }
    }

    // Default icon for ungrouped staff
    return 'mdi-account-group'
  }

  const formatPhone = phone => {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  onMounted(async () => {
    // Load DTO data in parallel
    await Promise.all([
      firebaseStore.loadStaffDTO(),
      firebaseStore.loadAllData(), // Still need classes data
    ])
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

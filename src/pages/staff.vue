<template>
  <v-container>
    <div v-if="firebaseStore.staffErrorDTO" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.staffErrorDTO"
        :title="$i18n('staff.errorLoadingStaff')"
        type="error"
        @click:close="firebaseStore.staffErrorDTO = null"
      />
    </div>

    <div v-if="firebaseStore.staffLoadingDTO" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-title-large mt-4">{{ $i18n('staff.loadingStaff') }}</p>
    </div>

    <div v-else-if="firebaseStore.staffDTO.length === 0" class="text-center py-8">
      <v-icon class="text-medium-emphasis" size="64">mdi-account-tie-outline</v-icon>
      <p class="text-title-large mt-4 text-medium-emphasis">{{ $i18n('staff.noStaffFound') }}</p>
    </div>

    <div v-else ref="staffListRef" :style="cardMinWidthStyle">
      <!-- Search Bar -->
      <v-card class="mb-4">
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            clearable
            hide-details
            :label="$i18n('staff.searchStaff')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </v-card-text>
      </v-card>

      <!-- Staff Groups -->
      <div v-for="group in filteredStaffGroups" :key="group.name" class="mb-8">
        <!-- Group Header (h2) -->
        <h2 class="text-headline-large font-weight-bold text-primary mb-6">
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
              <h3 class="text-headline-small font-weight-bold text-primary">
                {{ subgroup.name }}
              </h3>

              <p class="text-body-medium text-medium-emphasis ma-0">
                {{ $i18n('staff.memberCount', subgroup.members.length) }}
              </p>
            </div>
          </div>

          <!-- Staff Members Grid -->
          <div class="staff-grid">
            <v-card
              v-for="member in subgroup.members"
              :key="member.id"
              class="d-flex flex-column"
            >
              <!-- Staff Member Header -->
              <v-card-title class="pb-2 text-wrap">
                <div class="text-title-large font-weight-bold">
                  <HighlightedText
                    :query="searchQuery"
                    :text="`${member.first_name} ${member.last_name}`"
                  />
                </div>
              </v-card-title>

              <v-card-text class="flex-grow-1 pt-0">
                <!-- Title -->
                <div v-if="member.title" class="staff-title mb-2">
                  <HighlightedText :query="searchQuery" :text="displayTitle(member.title)" />
                </div>

                <!-- Contact Information -->
                <div class="mb-3">
                  <div v-if="member.email" class="mb-2 d-flex align-center staff-contact-row">
                    <v-icon class="me-2 flex-shrink-0" color="primary" size="small">mdi-email</v-icon>

                    <a class="text-decoration-none text-body-medium" :href="`mailto:${member.email}`">
                      <HighlightedText :query="searchQuery" :text="member.email" />
                    </a>
                  </div>

                  <div v-if="member.phone" class="mb-2 d-flex align-center staff-contact-row">
                    <v-icon class="me-2 flex-shrink-0" color="primary" size="small">mdi-phone</v-icon>

                    <a class="text-decoration-none text-body-medium" :href="`tel:${member.phone}`">
                      {{ formatPhone(member.phone) }}
                    </a>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import HighlightedText from '@/components/HighlightedText.vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { GROUP_DISPLAY_NAMES, GROUP_SUBGROUP_MAPPING, STAFF_GROUPS, SUBGROUP_DISPLAY_NAMES } from '@/config/staffGroups'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { matchesAnyField } from '@/utils/search'

  definePage({ meta: { titleKey: 'staff.title' } })

  const $i18n = useTranslate()
  const searchQuery = ref('')
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
          const sortedMembers = members.toSorted((a, b) => {
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
        name: $i18n('staff.otherStaff'),
        subgroups: [{
          subgroup: null,
          name: $i18n('staff.otherStaff'),
          members: ungroupedMembers.toSorted((a, b) => {
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
            displayTitle(member.title),
            member.email || '',
            member.group || '',
            member.subgroup || '',
          ]

          return matchesAnyField(searchFields, searchQuery.value)
        }),
      })).filter(subgroup => subgroup.members.length > 0),
    })).filter(group => group.subgroups.length > 0)
  })

  const classCodesByLetter = computed(() =>
    new Map(firebaseStore.classes.map(classItem => [classItem.classLetter, classItem.classCode])),
  )

  // Teacher titles name their class by letter, e.g. "3e-4e (D)" -> "3e-4e (371-471)"
  function displayTitle (title) {
    if (!title) {
      return ''
    }
    return title.replace(/\(([A-Z])\)/g, (match, letter) => {
      const code = classCodesByLetter.value.get(letter)
      return code ? `(${code})` : match
    })
  }

  function getGroupIcon (group, subgroup) {
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

  function formatPhone (phone) {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  // Size cards so the widest contact line (usually an email) never wraps or clips.
  // The grid then fits as many cards per row as that width allows.
  const staffListRef = ref(null)
  const cardMinWidth = ref(null)
  const cardMinWidthStyle = computed(() =>
    cardMinWidth.value ? { '--staff-card-min-width': `${cardMinWidth.value}px` } : {},
  )

  function measureCardMinWidth () {
    const rows = staffListRef.value?.querySelectorAll('.staff-contact-row') ?? []
    let widest = 0
    for (const row of rows) {
      // scrollWidth reports the full text width even while the link is clipped
      const icon = row.querySelector('.v-icon')
      const link = row.querySelector('a')
      const { paddingLeft, paddingRight } = getComputedStyle(row.closest('.v-card-text'))
      const width = icon.offsetWidth
        + Number.parseFloat(getComputedStyle(icon).marginInlineEnd)
        + link.scrollWidth
        + Number.parseFloat(paddingLeft)
        + Number.parseFloat(paddingRight)
      widest = Math.max(widest, width)
    }
    cardMinWidth.value = widest ? Math.ceil(widest) : null
  }

  watch(filteredStaffGroups, measureCardMinWidth, { flush: 'post' })

  onMounted(() => {
    firebaseStore.loadStaffDTO()
    firebaseStore.loadClasses() // For class codes in teacher titles
    measureCardMinWidth()
    // Web fonts change text widths once loaded
    document.fonts?.ready.then(measureCardMinWidth)
  })
</script>

<style scoped>
a {
  color: inherit;
}

a:hover {
  color: rgb(var(--v-theme-primary));
}

.staff-grid {
  display: grid;
  /* Cards are at least as wide as their widest contact line, at most 4 per row */
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(100%, max(var(--staff-card-min-width, 280px), calc((100% - 3 * 24px) / 4))), 1fr)
  );
  gap: 24px;
}

.staff-contact-row {
  width: max-content;
  max-width: 100%;
  white-space: nowrap;
}

/* Only reached on screens narrower than the widest email */
.staff-contact-row a {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.staff-title {
  font-size: 0.875rem;
  font-style: italic;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  line-height: 1.4;
}
</style>

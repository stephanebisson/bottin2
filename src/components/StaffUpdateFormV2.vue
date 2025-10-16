<template>
  <div>
    <!-- Sticky Save Bar -->
    <SaveBar
      :change-count="changedItems.size + deletedItems.size"
      :has-changes="hasChanges"
      :saving="saving"
      @save="saveAllChanges"
    />

    <!-- Welcome Message -->
    <v-container class="py-6">
      <v-alert
        class="mb-6"
        color="info"
        icon="mdi-information"
        variant="tonal"
      >
        <div class="text-body-1">
          {{ $t('staffUpdate.welcome', { name: $t('staff.title') }) }}
        </div>
        <div class="text-body-2 mt-2">
          {{ $t('staffUpdate.instructions') }}
        </div>
      </v-alert>

      <!-- Loading State -->
      <div v-if="loadingStaff" class="text-center py-12">
        <v-progress-circular color="primary" indeterminate size="64" />
        <p class="text-body-1 mt-4">{{ $t('staffUpdate.loadingStaff') }}</p>
      </div>

      <!-- Staff Groups -->
      <div v-else>
        <GroupSection
          v-for="groupData in organizedStaff"
          :key="groupData.group"
          :group="groupData.group"
          :modified-ids="changedItems"
          :name="groupData.name"
          :subgroups="groupData.subgroups"
          @add="handleAdd"
          @change="handleChange"
          @delete="handleDelete"
        />
      </div>
    </v-container>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      :timeout="4000"
    >
      {{ snackbarMessage }}
      <template #actions>
        <v-btn
          color="white"
          variant="text"
          @click="showSnackbar = false"
        >
          {{ $t('common.close') }}
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { useStaffUpdate } from '@/composables/useStaffUpdate'
  import { GROUP_DISPLAY_NAMES, GROUP_SUBGROUP_MAPPING, STAFF_GROUPS, SUBGROUP_DISPLAY_NAMES } from '@/config/staffGroups'
  import GroupSection from './staff-update/GroupSection.vue'
  import SaveBar from './staff-update/SaveBar.vue'

  const { t } = useI18n()

  // Props
  const props = defineProps({
    token: {
      type: String,
      required: true,
    },
  })

  // Use shared composable
  const {
    loadingStaff,
    saving,
    showSnackbar,
    snackbarMessage,
    snackbarColor,
    loadStaff: loadStaffData,
    saveAllChanges: saveChanges,
  } = useStaffUpdate(props.token)

  // State
  const staffList = ref([])
  const changedItems = ref(new Set())
  const deletedItems = ref(new Set())

  // Configuration for fixed vs variable sections
  const SUBGROUP_CONFIG = {
    'EF/admin': { isFixed: true },
    'EF/teacher': { isFixed: true },
    'EF/specialist': { isFixed: true },
    'SDG/resp': { isFixed: true },
    'SDG/edu': { isFixed: false },
  }

  // Icon mapping
  const getSubgroupIcon = (group, subgroup) => {
    if (group === 'EF') {
      switch (subgroup) {
        case 'admin': { return 'mdi-account-tie'
        }
        case 'teacher': { return 'mdi-school'
        }
        case 'specialist': { return 'mdi-star'
        }
      }
    } else if (group === 'SDG') {
      switch (subgroup) {
        case 'resp': { return 'mdi-account-cog'
        }
        case 'edu': { return 'mdi-teach'
        }
      }
    }
    return 'mdi-account-group'
  }

  // Computed
  const hasChanges = computed(() => changedItems.value.size > 0 || deletedItems.value.size > 0)

  // Organize staff into hierarchical structure
  const organizedStaff = computed(() => {
    const groups = []

    for (const group of STAFF_GROUPS) {
      const subgroups = GROUP_SUBGROUP_MAPPING[group]
      const groupSubgroups = []

      for (const subgroup of subgroups) {
        // Find staff members for this group/subgroup combination
        const members = staffList.value.filter(
          member => member.group === group && member.subgroup === subgroup,
        )

        // Sort members by order field
        const sortedMembers = members.sort((a, b) => {
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

        const configKey = `${group}/${subgroup}`
        const config = SUBGROUP_CONFIG[configKey] || { isFixed: false }

        groupSubgroups.push({
          subgroup,
          name: SUBGROUP_DISPLAY_NAMES[subgroup] || subgroup,
          icon: getSubgroupIcon(group, subgroup),
          members: sortedMembers,
          isFixed: config.isFixed,
        })
      }

      groups.push({
        group,
        name: GROUP_DISPLAY_NAMES[group] || group,
        subgroups: groupSubgroups,
      })
    }

    return groups
  })

  // Load all staff using shared composable
  const loadStaff = async () => {
    try {
      staffList.value = await loadStaffData()
    } catch {
      // Error already handled by composable
    }
  }

  // Handle staff change
  const handleChange = updatedStaff => {
    // Find and update the staff member in the list
    const index = staffList.value.findIndex(s => s.id === updatedStaff.id)
    if (index !== -1) {
      staffList.value[index] = updatedStaff
      // Mark as changed (unless it's new)
      if (!updatedStaff._isNew) {
        changedItems.value.add(updatedStaff.id)
      }
    }
  }

  // Handle staff deletion
  const handleDelete = staffId => {
    const staff = staffList.value.find(s => s.id === staffId)
    if (staff) {
      // Remove from list
      const index = staffList.value.findIndex(s => s.id === staffId)
      if (index !== -1) {
        staffList.value.splice(index, 1)
      }

      // If it's an existing item, mark for deletion
      if (!staff._isNew) {
        deletedItems.value.add(staffId)
      }

      // Remove from changed items if it was there
      changedItems.value.delete(staffId)
    }
  }

  // Handle adding new staff member
  const handleAdd = ({ group, subgroup }) => {
    // Find the highest order in this subgroup to add the new member at the end
    const membersInSubgroup = staffList.value.filter(
      s => s.group === group && s.subgroup === subgroup,
    )
    const maxOrder = membersInSubgroup.length > 0
      ? Math.max(...membersInSubgroup.map(s => s.order || 0))
      : 0

    const newId = `new_${Date.now()}`
    const newStaff = {
      id: newId,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      title: '',
      ce_role: '',
      group,
      subgroup,
      order: maxOrder + 1, // Add at the end
      _isNew: true,
    }

    staffList.value.push(newStaff)
    changedItems.value.add(newId)
  }

  // Save all changes using shared composable
  const saveAllChanges = async () => {
    try {
      // Auto-assign order based on position in organized structure
      let orderCounter = 1
      const updates = []

      for (const groupData of organizedStaff.value) {
        for (const subgroupData of groupData.subgroups) {
          for (const member of subgroupData.members) {
            if (changedItems.value.has(member.id)) {
              updates.push({
                id: member.id,
                first_name: member.first_name,
                last_name: member.last_name,
                email: member.email,
                phone: member.phone,
                title: member.title,
                ce_role: member.ce_role,
                group: groupData.group, // Auto-assigned from structure
                subgroup: subgroupData.subgroup, // Auto-assigned from structure
                order: orderCounter++, // Auto-assigned from position
              })
            } else {
              // Still increment counter for unchanged items to maintain proper ordering
              orderCounter++
            }
          }
        }
      }

      // Prepare deletions array
      const deletions = Array.from(deletedItems.value)

      // Use shared save function
      await saveChanges(updates, deletions)

      // Clear change tracking
      changedItems.value.clear()
      deletedItems.value.clear()

      // Reload to get fresh data
      await loadStaff()
    } catch {
      // Error already handled by composable
    }
  }

  onMounted(async () => {
    await loadStaff()
  })
</script>

<style scoped>
/* Limit container width for form-like appearance */
.v-container {
  max-width: 1200px;
}
</style>

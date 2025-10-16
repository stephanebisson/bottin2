<template>
  <v-card>
    <v-card-title class="d-flex align-center bg-primary text-white">
      <v-icon class="mr-2">mdi-account-edit</v-icon>
      {{ $t('staffUpdate.title') }}
    </v-card-title>

    <v-card-text class="pa-6">
      <!-- Welcome Message -->
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

      <!-- Loading staff data -->
      <div v-if="loadingStaff" class="text-center py-12">
        <v-progress-circular color="primary" indeterminate size="64" />
        <p class="text-body-1 mt-4">{{ $t('staffUpdate.loadingStaff') }}</p>
      </div>

      <!-- Staff Data Table -->
      <div v-else>
        <!-- Action Buttons -->
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="d-flex gap-2">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="addNewRow"
            >
              {{ $t('staffUpdate.addStaff') }}
            </v-btn>

            <v-btn
              color="success"
              :disabled="!hasChanges"
              :loading="saving"
              prepend-icon="mdi-content-save"
              @click="saveAllChanges"
            >
              {{ $t('staffUpdate.saveChanges') }}
            </v-btn>
          </div>

          <v-chip
            v-if="hasChanges"
            color="warning"
            prepend-icon="mdi-alert"
            variant="tonal"
          >
            {{ $t('staffUpdate.unsavedChanges') }}
          </v-chip>
        </div>

        <!-- Editable Table -->
        <v-data-table
          class="elevation-1 staff-table"
          density="comfortable"
          :headers="headers"
          :items="staffList"
          :items-per-page="-1"
        >
          <!-- First Name Column -->
          <template #item.first_name="{ item }">
            <v-text-field
              v-model="item.first_name"
              density="compact"
              hide-details
              variant="outlined"
              @update:model-value="markAsChanged(item)"
            />
          </template>

          <!-- Last Name Column -->
          <template #item.last_name="{ item }">
            <v-text-field
              v-model="item.last_name"
              density="compact"
              hide-details
              variant="outlined"
              @update:model-value="markAsChanged(item)"
            />
          </template>

          <!-- Email Column -->
          <template #item.email="{ item }">
            <v-text-field
              v-model="item.email"
              density="compact"
              hide-details
              type="email"
              variant="outlined"
              @update:model-value="markAsChanged(item)"
            />
          </template>

          <!-- Phone Column -->
          <template #item.phone="{ item }">
            <v-text-field
              v-model="item.phone"
              density="compact"
              hide-details
              variant="outlined"
              @update:model-value="markAsChanged(item)"
            />
          </template>

          <!-- Title Column -->
          <template #item.title="{ item }">
            <v-text-field
              v-model="item.title"
              density="compact"
              hide-details
              variant="outlined"
              @update:model-value="markAsChanged(item)"
            />
          </template>

          <!-- Group Column -->
          <template #item.group="{ item }">
            <v-select
              v-model="item.group"
              clearable
              density="compact"
              hide-details
              :items="STAFF_GROUPS"
              variant="outlined"
              @update:model-value="onGroupChange(item)"
            />
          </template>

          <!-- Subgroup Column -->
          <template #item.subgroup="{ item }">
            <v-select
              v-model="item.subgroup"
              clearable
              density="compact"
              :disabled="!item.group"
              hide-details
              :items="getSubgroupOptions(item)"
              variant="outlined"
              @update:model-value="markAsChanged(item)"
            />
          </template>

          <!-- Order Column -->
          <template #item.order="{ item }">
            <v-text-field
              v-model.number="item.order"
              density="compact"
              hide-details
              max="99"
              min="1"
              type="number"
              variant="outlined"
              @update:model-value="markAsChanged(item)"
            />
          </template>

          <!-- Actions Column -->
          <template #item.actions="{ item }">
            <v-btn
              color="error"
              density="compact"
              icon="mdi-delete"
              size="small"
              variant="text"
              @click="deleteRow(item)"
            />
          </template>
        </v-data-table>

        <!-- Stats -->
        <div class="mt-4 text-body-2 text-grey-darken-1">
          {{ $t('staffUpdate.totalStaff', { count: staffList.length }) }}
          <span v-if="hasChanges" class="ml-4">
            • {{ $t('staffUpdate.changedItems', { count: changedItems.size }) }}
          </span>
        </div>
      </div>
    </v-card-text>
  </v-card>

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
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { useStaffUpdate } from '@/composables/useStaffUpdate'
  import { getValidSubgroupsForGroup, GROUP_SUBGROUP_MAPPING, STAFF_GROUPS } from '@/config/staffGroups'

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
    showMessage,
  } = useStaffUpdate(props.token)

  // State
  const staffList = ref([])
  const changedItems = ref(new Set())
  const deletedItems = ref(new Set())

  // Computed
  const hasChanges = computed(() => changedItems.value.size > 0 || deletedItems.value.size > 0)

  // Get available subgroups for a staff member based on their group
  const getSubgroupOptions = item => {
    if (!item.group) {
      return []
    }
    return getValidSubgroupsForGroup(item.group)
  }

  // Handle group change - clear subgroup if it's no longer valid
  const onGroupChange = item => {
    const validSubgroups = getSubgroupOptions(item)

    // Clear subgroup if it's not valid for the new group
    if (item.subgroup && !validSubgroups.includes(item.subgroup)) {
      item.subgroup = ''
    }

    markAsChanged(item)
  }

  // Sort staff list by group, subgroup, order, and name
  const sortStaffList = () => {
    staffList.value.sort((a, b) => {
      // Get group order from STAFF_GROUPS array
      const groupOrderA = STAFF_GROUPS.indexOf(a.group)
      const groupOrderB = STAFF_GROUPS.indexOf(b.group)

      // Sort ungrouped items to the end
      const groupA = groupOrderA === -1 ? 999 : groupOrderA
      const groupB = groupOrderB === -1 ? 999 : groupOrderB

      if (groupA !== groupB) {
        return groupA - groupB
      }

      // Within same group, sort by subgroup order
      if (a.group && b.group && a.group === b.group) {
        const subgroups = GROUP_SUBGROUP_MAPPING[a.group] || []
        const subgroupOrderA = subgroups.indexOf(a.subgroup)
        const subgroupOrderB = subgroups.indexOf(b.subgroup)

        const subA = subgroupOrderA === -1 ? 999 : subgroupOrderA
        const subB = subgroupOrderB === -1 ? 999 : subgroupOrderB

        if (subA !== subB) {
          return subA - subB
        }
      }

      // Within same group and subgroup, sort by order field
      const orderA = a.order || 99
      const orderB = b.order || 99
      if (orderA !== orderB) {
        return orderA - orderB
      }

      // Finally, sort alphabetically by name
      const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
      const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }

  // Table headers
  const headers = computed(() => [
    { title: t('staffUpdate.firstName'), key: 'first_name', sortable: false, width: '12%' },
    { title: t('staffUpdate.lastName'), key: 'last_name', sortable: false, width: '12%' },
    { title: t('staffUpdate.email'), key: 'email', sortable: false, width: '16%' },
    { title: t('staffUpdate.phone'), key: 'phone', sortable: false, width: '11%' },
    { title: t('staffUpdate.title'), key: 'title', sortable: false, width: '13%' },
    { title: t('staffUpdate.group'), key: 'group', sortable: false, width: '10%' },
    { title: t('staffUpdate.subgroup'), key: 'subgroup', sortable: false, width: '10%' },
    { title: t('staffUpdate.order'), key: 'order', sortable: false, width: '6%' },
    { title: t('common.actions'), key: 'actions', sortable: false, width: '5%', align: 'center' },
  ])

  // Load all staff using shared composable
  const loadStaff = async () => {
    try {
      staffList.value = await loadStaffData()
      // Sort the staff list
      sortStaffList()
    } catch {
      // Error already handled by composable
    }
  }

  // Mark item as changed
  const markAsChanged = item => {
    if (!item._isNew) {
      changedItems.value.add(item.id)
    }
  }

  // Add new row
  const addNewRow = () => {
    const newId = `new_${Date.now()}`
    staffList.value.push({
      id: newId,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      title: '',
      ce_role: '',
      group: '',
      subgroup: '',
      order: 99,
      _isNew: true,
    })
    changedItems.value.add(newId)
  }

  // Delete row
  const deleteRow = item => {
    const index = staffList.value.findIndex(s => s.id === item.id)
    if (index !== -1) {
      staffList.value.splice(index, 1)

      // If it's an existing item, mark for deletion
      if (!item._isNew) {
        deletedItems.value.add(item.id)
      }

      // Remove from changed items if it was there
      changedItems.value.delete(item.id)
    }
  }

  // Save all changes using shared composable
  const saveAllChanges = async () => {
    try {
      // Prepare updates array (items that changed)
      const updates = []
      for (const item of staffList.value) {
        if (changedItems.value.has(item.id)) {
          updates.push({
            id: item.id,
            first_name: item.first_name,
            last_name: item.last_name,
            email: item.email,
            phone: item.phone,
            title: item.title,
            ce_role: item.ce_role,
            group: item.group,
            subgroup: item.subgroup,
            order: item.order || 99,
          })
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
.v-card-title {
  border-radius: 4px 4px 0 0;
  word-wrap: break-word;
  white-space: normal;
  line-height: 1.3;
}

/* Make table more comfortable for desktop editing */
:deep(.staff-table) {
  width: 100%;
}

:deep(.staff-table .v-data-table__td) {
  padding: 8px 4px !important;
}

:deep(.staff-table .v-text-field) {
  min-width: 120px;
}

:deep(.staff-table .v-text-field input) {
  font-size: 14px;
}
</style>

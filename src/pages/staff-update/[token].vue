<template>
  <v-container class="py-8" fluid>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('staffUpdate.loadingInfo') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <v-icon color="warning" size="64">mdi-information-outline</v-icon>
      <h2 class="text-h4 mt-4 text-warning">{{ getErrorTitle() }}</h2>
      <p class="text-body-1 mt-2 text-grey-darken-1">{{ getErrorMessage() }}</p>

      <!-- Action buttons -->
      <div class="mt-6">
        <v-btn
          v-if="errorType === 'network' || errorType === 'temporary'"
          class="mr-2"
          color="primary"
          variant="flat"
          @click="retryLoad"
        >
          <v-icon class="mr-2">mdi-refresh</v-icon>
          {{ $t('common.tryAgain') }}
        </v-btn>

        <v-btn
          color="secondary"
          variant="outlined"
          @click="$router.push('/')"
        >
          <v-icon class="mr-2">mdi-home</v-icon>
          {{ $t('common.goHome') }}
        </v-btn>
      </div>

      <!-- Contact info for persistent issues -->
      <v-alert
        v-if="errorType === 'expired' || retryCount >= 2"
        class="mt-6 mx-auto"
        color="info"
        icon="mdi-email"
        max-width="500"
        variant="tonal"
      >
        {{ $t('staffUpdate.contactSchool') }}
      </v-alert>
    </div>

    <!-- Update Form -->
    <div v-else-if="tokenValid">
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
    </div>

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
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from '@/composables/useI18n'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { getValidSubgroupsForGroup, GROUP_SUBGROUP_MAPPING, STAFF_GROUPS } from '@/config/staffGroups'

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  // State
  const loading = ref(true)
  const loadingStaff = ref(false)
  const saving = ref(false)
  const error = ref(null)
  const errorType = ref(null) // 'network', 'expired', 'temporary', 'invalid'
  const retryCount = ref(0)
  const tokenValid = ref(false)
  const staffList = ref([])
  const changedItems = ref(new Set())
  const deletedItems = ref(new Set())

  // Snackbar state
  const showSnackbar = ref(false)
  const snackbarMessage = ref('')
  const snackbarColor = ref('info')

  // Get token from route params
  const token = computed(() => route.params.token)

  // Computed
  const hasChanges = computed(() => changedItems.value.size > 0 || deletedItems.value.size > 0)

  // Helper to show snackbar
  const showMessage = (message, color = 'info') => {
    snackbarMessage.value = message
    snackbarColor.value = color
    showSnackbar.value = true
  }

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

  // Validate token with backend
  const validateToken = async () => {
    try {
      loading.value = true
      error.value = null
      errorType.value = null

      // Validate token exists
      if (!token.value) {
        error.value = 'missing_token'
        errorType.value = 'invalid'
        return
      }

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/validateStaffUpdateToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.value }),
      })

      if (!response.ok) {
        // Set appropriate error type and message
        if (response.status === 404 || response.status === 410) {
          error.value = 'expired_token'
          errorType.value = 'expired'
        } else if (response.status >= 500) {
          error.value = 'server_error'
          errorType.value = 'temporary'
        } else {
          error.value = 'network_error'
          errorType.value = 'network'
        }
        return
      }

      const data = await response.json()

      if (!data.valid) {
        error.value = 'invalid_token'
        errorType.value = 'expired'
        return
      }

      // Token is valid
      tokenValid.value = true
    } catch (error_) {
      console.error('Failed to validate token:', error_)

      // Show friendly error message
      if (error_.message.includes('network') || error_.message.includes('fetch')) {
        error.value = 'network_error'
        errorType.value = 'network'
      } else {
        error.value = 'unexpected_error'
        errorType.value = 'temporary'
      }
    } finally {
      loading.value = false
    }
  }

  // Load all staff via Firebase Function
  const loadStaff = async () => {
    try {
      loadingStaff.value = true

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/getStaffWithToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.value }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Convert to editing format
      staffList.value = data.staff.map(staff => ({
        id: staff.id,
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        title: staff.title || '',
        ce_role: staff.ce_role || '',
        ce_hierarchy: staff.ce_hierarchy || null,
        group: staff.group || '',
        subgroup: staff.subgroup || '',
        order: staff.order || 99,
        _isNew: false, // Track if this is a new row
      }))

      // Sort the staff list
      sortStaffList()
    } catch (error_) {
      console.error('Failed to load staff:', error_)
      showMessage(t('staffUpdate.loadError'), 'error')
    } finally {
      loadingStaff.value = false
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
      ce_hierarchy: null,
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

  // Save all changes via Firebase Function
  const saveAllChanges = async () => {
    try {
      saving.value = true

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
            ce_hierarchy: item.ce_hierarchy,
            group: item.group,
            subgroup: item.subgroup,
            order: item.order || 99,
          })
        }
      }

      // Prepare deletions array
      const deletions = Array.from(deletedItems.value)

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/updateStaffWithToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.value,
          updates,
          deletions,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Clear change tracking
      changedItems.value.clear()
      deletedItems.value.clear()

      showMessage(t('staffUpdate.saveSuccess'), 'success')

      // Reload to get fresh data
      await loadStaff()
    } catch (error_) {
      console.error('Failed to save changes:', error_)
      showMessage(t('staffUpdate.saveError'), 'error')
    } finally {
      saving.value = false
    }
  }

  // Retry loading data
  const retryLoad = async () => {
    retryCount.value++
    await validateToken()
  }

  // Get user-friendly error title
  const getErrorTitle = () => {
    switch (error.value) {
      case 'missing_token':
      case 'invalid_token':
      case 'expired_token': {
        return t('staffUpdate.linkExpired')
      }
      case 'server_error': {
        return t('staffUpdate.serviceIssue')
      }
      case 'network_error': {
        return t('staffUpdate.connectionIssue')
      }
      default: {
        return t('staffUpdate.unexpectedIssue')
      }
    }
  }

  // Get user-friendly error message
  const getErrorMessage = () => {
    switch (error.value) {
      case 'missing_token':
      case 'invalid_token': {
        return t('staffUpdate.invalidLinkMessage')
      }
      case 'expired_token': {
        return t('staffUpdate.expiredLinkMessage')
      }
      case 'server_error': {
        return t('staffUpdate.serverErrorMessage')
      }
      case 'network_error': {
        return t('staffUpdate.networkErrorMessage')
      }
      default: {
        return t('staffUpdate.unexpectedErrorMessage')
      }
    }
  }

  onMounted(async () => {
    await validateToken()

    // If token is valid, load staff data
    if (tokenValid.value) {
      await loadStaff()
    }
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

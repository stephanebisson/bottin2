<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $i18n('feedback.admin.title') }}</h1>
    </div>

    <!-- Access Control -->
    <div v-if="!isAuthorized" class="text-center py-12">
      <v-icon color="error" size="64">mdi-shield-alert</v-icon>
      <h2 class="text-h5 mt-4 text-error">{{ $i18n('admin.accessDenied') }}</h2>
      <p class="text-body-1 text-grey-darken-1 mt-2">
        {{ $i18n('admin.adminAccessRequired') }}
      </p>

      <!-- Manual Refresh Button for newly granted admins -->
      <div class="mt-6">
        <p class="text-body-2 text-grey-darken-1 mb-4">
          {{ $i18n('admin.refreshPermissionsInstructions') }}
        </p>
        <v-btn
          color="primary"
          :loading="loading"
          prepend-icon="mdi-refresh"
          @click="checkAdminStatus"
        >
          {{ $i18n('admin.refreshAdminStatus') }}
        </v-btn>
      </div>
    </div>

    <!-- Feedback Management -->
    <div v-else>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular color="primary" indeterminate size="64" />
        <p class="text-h6 mt-4">{{ $i18n('common.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <v-icon color="error" size="64">mdi-alert-circle</v-icon>
        <h2 class="text-h5 mt-4 text-error">{{ $i18n('common.error') }}</h2>
        <p class="text-body-1 text-grey-darken-1 mt-2">{{ error }}</p>
        <v-btn
          class="mt-4"
          color="primary"
          @click="loadData"
        >
          {{ $i18n('common.retry') }}
        </v-btn>
      </div>

      <!-- Feedback Content -->
      <div v-else>
        <!-- Summary Stats -->
        <v-row class="mb-6">
          <v-col cols="12" md="4">
            <v-card color="primary" variant="tonal">
              <v-card-text>
                <div class="d-flex align-center">
                  <v-icon class="mr-3" size="40">mdi-message-text</v-icon>
                  <div>
                    <div class="text-h4 font-weight-bold">{{ stats.total }}</div>
                    <div class="text-body-2">{{ $i18n('feedback.admin.totalFeedback') }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card color="warning" variant="tonal">
              <v-card-text>
                <div class="d-flex align-center">
                  <v-icon class="mr-3" size="40">mdi-clock-alert</v-icon>
                  <div>
                    <div class="text-h4 font-weight-bold">{{ stats.pending }}</div>
                    <div class="text-body-2">{{ $i18n('feedback.admin.pendingFeedback') }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card color="success" variant="tonal">
              <v-card-text>
                <div class="d-flex align-center">
                  <v-icon class="mr-3" size="40">mdi-check-circle</v-icon>
                  <div>
                    <div class="text-h4 font-weight-bold">{{ stats.resolved }}</div>
                    <div class="text-body-2">{{ $i18n('feedback.admin.resolvedFeedback') }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Filters -->
        <v-card class="mb-6">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="searchText"
                  clearable
                  density="compact"
                  hide-details
                  :label="$i18n('common.search')"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="statusFilter"
                  chips
                  density="compact"
                  hide-details
                  :items="statusFilterOptions"
                  :label="$i18n('feedback.admin.filterByStatus')"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Data Table -->
        <v-card>
          <v-data-table
            class="elevation-0"
            :expanded="expanded"
            :headers="tableHeaders"
            :items="filteredFeedback"
            :items-per-page="25"
            :search="searchText"
            show-expand
          >
            <!-- Date Column -->
            <template #item.createdAt="{ item }">
              <span class="text-body-2">
                {{ formatDate(item.createdAt) }}
              </span>
            </template>

            <!-- Parent Column -->
            <template #item.parent_id="{ item }">
              <div>
                <div class="font-weight-medium">{{ getParentName(item.parent_id) }}</div>
                <div class="text-caption text-grey-darken-1">{{ getParentEmail(item.parent_id) }}</div>
              </div>
            </template>

            <!-- Message Column -->
            <template #item.message="{ item }">
              <div class="text-body-2" style="max-width: 400px;">
                {{ item.shortMessage }}
              </div>
            </template>

            <!-- Status Column -->
            <template #item.status="{ item }">
              <v-chip
                :color="item.status === 'resolved' ? 'success' : 'warning'"
                size="small"
                variant="flat"
              >
                {{ item.displayStatus }}
              </v-chip>
            </template>

            <!-- Actions Column -->
            <template #item.actions="{ item }">
              <div class="d-flex align-center ga-1">
                <!-- Toggle Status Button -->
                <v-btn
                  :color="item.status === 'pending' ? 'success' : 'warning'"
                  :icon="item.status === 'pending' ? 'mdi-check' : 'mdi-clock-alert'"
                  :loading="item._updating"
                  size="small"
                  variant="text"
                  @click="toggleStatus(item)"
                >
                  <v-icon />
                  <v-tooltip activator="parent" location="top">
                    {{ item.status === 'pending' ? $i18n('feedback.admin.markAsResolved') : $i18n('feedback.admin.markAsPending') }}
                  </v-tooltip>
                </v-btn>

                <!-- Add Notes Button -->
                <v-btn
                  color="primary"
                  icon="mdi-note-edit"
                  size="small"
                  variant="text"
                  @click="openNotesDialog(item)"
                >
                  <v-icon />
                  <v-tooltip activator="parent" location="top">
                    {{ $i18n('feedback.admin.editNotes') }}
                  </v-tooltip>
                </v-btn>

                <!-- Delete Button -->
                <v-btn
                  color="error"
                  icon="mdi-delete"
                  :loading="item._deleting"
                  size="small"
                  variant="text"
                  @click="confirmDelete(item)"
                >
                  <v-icon />
                  <v-tooltip activator="parent" location="top">
                    {{ $i18n('common.delete') }}
                  </v-tooltip>
                </v-btn>
              </div>
            </template>

            <!-- Expanded Row -->
            <template #expanded-row="{ columns, item }">
              <tr>
                <td :colspan="columns.length">
                  <div class="pa-4">
                    <!-- Full Message -->
                    <div class="mb-4">
                      <div class="text-subtitle-2 font-weight-bold mb-2">
                        {{ $i18n('feedback.admin.fullMessage') }}
                      </div>
                      <div class="text-body-1 pa-3 bg-grey-lighten-4 rounded">
                        {{ item.message }}
                      </div>
                    </div>

                    <!-- Admin Notes -->
                    <div v-if="item.hasAdminNotes">
                      <div class="text-subtitle-2 font-weight-bold mb-2">
                        {{ $i18n('feedback.admin.adminNotes') }}
                      </div>
                      <div class="text-body-1 pa-3 bg-blue-lighten-5 rounded">
                        {{ item.admin_notes }}
                      </div>
                    </div>
                    <div v-else class="text-body-2 text-grey-darken-1 font-italic">
                      {{ $i18n('feedback.admin.noAdminNotes') }}
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card>
      </div>
    </div>

    <!-- Admin Notes Dialog -->
    <v-dialog v-model="notesDialog" max-width="600">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ $i18n('feedback.admin.editNotes') }}</span>
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="editingNotes"
            auto-grow
            :label="$i18n('feedback.admin.adminNotesLabel')"
            :placeholder="$i18n('feedback.admin.adminNotesPlaceholder')"
            rows="5"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="closeNotesDialog"
          >
            {{ $i18n('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :loading="savingNotes"
            variant="elevated"
            @click="saveNotes"
          >
            {{ $i18n('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ $i18n('feedback.admin.confirmDelete') }}</span>
        </v-card-title>
        <v-card-text>
          <p>{{ $i18n('feedback.admin.deleteWarning') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="deleteDialog = false"
          >
            {{ $i18n('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            :loading="deleting"
            variant="elevated"
            @click="deleteFeedback"
          >
            {{ $i18n('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { FeedbackRepository } from '@/repositories/FeedbackRepository'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'


  // Get i18n function from vue-banana-i18n
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()
  const feedbackRepository = new FeedbackRepository()

  // State
  const loading = ref(false)
  const error = ref(null)
  const feedback = ref([])
  const parents = ref([])
  const searchText = ref('')
  const statusFilter = ref('all')
  const expanded = ref([])

  // Authorization
  const isAuthorized = ref(false)

  // Notes dialog
  const notesDialog = ref(false)
  const editingFeedback = ref(null)
  const editingNotes = ref('')
  const savingNotes = ref(false)

  // Delete dialog
  const deleteDialog = ref(false)
  const feedbackToDelete = ref(null)
  const deleting = ref(false)

  // Check admin status using custom claims
  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }

    try {
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      const isAdmin = !!idTokenResult.claims.admin
      isAuthorized.value = isAdmin
    } catch (error) {
      console.error('Failed to check admin status:', error)
      isAuthorized.value = false
    }
  }

  // Status filter options
  const statusFilterOptions = computed(() => [
    { title: $i18n('feedback.admin.allFeedback'), value: 'all' },
    { title: $i18n('feedback.admin.pendingOnly'), value: 'pending' },
    { title: $i18n('feedback.admin.resolvedOnly'), value: 'resolved' },
  ])

  // Table headers
  const tableHeaders = computed(() => [
    {
      title: $i18n('feedback.admin.date'),
      align: 'start',
      sortable: true,
      key: 'createdAt',
      width: '140px',
    },
    {
      title: $i18n('feedback.admin.parent'),
      align: 'start',
      sortable: false,
      key: 'parent_id',
      width: '200px',
    },
    {
      title: $i18n('feedback.admin.message'),
      align: 'start',
      sortable: false,
      key: 'message',
    },
    {
      title: $i18n('feedback.admin.status'),
      align: 'center',
      sortable: true,
      key: 'status',
      width: '120px',
    },
    {
      title: $i18n('common.actions'),
      align: 'center',
      sortable: false,
      key: 'actions',
      width: '150px',
    },
  ])

  // Computed stats
  const stats = computed(() => {
    const total = feedback.value.length
    const pending = feedback.value.filter(f => f.status === 'pending').length
    const resolved = feedback.value.filter(f => f.status === 'resolved').length

    return { total, pending, resolved }
  })

  // Filtered feedback based on search and status
  const filteredFeedback = computed(() => {
    let filtered = feedback.value

    // Filter by status
    if (statusFilter.value !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter.value)
    }

    return filtered
  })

  // Helper functions
  function getParentName (parentId) {
    const parent = parents.value.find(p => p.id === parentId)
    return parent ? parent.fullName : $i18n('feedback.admin.unknownParent')
  }

  function getParentEmail (parentId) {
    const parent = parents.value.find(p => p.id === parentId)
    return parent?.email || ''
  }

  function formatDate (date) {
    if (!date) return ''
    const dateObj = date.toDate ? date.toDate() : new Date(date)
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString()
  }

  // Toggle feedback status
  async function toggleStatus (item) {
    try {
      item._updating = true
      const newStatus = item.status === 'pending' ? 'resolved' : 'pending'
      await feedbackRepository.updateStatus(item.id, newStatus)
      item.status = newStatus
    } catch (error) {
      console.error('Error updating feedback status:', error)
      this.error = $i18n('feedback.admin.error.updateFailed')
    } finally {
      item._updating = false
    }
  }

  // Open notes dialog
  function openNotesDialog (item) {
    editingFeedback.value = item
    editingNotes.value = item.admin_notes || ''
    notesDialog.value = true
  }

  // Close notes dialog
  function closeNotesDialog () {
    notesDialog.value = false
    editingFeedback.value = null
    editingNotes.value = ''
  }

  // Save admin notes
  async function saveNotes () {
    if (!editingFeedback.value) return

    try {
      savingNotes.value = true
      await feedbackRepository.addAdminNote(editingFeedback.value.id, editingNotes.value)
      editingFeedback.value.admin_notes = editingNotes.value
      closeNotesDialog()
    } catch (error) {
      console.error('Error saving admin notes:', error)
      this.error = $i18n('feedback.admin.error.saveFailed')
    } finally {
      savingNotes.value = false
    }
  }

  // Confirm delete
  function confirmDelete (item) {
    feedbackToDelete.value = item
    deleteDialog.value = true
  }

  // Delete feedback
  async function deleteFeedback () {
    if (!feedbackToDelete.value) return

    try {
      deleting.value = true
      await feedbackRepository.delete(feedbackToDelete.value.id)
      feedback.value = feedback.value.filter(f => f.id !== feedbackToDelete.value.id)
      deleteDialog.value = false
      feedbackToDelete.value = null
    } catch (error) {
      console.error('Error deleting feedback:', error)
      this.error = $i18n('feedback.admin.error.deleteFailed')
    } finally {
      deleting.value = false
    }
  }

  // Load data
  async function loadData () {
    try {
      loading.value = true
      error.value = null

      // Load parents and feedback
      await firebaseStore.loadParentsDTO()
      parents.value = firebaseStore.parentsDTO

      const feedbackData = await feedbackRepository.getAll()
      feedback.value = feedbackData
    } catch (error_) {
      console.error('Error loading feedback data:', error_)
      error.value = error_.message || 'Failed to load feedback data'
    } finally {
      loading.value = false
    }
  }

  // Initialize
  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await loadData()
    }
  })
</script>

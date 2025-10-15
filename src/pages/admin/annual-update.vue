<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <v-btn
          class="mb-2"
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="$router.push('/admin')"
        >
          {{ $t('admin.backToAdminDashboard') }}
        </v-btn>
        <h1 class="text-h3 font-weight-bold">{{ $t('admin.annualUpdateWorkflow') }}</h1>
      </div>
    </div>

    <!-- Overall Status at Top -->
    <v-card class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-sync</v-icon>
        {{ $t('admin.overallStatus') }}
      </v-card-title>

      <v-card-text>
        <!-- Current Workflow Status -->
        <div v-if="currentWorkflow" class="mb-4">
          <v-alert
            :text="getWorkflowStatusMessage(currentWorkflow)"
            :title="$t('admin.currentWorkflow')"
            :type="getWorkflowStatusType(currentWorkflow.status)"
          />

          <!-- Workflow Stats -->
          <v-row class="mt-4">
            <v-col cols="12" md="3" sm="6">
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold text-primary">
                    {{ currentWorkflow.stats?.totalParents || 0 }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.totalParents') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="3" sm="6">
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold text-info">
                    {{ currentWorkflow.stats?.emailsSent || 0 }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.emailsSent') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="3" sm="6">
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold text-success">
                    {{ currentWorkflow.stats?.formsSubmitted || 0 }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.formsSubmitted') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="3" sm="6">
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold text-warning">
                    {{ currentWorkflow.stats?.optedOut || 0 }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.optedOut') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Action Buttons -->
          <div class="text-center mt-6">
            <div class="d-flex flex-column flex-sm-row gap-4 justify-center">
              <!-- Start New Workflow Button -->
              <v-btn
                color="primary"
                :disabled="loading || (currentWorkflow && currentWorkflow.status === 'active')"
                :loading="loading"
                prepend-icon="mdi-rocket-launch"
                size="large"
                @click="showStartWorkflowDialog = true"
              >
                {{ currentWorkflow && currentWorkflow.status === 'active'
                  ? $t('admin.workflowInProgress')
                  : $t('admin.startAnnualUpdate') }}
              </v-btn>
            </div>
          </div>
        </div>

        <!-- No Current Workflow -->
        <div v-else class="text-center py-8">
          <v-icon color="grey-darken-2" size="48">mdi-calendar-question</v-icon>
          <p class="text-h6 mt-2 text-grey-darken-2">
            {{ $t('admin.noActiveWorkflow') }}
          </p>

          <!-- Action Buttons for No Workflow -->
          <div class="mt-6">
            <v-btn
              color="primary"
              :disabled="loading"
              :loading="loading"
              prepend-icon="mdi-rocket-launch"
              size="large"
              @click="showStartWorkflowDialog = true"
            >
              {{ $t('admin.startAnnualUpdate') }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Parents Management Table -->
    <v-card v-if="currentWorkflow && currentWorkflow.status === 'active'">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-account-group</v-icon>
        {{ $t('admin.parentsManagement') }}
      </v-card-title>

      <v-card-text>
        <!-- Column Filters -->
        <div class="d-flex flex-column flex-lg-row gap-3 mb-4">
          <!-- Name Filter -->
          <v-text-field
            v-model="nameFilter"
            class="flex-grow-1"
            clearable
            density="compact"
            label="Filter by Name"
            placeholder="e.g., connor"
            prepend-inner-icon="mdi-account-search"
            variant="outlined"
          />

          <!-- Email Status Filter -->
          <v-select
            v-model="emailStatusFilter"
            class="flex-shrink-0"
            clearable
            density="compact"
            :items="emailStatusFilterOptions"
            label="Email Status"
            style="min-width: 140px;"
            variant="outlined"
          />

          <!-- Form Status Filter -->
          <v-select
            v-model="formStatusFilter"
            class="flex-shrink-0"
            clearable
            density="compact"
            :items="formStatusFilterOptions"
            label="Form Status"
            style="min-width: 140px;"
            variant="outlined"
          />

          <!-- Class Filter -->
          <v-select
            v-model="classFilter"
            class="flex-shrink-0"
            clearable
            density="compact"
            :items="classFilterOptions"
            label="Class"
            style="min-width: 140px;"
            variant="outlined"
          />

          <!-- Filter Actions -->
          <div class="d-flex flex-column gap-2">
            <div class="d-flex gap-2 align-center">
              <v-btn
                size="small"
                variant="outlined"
                @click="selectAllVisibleParents"
              >
                <v-icon start>mdi-check-all</v-icon>
                Select All Filtered
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                @click="clearAllFilters"
              >
                <v-icon start>mdi-filter-off</v-icon>
                Clear Filters
              </v-btn>
            </div>

            <!-- Filter Summary -->
            <div v-if="hasActiveFilters" class="text-caption text-grey-darken-1">
              {{ filteredAndSortedParents.length }} of {{ enrichedParents.length }} parents shown
            </div>

            <!-- Simulation Mode Indicator -->
            <div v-if="isDevelopment" class="d-flex align-center">
              <v-chip
                color="orange"
                prepend-icon="mdi-flask"
                size="small"
                variant="tonal"
              >
                🧪 SIMULATION MODE - No real emails will be sent
              </v-chip>
            </div>
          </div>
        </div>

        <!-- Data Table -->
        <v-data-table
          v-model="selectedParentRows"
          class="elevation-1"
          :headers="parentTableHeaders"
          :items="filteredAndSortedParents"
          :items-per-page="25"
          :items-per-page-options="[10, 25, 50, 100, 200, 300]"
          :loading="loading || sendingEmails"
          return-object
          select-strategy="page"
          show-select
          @update:options="updateTableOptions"
        >
          <!-- Name Column -->
          <template #item.name="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.firstName }} {{ item.lastName }}</div>
              <div class="text-caption text-grey-darken-1">{{ item.email }}</div>
            </div>
          </template>

          <!-- Classes Column -->
          <template #item.classes="{ item }">
            <div v-if="item.classes && item.classes.length > 0" class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="className in item.classes"
                :key="className"
                color="primary"
                size="small"
                variant="tonal"
              >
                {{ className }}
              </v-chip>
            </div>
            <div v-else class="text-caption text-grey-darken-1">
              No classes
            </div>
          </template>

          <!-- Email Status Column -->
          <template #item.emailStatus="{ item }">
            <div class="d-flex flex-column gap-1">
              <v-chip
                :color="getEmailStatusColor(item.emailStatus)"
                size="small"
                variant="tonal"
              >
                <v-icon size="16" start>{{ getEmailStatusIcon(item.emailStatus) }}</v-icon>
                {{ getEmailStatusText(item.emailStatus) }}
              </v-chip>
              <div
                v-if="item.emailSentAt"
                class="text-caption text-grey-darken-2"
              >
                {{ formatEmailDate(item.emailSentAt) }}
              </div>
            </div>
          </template>

          <!-- Form Status Column -->
          <template #item.formStatus="{ item }">
            <v-chip
              :color="getFormStatusColor(item.formStatus)"
              size="small"
              variant="tonal"
            >
              <v-icon size="16" start>{{ getFormStatusIcon(item.formStatus) }}</v-icon>
              {{ getFormStatusText(item.formStatus) }}
            </v-chip>
          </template>

          <!-- Last Updated Column -->
          <template #item.lastUpdated="{ item }">
            <div class="text-body-2">
              {{ item.lastUpdated ? formatEmailDate(item.lastUpdated) : '—' }}
            </div>
          </template>

          <!-- Update Link Column -->
          <template #item.updateLink="{ item }">
            <div v-if="item.token" class="d-flex flex-column gap-1">
              <v-btn
                color="primary"
                density="compact"
                prepend-icon="mdi-link"
                size="small"
                variant="tonal"
                @click="openUpdateLink(item.token)"
              >
                Open Link
              </v-btn>
              <v-btn
                color="grey"
                density="compact"
                prepend-icon="mdi-content-copy"
                size="x-small"
                variant="text"
                @click="copyUpdateLink(item.token)"
              >
                Copy
              </v-btn>
            </div>
            <div v-else class="text-caption text-grey-darken-1">
              No token
            </div>
          </template>

        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Selected Parents List -->
    <v-card v-if="selectedParentRows.length > 0" class="mt-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-email-multiple</v-icon>
          Selected Parents ({{ selectedParentRows.length }})
        </div>
        <div v-if="sendingEmails" class="d-flex align-center gap-2">
          <span class="text-body-2">{{ emailProgress.current }}/{{ emailProgress.total }}</span>
          <v-progress-circular
            v-if="!emailProgress.isPaused"
            color="primary"
            :model-value="(emailProgress.current / emailProgress.total) * 100"
            :size="20"
            :width="3"
          />
        </div>
      </v-card-title>

      <!-- Progress Bar -->
      <div v-if="sendingEmails" class="px-4 pb-2">
        <v-progress-linear
          :color="emailProgress.error ? 'error' : 'primary'"
          height="6"
          :model-value="(emailProgress.current / emailProgress.total) * 100"
          rounded
        />
        <div class="text-caption text-grey-darken-1 mt-1">
          {{ emailProgress.error ? 'Paused due to error' :
            emailProgress.isPaused ? 'Paused' :
            emailProgress.currentEmail ? `Sending to ${emailProgress.currentEmail}` : 'Processing...' }}
        </div>
      </div>

      <v-card-text>
        <!-- Email Controls -->
        <div class="d-flex gap-2 mb-4 align-center flex-wrap">
          <v-btn
            v-if="!sendingEmails && !emailProgress.isPaused"
            color="primary"
            @click="sendSelectedEmails"
          >
            <v-icon start>mdi-email-send</v-icon>
            Send All Emails
          </v-btn>

          <v-btn
            v-if="sendingEmails && !emailProgress.isPaused"
            color="warning"
            @click="pauseEmailSending"
          >
            <v-icon start>mdi-pause</v-icon>
            Pause
          </v-btn>

          <v-btn
            v-if="emailProgress.isPaused && emailProgress.error"
            color="success"
            @click="resumeEmailSending"
          >
            <v-icon start>mdi-play</v-icon>
            Resume
          </v-btn>

          <v-btn
            v-if="emailProgress.isPaused || sendingEmails"
            color="grey"
            variant="outlined"
            @click="resetEmailProgress"
          >
            <v-icon start>mdi-stop</v-icon>
            Stop
          </v-btn>

          <v-btn
            v-if="!sendingEmails"
            color="grey"
            variant="outlined"
            @click="clearSelection"
          >
            <v-icon start>mdi-close</v-icon>
            Clear Selection
          </v-btn>
        </div>

        <!-- Error Display -->
        <v-alert
          v-if="emailProgress.error"
          class="mb-4"
          color="error"
          icon="mdi-alert-circle"
          variant="tonal"
        >
          <div class="text-body-1 font-weight-medium mb-2">
            Failed to send email {{ emailProgress.error.index }}/{{ emailProgress.error.total }}
          </div>
          <div class="text-body-2 mb-2">
            <strong>Email:</strong> {{ emailProgress.error.parentEmail }}
          </div>
          <div class="text-body-2">
            <strong>Error:</strong> {{ emailProgress.error.message }}
          </div>
        </v-alert>

        <!-- Selected Parents Cards -->
        <div class="d-flex flex-column gap-2">
          <v-card
            v-for="parent in selectedParentRows"
            :key="parent.id"
            class="parent-card"
            :color="getParentCardColor(parent)"
            variant="outlined"
          >
            <v-card-text class="d-flex align-center justify-space-between py-3">
              <div class="d-flex flex-column">
                <div class="font-weight-medium">
                  {{ parent.firstName }} {{ parent.lastName }}
                </div>
                <div class="text-caption text-grey-darken-1">
                  {{ parent.email }}
                </div>
              </div>

              <div class="d-flex align-center gap-3">
                <!-- Status Display -->
                <div class="text-center">
                  <v-chip
                    :color="getParentStatusColor(parent)"
                    size="small"
                    variant="tonal"
                  >
                    <v-icon size="16" start>{{ getParentStatusIcon(parent) }}</v-icon>
                    {{ getParentStatusText(parent) }}
                  </v-chip>
                  <div v-if="parent.emailSentAt" class="text-caption text-grey-darken-2 mt-1">
                    {{ formatEmailDate(parent.emailSentAt) }}
                  </div>
                </div>

                <!-- Remove Button -->
                <v-btn
                  v-if="!sendingEmails"
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  @click="removeFromSelection(parent)"
                />

                <!-- Loading Indicator -->
                <v-progress-circular
                  v-if="isParentBeingProcessed(parent)"
                  color="primary"
                  indeterminate
                  :size="20"
                  :width="3"
                />
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>
    </v-card>

    <!-- Recent Workflows History (only show if no active workflow) -->
    <v-card v-if="!currentWorkflow || currentWorkflow.status !== 'active'">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-history</v-icon>
        {{ $t('admin.workflowHistory') }}
      </v-card-title>

      <v-card-text>
        <div v-if="workflowHistory.length === 0" class="text-center py-4">
          <p class="text-body-1 text-grey-darken-1">
            {{ $t('admin.noWorkflowHistory') }}
          </p>
        </div>

        <v-list v-else>
          <v-list-item
            v-for="workflow in workflowHistory"
            :key="workflow.id"
          >
            <template #prepend>
              <v-icon :color="getWorkflowStatusColor(workflow.status)">
                {{ getWorkflowStatusIcon(workflow.status) }}
              </v-icon>
            </template>

            <v-list-item-title>
              {{ workflow.schoolYear }}
            </v-list-item-title>

            <v-list-item-subtitle>
              {{ formatDate(workflow.startedAt) }} -
              {{ workflow.stats?.formsSubmitted || 0 }}/{{ workflow.stats?.totalParents || 0 }} completed
            </v-list-item-subtitle>

            <template #append>
              <v-chip
                :color="getWorkflowStatusColor(workflow.status)"
                size="small"
                variant="tonal"
              >
                {{ $t(`admin.status.${workflow.status}`) }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Start Workflow Confirmation Dialog -->
    <v-dialog v-model="showStartWorkflowDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-alert</v-icon>
          {{ $t('admin.confirmStartWorkflow') }}
        </v-card-title>

        <v-card-text>
          <p class="mb-4">{{ $t('admin.startWorkflowWarning') }}</p>

          <v-alert
            class="mb-4"
            color="info"
            icon="mdi-information"
            variant="tonal"
          >
            <div class="text-body-2">
              <strong>{{ $t('admin.thisWillDo') }}:</strong>
              <ul class="mt-2 ml-4">
                <li>{{ $t('admin.generateTokens') }}</li>
                <li>{{ $t('admin.createWorkflowSession') }}</li>
              </ul>
            </div>
          </v-alert>

          <v-alert
            class="mb-4"
            color="warning"
            icon="mdi-alert"
            variant="tonal"
          >
            <div class="text-body-2">
              <strong>{{ $t('admin.important') }}:</strong>
              {{ $t('admin.emailsSentSeparately') }}
            </div>
          </v-alert>

          <!-- Admin Confirmation -->
          <v-text-field
            v-model="confirmationText"
            class="mt-4"
            :label="$t('admin.confirmationType')"
            :placeholder="$t('admin.confirmationPlaceholder')"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showStartWorkflowDialog = false"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :disabled="confirmationText.toLowerCase() !== 'confirm'"
            :loading="loading"
            @click="startWorkflow"
          >
            {{ $t('admin.startWorkflow') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const { t } = useI18n()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // Development mode detection
  const isDevelopment = computed(() => {
    return import.meta.env.DEV || window.location.hostname === 'localhost'
  })

  // Filter state helpers
  const hasActiveFilters = computed(() => {
    return nameFilter.value || emailStatusFilter.value || formStatusFilter.value || classFilter.value
  })

  // Parent-to-classes lookup
  const parentClassesLookup = computed(() => {
    const lookup = new Map()

    for (const student of students.value) {
      const parentEmails = [student.parent1_email, student.parent2_email].filter(Boolean)

      for (const email of parentEmails) {
        if (!lookup.has(email)) {
          lookup.set(email, new Set())
        }
        if (student.className) {
          lookup.get(email).add(student.className)
        }
      }
    }

    // Convert Sets to sorted Arrays
    const result = new Map()
    for (const [email, classesSet] of lookup) {
      result.set(email, Array.from(classesSet).sort())
    }

    return result
  })

  // State
  const loading = ref(false)
  const sendingEmails = ref(false)
  const emailProgress = ref({ current: 0, total: 0, currentEmail: '', isPaused: false, error: null, parentStatuses: new Map() })
  const error = ref(null)
  const showStartWorkflowDialog = ref(false)
  const confirmationText = ref('')
  const currentWorkflow = ref(null)
  const workflowHistory = ref([])

  // Parent management state
  const parents = ref([])
  const students = ref([])
  const selectedParentRows = ref([])
  const nameFilter = ref('')
  const emailStatusFilter = ref(null)
  const formStatusFilter = ref(null)
  const classFilter = ref(null)
  const tableOptions = ref({
    sortBy: [],
    sortDesc: [],
  })

  // Table configuration
  const parentTableHeaders = [
    { title: 'Name', key: 'name', sortable: true },
    { title: 'Classes', key: 'classes', sortable: true },
    { title: 'Email Status', key: 'emailStatus', sortable: true },
    { title: 'Form Status', key: 'formStatus', sortable: true },
    { title: 'Last Updated', key: 'lastUpdated', sortable: true },
    { title: 'Update Link', key: 'updateLink', sortable: false, width: 200 },
  ]

  const emailStatusFilterOptions = [
    { title: 'All', value: null },
    { title: 'Not Sent', value: 'not_sent' },
    { title: 'Sent', value: 'sent' },
  ]

  const formStatusFilterOptions = [
    { title: 'All', value: null },
    { title: 'Pending', value: 'pending' },
    { title: 'Submitted', value: 'submitted' },
    { title: 'Opted Out', value: 'opted_out' },
  ]

  // Dynamic class filter options based on loaded student data
  const classFilterOptions = computed(() => {
    const classes = new Set()
    for (const student of students.value) {
      if (student.className) {
        classes.add(student.className)
      }
    }
    const sortedClasses = Array.from(classes).sort()
    return [
      { title: 'All', value: null },
      ...sortedClasses.map(className => ({ title: className, value: className })),
    ]
  })

  // Workflow status helpers
  const getWorkflowStatusType = status => {
    switch (status) {
      case 'pending': { return 'warning'
      }
      case 'active': { return 'info'
      }
      case 'completed': { return 'success'
      }
      default: { return 'info'
      }
    }
  }

  const getWorkflowStatusColor = status => {
    switch (status) {
      case 'pending': { return 'warning'
      }
      case 'active': { return 'info'
      }
      case 'completed': { return 'success'
      }
      default: { return 'grey'
      }
    }
  }

  const getWorkflowStatusIcon = status => {
    switch (status) {
      case 'pending': { return 'mdi-clock-outline'
      }
      case 'active': { return 'mdi-play-circle'
      }
      case 'completed': { return 'mdi-check-circle'
      }
      default: { return 'mdi-help-circle'
      }
    }
  }

  const getWorkflowStatusMessage = workflow => {
    const totalParents = workflow.stats?.totalParents || 0
    const formsSubmitted = workflow.stats?.formsSubmitted || 0
    const completionRate = totalParents > 0
      ? Math.round((formsSubmitted / totalParents) * 100)
      : 0

    return t('admin.workflowProgress', {
      schoolYear: workflow.schoolYear,
      completed: formsSubmitted,
      total: totalParents,
      percentage: completionRate,
    })
  }

  const formatDate = timestamp => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  // Enhanced parent data with status information from subcollection
  const enrichedParents = computed(() => {
    // Now that participants are returned from the API, use them directly
    if (!currentWorkflow.value?.participants || !Array.isArray(currentWorkflow.value.participants)) return []

    return currentWorkflow.value.participants.map(participant => {
      // Try to find the parent in the parents collection for additional info
      const parentInfo = parents.value.find(p => p.email === participant.email) || {}

      const parentClasses = parentClassesLookup.value.get(participant.email) || []

      return {
        id: parentInfo.id || participant.email, // Use email as fallback ID
        email: participant.email,
        firstName: parentInfo.firstName || parentInfo.first_name || '',
        lastName: parentInfo.lastName || parentInfo.last_name || '',
        classes: parentClasses,
        classesText: parentClasses.join(', ') || 'No classes',
        emailSent: participant.emailSent || false,
        emailSentAt: participant.emailSentAt,
        formSubmitted: participant.formSubmitted || false,
        submittedAt: participant.submittedAt,
        token: participant.token, // Add token for update links
        optedOut: participant.optedOut || false,
        emailStatus: participant.emailSent ? 'sent' : 'not_sent',
        formStatus: participant.formSubmitted
          ? 'submitted'
          : (participant.optedOut ? 'opted_out' : 'pending'),
        lastUpdated: participant.submittedAt || participant.emailSentAt,
      }
    })
  })

  // Filtered and sorted parents for the table
  const filteredAndSortedParents = computed(() => {
    let filtered = enrichedParents.value

    // Apply name filter
    if (nameFilter.value) {
      const searchTerm = nameFilter.value.toLowerCase()
      filtered = filtered.filter(parent =>
        `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(searchTerm)
        || parent.email.toLowerCase().includes(searchTerm),
      )
    }

    // Apply email status filter
    if (emailStatusFilter.value) {
      switch (emailStatusFilter.value) {
        case 'not_sent': {
          filtered = filtered.filter(parent => !parent.emailSent)
          break
        }
        case 'sent': {
          filtered = filtered.filter(parent => parent.emailSent)
          break
        }
      }
    }

    // Apply form status filter
    if (formStatusFilter.value) {
      switch (formStatusFilter.value) {
        case 'pending': {
          filtered = filtered.filter(parent => !parent.formSubmitted && !parent.optedOut)
          break
        }
        case 'submitted': {
          filtered = filtered.filter(parent => parent.formSubmitted)
          break
        }
        case 'opted_out': {
          filtered = filtered.filter(parent => parent.optedOut)
          break
        }
      }
    }

    // Apply class filter
    if (classFilter.value) {
      filtered = filtered.filter(parent =>
        parent.classes && parent.classes.includes(classFilter.value),
      )
    }

    return filtered
  })

  // Email status helpers
  const getEmailStatusColor = status => {
    switch (status) {
      case 'sent': { return 'success'
      }
      case 'not_sent': { return 'grey'
      }
      default: { return 'grey'
      }
    }
  }

  const getEmailStatusIcon = status => {
    switch (status) {
      case 'sent': { return 'mdi-email-check'
      }
      case 'not_sent': { return 'mdi-email-off'
      }
      default: { return 'mdi-email-off'
      }
    }
  }

  const getEmailStatusText = status => {
    switch (status) {
      case 'sent': { return t('admin.emailSent')
      }
      case 'not_sent': { return t('admin.emailNotSent')
      }
      default: { return t('admin.emailNotSent')
      }
    }
  }

  // Form status helpers
  const getFormStatusColor = status => {
    switch (status) {
      case 'submitted': { return 'success'
      }
      case 'opted_out': { return 'warning'
      }
      case 'pending': { return 'grey'
      }
      default: { return 'grey'
      }
    }
  }

  const getFormStatusIcon = status => {
    switch (status) {
      case 'submitted': { return 'mdi-check-circle'
      }
      case 'opted_out': { return 'mdi-cancel'
      }
      case 'pending': { return 'mdi-clock-outline'
      }
      default: { return 'mdi-clock-outline'
      }
    }
  }

  const getFormStatusText = status => {
    switch (status) {
      case 'submitted': { return t('admin.formSubmitted')
      }
      case 'opted_out': { return t('admin.optedOut')
      }
      case 'pending': { return t('admin.pending')
      }
      default: { return t('admin.pending')
      }
    }
  }

  const formatEmailDate = timestamp => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Selected parents list helpers
  const removeFromSelection = parent => {
    const index = selectedParentRows.value.findIndex(p => p.email === parent.email)
    if (index !== -1) {
      selectedParentRows.value.splice(index, 1)
    }
  }

  const isParentBeingProcessed = parent => {
    return emailProgress.value.parentStatuses.get(parent.email) === 'sending'
  }

  const getParentCardColor = parent => {
    const status = emailProgress.value.parentStatuses.get(parent.email)
    if (status === 'sending') return 'primary'
    if (status === 'sent' || parent.emailSent) return 'success'
    if (status === 'failed') return 'error'
    return ''
  }

  const getParentStatusColor = parent => {
    const status = emailProgress.value.parentStatuses.get(parent.email)
    if (status === 'sending') return 'primary'
    if (status === 'sent' || parent.emailSent) return 'success'
    if (status === 'failed') return 'error'
    if (status === 'pending') return 'grey'
    return getEmailStatusColor(parent.emailStatus)
  }

  const getParentStatusIcon = parent => {
    const status = emailProgress.value.parentStatuses.get(parent.email)
    if (status === 'sending') return 'mdi-loading'
    if (status === 'sent' || parent.emailSent) return 'mdi-check-circle'
    if (status === 'failed') return 'mdi-alert-circle'
    if (status === 'pending') return 'mdi-clock-outline'
    return getEmailStatusIcon(parent.emailStatus)
  }

  const getParentStatusText = parent => {
    const status = emailProgress.value.parentStatuses.get(parent.email)
    if (status === 'sending') return 'Sending...'
    if (status === 'sent') return 'Just sent'
    if (status === 'failed') return 'Failed'
    if (status === 'pending') return 'Pending'
    return getEmailStatusText(parent.emailStatus)
  }

  // Table functions
  const updateTableOptions = options => {
    tableOptions.value = options
  }

  const selectAllVisibleParents = () => {
    selectedParentRows.value = [...filteredAndSortedParents.value]
  }

  const clearSelection = () => {
    selectedParentRows.value = []
  }

  const clearAllFilters = () => {
    nameFilter.value = ''
    emailStatusFilter.value = null
    formStatusFilter.value = null
    classFilter.value = null
  }

  // Update link functions
  const openUpdateLink = token => {
    if (!token) return
    const baseUrl = window.location.origin
    const updateUrl = `${baseUrl}/update/${token}`
    window.open(updateUrl, '_blank')
  }

  const copyUpdateLink = async token => {
    if (!token) return
    const baseUrl = window.location.origin
    const updateUrl = `${baseUrl}/update/${token}`

    try {
      await navigator.clipboard.writeText(updateUrl)
      // You could add a toast notification here if available
      console.log('Update link copied to clipboard:', updateUrl)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = updateUrl
      document.body.append(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      console.log('Update link copied to clipboard (fallback):', updateUrl)
    }
  }

  // Email sending functions
  const sendEmailToParent = async parent => {
    if (!currentWorkflow.value) return

    try {
      sendingEmails.value = true
      await sendEmailsToParents([parent.email])
      await loadWorkflowData()
    } catch (error) {
      console.error('Failed to send email to parent:', error)
    } finally {
      sendingEmails.value = false
    }
  }

  const resendEmailToParent = async parent => {
    await sendEmailToParent(parent)
  }

  // Start a new annual update workflow
  const startWorkflow = async () => {
    try {
      loading.value = true
      error.value = null

      // Generate current school year
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      // School year starts in September (month 8)
      const schoolYear = currentMonth >= 8
        ? `${currentYear}-${currentYear + 1}`
        : `${currentYear - 1}-${currentYear}`

      // Call Firebase Function to start the workflow
      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/startAnnualUpdateV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          schoolYear,
          adminEmail: authStore.userEmail,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('startAnnualUpdate error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const result = await response.json()
      console.log('startAnnualUpdate response:', result)

      // Refresh workflow data
      await loadWorkflowData()

      showStartWorkflowDialog.value = false
      confirmationText.value = '' // Reset confirmation
    } catch (error_) {
      console.error('Failed to start workflow:', error_)
      error.value = error_.message
    } finally {
      loading.value = false
    }
  }

  // Load parents data
  const loadParents = async () => {
    try {
      // Load parents from the store (it handles caching and loading from Firestore)
      await firebaseStore.loadParentsDTO()

      // Map the store data to our local format
      if (firebaseStore.parentsDTO && Array.isArray(firebaseStore.parentsDTO)) {
        parents.value = firebaseStore.parentsDTO.map(parent => ({
          id: parent.id,
          ...parent,
          firstName: parent.first_name || '',
          lastName: parent.last_name || '',
          email: parent.email || '',
        }))
      } else {
        console.warn('Parents data is not available or not an array:', firebaseStore.parentsDTO)
        parents.value = []
      }
    } catch (error_) {
      console.error('Failed to load parents:', error_)
    }
  }

  // Load students data for class information
  const loadStudents = async () => {
    try {
      // Load students from the store (it handles caching and loading from Firestore)
      await firebaseStore.loadStudentsDTO()

      // Map the store data to our local format
      if (firebaseStore.studentsDTO && Array.isArray(firebaseStore.studentsDTO)) {
        students.value = firebaseStore.studentsDTO.map(student => ({
          id: student.id,
          ...student,
        }))
      } else {
        console.warn('Students data is not available or not an array:', firebaseStore.studentsDTO)
        students.value = []
      }
    } catch (error_) {
      console.error('Failed to load students:', error_)
    }
  }

  // Load current workflow and history
  const loadWorkflowData = async () => {
    try {
      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/getWorkflowStatusV2`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await authStore.user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 ANNUAL UPDATE API DEBUG:')
      console.log('Full API response:', data)
      console.log('Current workflow:', data.current)
      console.log('Current workflow type:', data.current?.type)
      console.log('Current workflow status:', data.current?.status)
      console.log('Current workflow participants:', data.current?.participants?.length || 0)
      console.log('Current workflow stats:', data.current?.stats)
      console.log('History length:', data.history?.length || 0)

      if (!data.current) {
        console.log('❌ No current workflow found!')
        console.log('🔍 This means either:')
        console.log('  1. No annual update workflows exist')
        console.log('  2. Existing workflows are not marked as "active"')
        console.log('  3. You might be looking at production Firestore while app uses emulator')
        console.log('  4. The workflow type filter is too restrictive')
      }

      // Ensure stats exist with default values for current workflow
      if (data.current) {
        data.current.stats = data.current.stats || {
          totalParents: 0,
          emailsSent: 0,
          formsSubmitted: 0,
          accountsCreated: 0,
          optedOut: 0,
        }
      }

      // Ensure stats exist for all history items
      if (data.history && Array.isArray(data.history)) {
        for (const workflow of data.history) {
          workflow.stats = workflow.stats || {
            totalParents: 0,
            emailsSent: 0,
            formsSubmitted: 0,
            accountsCreated: 0,
            optedOut: 0,
          }
        }
      }

      currentWorkflow.value = data.current
      workflowHistory.value = data.history || []
    } catch (error_) {
      console.error('Failed to load workflow data:', error_)
    }
  }

  // Send single email to a parent
  const sendSingleEmail = async parentEmail => {
    const baseUrl = getFunctionsBaseUrl()

    const response = await fetch(`${baseUrl}/sendParentEmailV2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
      },
      body: JSON.stringify({
        workflowId: currentWorkflow.value.id,
        parentEmail,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`)
    }

    return result
  }

  // Send emails to selected parents sequentially
  const sendSelectedEmails = async () => {
    if (!currentWorkflow.value || selectedParentRows.value.length === 0) return

    try {
      sendingEmails.value = true
      error.value = null

      // Get selected parent emails
      const selectedEmails = selectedParentRows.value.map(parent => parent.email).filter(Boolean)

      // Initialize progress tracking
      emailProgress.value = {
        current: 0,
        total: selectedEmails.length,
        currentEmail: '',
        isPaused: false,
        error: null,
        parentStatuses: new Map(),
      }

      // Initialize all parent statuses
      for (const email of selectedEmails) {
        emailProgress.value.parentStatuses.set(email, 'pending')
      }

      // Update workflow with progress tracking
      await updateWorkflowProgress(0, selectedEmails.length, 'starting')

      // Send emails sequentially
      for (let i = 0; i < selectedEmails.length; i++) {
        if (emailProgress.value.isPaused) {
          console.log('Email sending paused by user')
          break
        }

        const parentEmail = selectedEmails[i]
        emailProgress.value.currentEmail = parentEmail
        emailProgress.value.current = i

        // Mark parent as being processed
        emailProgress.value.parentStatuses.set(parentEmail, 'sending')

        // Update workflow progress
        await updateWorkflowProgress(i, selectedEmails.length, 'in_progress', parentEmail)

        try {
          console.log(`Sending email ${i + 1}/${selectedEmails.length} to ${parentEmail}`)
          const result = await sendSingleEmail(parentEmail)

          // Mark parent as sent
          emailProgress.value.parentStatuses.set(parentEmail, 'sent')

          if (result.simulated) {
            console.log(`🧪 Successfully simulated email to ${parentEmail}`)
          } else {
            console.log(`📧 Successfully sent real email to ${parentEmail}`)
          }
        } catch (emailError) {
          console.error(`Failed to send email to ${parentEmail}:`, emailError)

          // Mark parent as failed
          emailProgress.value.parentStatuses.set(parentEmail, 'failed')

          // Pause on error and update progress
          emailProgress.value.error = {
            parentEmail,
            message: emailError.message,
            index: i + 1,
            total: selectedEmails.length,
          }
          emailProgress.value.isPaused = true

          await updateWorkflowProgress(i, selectedEmails.length, 'error', parentEmail, emailError.message)

          // Stop processing and let admin decide
          break
        }
      }

      // Final progress update
      if (!emailProgress.value.isPaused) {
        emailProgress.value.current = selectedEmails.length
        await updateWorkflowProgress(selectedEmails.length, selectedEmails.length, 'completed')
        console.log(`Email sending completed: ${selectedEmails.length} emails sent`)
        // Clear selection
        selectedParentRows.value = []
      }

      // Refresh data to show updated status
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to send emails:', error_)
      error.value = error_.message
      emailProgress.value.error = {
        message: error_.message,
        general: true,
      }
    } finally {
      sendingEmails.value = false
    }
  }

  // Update workflow progress in Firestore
  const updateWorkflowProgress = async (current, total, status, currentEmail = null, errorMessage = null) => {
    try {
      const progressData = {
        current,
        total,
        status,
      }

      if (currentEmail) {
        progressData.currentEmail = currentEmail
      }

      if (errorMessage) {
        progressData.lastError = {
          message: errorMessage,
          email: currentEmail,
          timestamp: new Date().toISOString(),
        }
      }

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/updateWorkflowProgressV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
          progress: progressData,
        }),
      })

      if (!response.ok) {
        console.error('Failed to update workflow progress:', response.status)
      }
    } catch (error_) {
      console.error('Failed to update workflow progress:', error_)
    }
  }

  // Resume email sending after error
  const resumeEmailSending = () => {
    emailProgress.value.isPaused = false
    emailProgress.value.error = null
    sendSelectedEmails()
  }

  // Pause email sending
  const pauseEmailSending = () => {
    emailProgress.value.isPaused = true
  }

  // Reset email progress
  const resetEmailProgress = () => {
    emailProgress.value = { current: 0, total: 0, currentEmail: '', isPaused: false, error: null, parentStatuses: new Map() }
    sendingEmails.value = false
  }

  onMounted(async () => {
    await loadWorkflowData()
    await Promise.all([
      loadParents(),
      loadStudents(),
    ])
  })
</script>

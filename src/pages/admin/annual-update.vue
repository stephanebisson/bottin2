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
        <!-- Controls -->
        <div class="d-flex flex-column flex-md-row gap-4 mb-4">
          <!-- Search -->
          <v-text-field
            v-model="parentSearch"
            class="flex-grow-1"
            clearable
            density="compact"
            :label="$t('common.search')"
            :placeholder="$t('admin.searchParents')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />

          <!-- Status Filter -->
          <v-select
            v-model="statusFilter"
            class="flex-shrink-0"
            clearable
            density="compact"
            :items="statusFilterOptions"
            :label="$t('admin.filterByStatus')"
            style="min-width: 200px;"
            variant="outlined"
          />

          <!-- Bulk Actions -->
          <div class="d-flex gap-2">
            <v-btn
              color="primary"
              :disabled="selectedParentRows.length === 0 || sendingEmails"
              :loading="sendingEmails"
              size="small"
              @click="sendSelectedEmails"
            >
              <v-icon start>mdi-email-send</v-icon>
              {{ $t('admin.sendEmails') }} ({{ selectedParentRows.length }})
            </v-btn>
            <v-btn
              size="small"
              variant="outlined"
              @click="selectAllVisibleParents"
            >
              {{ $t('admin.selectAllVisible') }}
            </v-btn>
            <v-btn
              size="small"
              variant="outlined"
              @click="clearSelection"
            >
              {{ $t('admin.clearSelection') }}
            </v-btn>
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
          :loading="loading"
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

        </v-data-table>
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

  // State
  const loading = ref(false)
  const sendingEmails = ref(false)
  const error = ref(null)
  const showStartWorkflowDialog = ref(false)
  const confirmationText = ref('')
  const currentWorkflow = ref(null)
  const workflowHistory = ref([])

  // Parent management state
  const parents = ref([])
  const selectedParentRows = ref([])
  const parentSearch = ref('')
  const statusFilter = ref(null)
  const tableOptions = ref({
    sortBy: [],
    sortDesc: [],
  })

  // Table configuration
  const parentTableHeaders = [
    { title: 'Name', key: 'name', sortable: true },
    { title: 'Email Status', key: 'emailStatus', sortable: true },
    { title: 'Form Status', key: 'formStatus', sortable: true },
    { title: 'Last Updated', key: 'lastUpdated', sortable: true },
  ]

  const statusFilterOptions = [
    { title: 'All Parents', value: null },
    { title: 'Email Not Sent', value: 'email_not_sent' },
    { title: 'Email Sent', value: 'email_sent' },
    { title: 'Form Submitted', value: 'form_submitted' },
    { title: 'Opted Out', value: 'opted_out' },
  ]

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

      return {
        id: parentInfo.id || participant.email, // Use email as fallback ID
        email: participant.email,
        firstName: parentInfo.firstName || parentInfo.first_name || '',
        lastName: parentInfo.lastName || parentInfo.last_name || '',
        emailSent: participant.emailSent || false,
        emailSentAt: participant.emailSentAt,
        formSubmitted: participant.formSubmitted || false,
        submittedAt: participant.submittedAt,
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

    // Apply search filter
    if (parentSearch.value) {
      const searchTerm = parentSearch.value.toLowerCase()
      filtered = filtered.filter(parent =>
        `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(searchTerm)
        || parent.email.toLowerCase().includes(searchTerm),
      )
    }

    // Apply status filter
    if (statusFilter.value) {
      switch (statusFilter.value) {
        case 'email_not_sent': {
          filtered = filtered.filter(parent => !parent.emailSent)
          break
        }
        case 'email_sent': {
          filtered = filtered.filter(parent => parent.emailSent)
          break
        }
        case 'form_submitted': {
          filtered = filtered.filter(parent => parent.formSubmitted)
          break
        }
        case 'opted_out': {
          filtered = filtered.filter(parent => parent.optedOut)
          break
        }
      }
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

  const sendEmailsToParents = async emailList => {
    const baseUrl = getFunctionsBaseUrl()

    const response = await fetch(`${baseUrl}/sendUpdateEmailsToSelectedV2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
      },
      body: JSON.stringify({
        workflowId: currentWorkflow.value.id,
        parentEmails: emailList,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
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
      await firebaseStore.loadAllData()

      // Map the store data to our local format
      parents.value = firebaseStore.parents.map(parent => ({
        id: parent.id,
        ...parent,
        firstName: parent.first_name || '',
        lastName: parent.last_name || '',
        email: parent.email || '',
      }))
    } catch (error_) {
      console.error('Failed to load parents:', error_)
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
      console.log('Full API response:', data)
      console.log('Current workflow:', data.current)
      console.log('Current workflow stats:', data.current?.stats)

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

  // Send emails to selected parents
  const sendSelectedEmails = async () => {
    if (!currentWorkflow.value || selectedParentRows.value.length === 0) return

    try {
      sendingEmails.value = true
      error.value = null

      // Get selected parent emails
      const selectedEmails = selectedParentRows.value.map(parent => parent.email).filter(Boolean)

      await sendEmailsToParents(selectedEmails)
      console.log(`Emails sent successfully to ${selectedEmails.length} parents`)

      // Clear selection and refresh data
      selectedParentRows.value = []
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to send emails:', error_)
      error.value = error_.message
    } finally {
      sendingEmails.value = false
    }
  }

  onMounted(async () => {
    await loadWorkflowData()
    await loadParents()
  })
</script>

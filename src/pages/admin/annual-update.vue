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
          Back to Admin Dashboard
        </v-btn>
        <h1 class="text-h3 font-weight-bold">{{ $t('admin.annualUpdateWorkflow') }}</h1>
      </div>
    </div>

    <!-- Current Workflow Status -->
    <v-card class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-sync</v-icon>
        {{ $t('admin.currentWorkflowStatus') }}
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
                    {{ currentWorkflow.stats.totalParents }}
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
                    {{ currentWorkflow.stats.emailsSent }}
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
                    {{ currentWorkflow.stats.formsSubmitted }}
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
                    {{ currentWorkflow.stats.optedOut }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.optedOut') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- No Current Workflow -->
        <div v-else class="text-center py-8">
          <v-icon color="grey-darken-2" size="48">mdi-calendar-question</v-icon>
          <p class="text-h6 mt-2 text-grey-darken-2">
            {{ $t('admin.noActiveWorkflow') }}
          </p>
        </div>

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

            <!-- Manage Participants Button (only show if workflow is active) -->
            <v-btn
              v-if="currentWorkflow && currentWorkflow.status === 'active'"
              color="secondary"
              :disabled="loading"
              prepend-icon="mdi-account-group"
              size="large"
              @click="showParentSelectionDialog = true"
            >
              {{ $t('admin.manageParticipants') }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Recent Workflows History -->
    <v-card>
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
              {{ workflow.stats.formsSubmitted }}/{{ workflow.stats.totalParents }} completed
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

    <!-- Parent Selection Dialog -->
    <v-dialog v-model="showParentSelectionDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-account-group</v-icon>
            {{ $t('admin.manageParticipants') }}
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showParentSelectionDialog = false" />
        </v-card-title>

        <v-card-text>
          <!-- Selection Controls -->
          <div class="d-flex flex-column flex-sm-row gap-4 mb-4">
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

            <div class="d-flex gap-2">
              <v-btn
                size="small"
                variant="outlined"
                @click="selectAllParents"
              >
                {{ $t('admin.selectAll') }}
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                @click="selectNoneParents"
              >
                {{ $t('admin.selectNone') }}
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                @click="selectUnsent"
              >
                {{ $t('admin.selectUnsent') }}
              </v-btn>
            </div>
          </div>

          <!-- Parent List -->
          <div class="border rounded pa-4" style="max-height: 400px; overflow-y: auto;">
            <div v-if="filteredParents.length === 0" class="text-center py-8">
              <v-icon color="grey-darken-2" size="48">mdi-account-search</v-icon>
              <p class="text-body-1 text-grey-darken-2 mt-2">
                {{ parentSearch ? $t('admin.noParentsMatchSearch') : $t('admin.noParentsFound') }}
              </p>
            </div>

            <v-list v-else lines="two">
              <v-list-item
                v-for="parent in filteredParents"
                :key="parent.id"
              >
                <template #prepend>
                  <v-checkbox
                    color="primary"
                    :model-value="selectedParents.includes(parent.id)"
                    @update:model-value="toggleParentSelection(parent.id, $event)"
                  />
                </template>

                <v-list-item-title>
                  {{ parent.firstName }} {{ parent.lastName }}
                </v-list-item-title>

                <v-list-item-subtitle>
                  {{ parent.email }}
                </v-list-item-subtitle>

                <template #append>
                  <div class="d-flex flex-column align-end gap-1">
                    <!-- Email Status -->
                    <v-chip
                      v-if="getParentEmailStatus(parent.email).sent"
                      color="success"
                      size="small"
                      variant="tonal"
                    >
                      <v-icon size="16" start>mdi-email-check</v-icon>
                      {{ $t('admin.emailSent') }}
                    </v-chip>
                    <v-chip
                      v-else
                      color="grey"
                      size="small"
                      variant="tonal"
                    >
                      <v-icon size="16" start>mdi-email-off</v-icon>
                      {{ $t('admin.emailNotSent') }}
                    </v-chip>

                    <!-- Last Email Date -->
                    <div
                      v-if="getParentEmailStatus(parent.email).sent"
                      class="text-caption text-grey-darken-2"
                    >
                      {{ formatEmailDate(getParentEmailStatus(parent.email).sentAt) }}
                    </div>

                    <!-- Submission Status -->
                    <v-chip
                      v-if="getParentFormStatus(parent.email).submitted"
                      color="primary"
                      size="small"
                      variant="tonal"
                    >
                      <v-icon size="16" start>mdi-check-circle</v-icon>
                      {{ $t('admin.formSubmitted') }}
                    </v-chip>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <!-- Selection Summary -->
          <div class="mt-4 pa-4 bg-grey-lighten-4 rounded">
            <div class="d-flex justify-space-between align-center">
              <div>
                <strong>{{ selectedParents.length }}</strong> {{ $t('admin.parentsSelected') }}
                <span class="text-grey-darken-1 ml-2">
                  ({{ filteredParents.length }} {{ $t('admin.totalVisible') }})
                </span>
              </div>

              <div class="text-right">
                <div class="text-caption text-grey-darken-2">
                  {{ getSelectedEmailStats().sent }} {{ $t('admin.alreadySent') }} •
                  {{ getSelectedEmailStats().unsent }} {{ $t('admin.willBeSent') }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showParentSelectionDialog = false"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :disabled="selectedParents.length === 0 || sendingEmails"
            :loading="sendingEmails"
            @click="sendSelectedEmails"
          >
            {{ $t('admin.sendEmailsToSelected') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
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
  const showParentSelectionDialog = ref(false)
  const confirmationText = ref('')
  const currentWorkflow = ref(null)
  const workflowHistory = ref([])

  // Parent selection state
  const parents = ref([])
  const selectedParents = ref([])
  const parentSearch = ref('')

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
    const completionRate = workflow.stats.totalParents > 0
      ? Math.round((workflow.stats.formsSubmitted / workflow.stats.totalParents) * 100)
      : 0

    return t('admin.workflowProgress', {
      schoolYear: workflow.schoolYear,
      completed: workflow.stats.formsSubmitted,
      total: workflow.stats.totalParents,
      percentage: completionRate,
    })
  }

  const formatDate = timestamp => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  // Parent management computed properties
  const filteredParents = computed(() => {
    if (!parentSearch.value) return parents.value

    const searchTerm = parentSearch.value.toLowerCase()
    return parents.value.filter(parent =>
      `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(searchTerm)
      || parent.email.toLowerCase().includes(searchTerm),
    )
  })

  // Helper functions for parent status
  const getParentEmailStatus = email => {
    const participant = currentWorkflow.value?.participants?.[email]
    return {
      sent: !!participant?.emailSent,
      sentAt: participant?.emailSentAt,
    }
  }

  const getParentFormStatus = email => {
    const participant = currentWorkflow.value?.participants?.[email]
    return {
      submitted: !!participant?.formSubmitted,
      submittedAt: participant?.submittedAt,
    }
  }

  const formatEmailDate = timestamp => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getSelectedEmailStats = () => {
    const selectedParentEmails = selectedParents.value.map(id => {
      const parent = parents.value.find(p => p.id === id)
      return parent?.email
    }).filter(Boolean)

    const sent = selectedParentEmails.filter(email => getParentEmailStatus(email).sent).length
    const unsent = selectedParentEmails.length - sent

    return { sent, unsent }
  }

  // Parent selection functions
  const toggleParentSelection = (parentId, selected) => {
    if (selected) {
      if (!selectedParents.value.includes(parentId)) {
        selectedParents.value.push(parentId)
      }
    } else {
      const index = selectedParents.value.indexOf(parentId)
      if (index !== -1) {
        selectedParents.value.splice(index, 1)
      }
    }
  }

  const selectAllParents = () => {
    selectedParents.value = filteredParents.value.map(parent => parent.id)
  }

  const selectNoneParents = () => {
    selectedParents.value = []
  }

  const selectUnsent = () => {
    selectedParents.value = filteredParents.value
      .filter(parent => !getParentEmailStatus(parent.email).sent)
      .map(parent => parent.id)
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

      const response = await fetch(`${baseUrl}/startAnnualUpdate`, {
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

      const response = await fetch(`${baseUrl}/getWorkflowStatus`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await authStore.user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      currentWorkflow.value = data.current
      workflowHistory.value = data.history || []
    } catch (error_) {
      console.error('Failed to load workflow data:', error_)
    }
  }

  // Send emails to selected parents
  const sendSelectedEmails = async () => {
    if (!currentWorkflow.value || selectedParents.value.length === 0) return

    try {
      sendingEmails.value = true
      error.value = null

      // Get selected parent emails
      const selectedEmails = selectedParents.value.map(id => {
        const parent = parents.value.find(p => p.id === id)
        return parent?.email
      }).filter(Boolean)

      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/sendUpdateEmailsToSelected`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
          parentEmails: selectedEmails,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log(`Emails sent successfully to ${result.emailsSent} parents`)

      // Clear selection and refresh data
      selectedParents.value = []
      showParentSelectionDialog.value = false
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

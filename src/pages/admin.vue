<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('admin.title') }}</h1>
    </div>

    <!-- Access Control -->
    <div v-if="!isAuthorized" class="text-center py-12">
      <v-icon color="error" size="64">mdi-shield-alert</v-icon>
      <h2 class="text-h5 mt-4 text-error">{{ $t('admin.accessDenied') }}</h2>
      <p class="text-body-1 text-grey-darken-1 mt-2">
        {{ $t('admin.adminAccessRequired') }}
      </p>
    </div>

    <!-- Admin Controls -->
    <div v-else>
      <!-- Annual Update Workflow Section -->
      <v-card class="mb-6">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-calendar-sync</v-icon>
          {{ $t('admin.annualUpdateWorkflow') }}
        </v-card-title>
        
        <v-card-text>
          <!-- Current Workflow Status -->
          <div v-if="currentWorkflow" class="mb-4">
            <v-alert
              :type="getWorkflowStatusType(currentWorkflow.status)"
              :text="getWorkflowStatusMessage(currentWorkflow)"
              :title="$t('admin.currentWorkflow')"
            />
            
            <!-- Workflow Stats -->
            <v-row class="mt-4">
              <v-col cols="12" sm="6" md="3">
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
              
              <v-col cols="12" sm="6" md="3">
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
              
              <v-col cols="12" sm="6" md="3">
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
              
              <v-col cols="12" sm="6" md="3">
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
                :disabled="loading || (currentWorkflow && currentWorkflow.status === 'active')"
                :loading="loading"
                color="primary"
                prepend-icon="mdi-rocket-launch"
                size="large"
                @click="showStartWorkflowDialog = true"
              >
                {{ currentWorkflow && currentWorkflow.status === 'active' 
                   ? $t('admin.workflowInProgress') 
                   : $t('admin.startAnnualUpdate') }}
              </v-btn>
              
              <!-- Send Emails Button (only show if workflow is active but no emails sent yet) -->
              <v-btn
                v-if="currentWorkflow && currentWorkflow.status === 'active' && currentWorkflow.stats.emailsSent === 0"
                :disabled="loading"
                :loading="sendingEmails"
                color="secondary"
                prepend-icon="mdi-email-send"
                size="large"
                @click="sendEmails"
              >
                {{ $t('admin.sendEmails') }}
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
    </div>

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
            color="info"
            icon="mdi-information"
            variant="tonal"
            class="mb-4"
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
            color="warning"
            icon="mdi-alert"
            variant="tonal"
            class="mb-4"
          >
            <div class="text-body-2">
              <strong>{{ $t('admin.important') }}:</strong>
              {{ $t('admin.emailsSentSeparately') }}
            </div>
          </v-alert>

          <!-- Admin Confirmation -->
          <v-text-field
            v-model="confirmationText"
            :label="$t('admin.confirmationType')"
            :placeholder="$t('admin.confirmationPlaceholder')"
            variant="outlined"
            class="mt-4"
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
            :disabled="confirmationText.toLowerCase() !== 'confirm'"
            :loading="loading"
            color="primary"
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
  import { computed, onMounted, ref } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { useI18n } from '@/composables/useI18n'

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

  // Check if user is authorized (admin/staff only)
  const isAuthorized = computed(() => {
    if (!authStore.isAuthenticated || !authStore.userEmail) {
      return false
    }
    
    // Check if user email contains admin indicators or is staff
    // You can customize this logic based on your admin structure
    const adminEmails = [
      // Add specific admin email addresses here
    ]
    
    const isAdmin = adminEmails.includes(authStore.userEmail.toLowerCase())
    const isStaffDomain = authStore.userEmail.toLowerCase().includes('@school.com') // Adjust domain as needed
    
    return isAdmin || isStaffDomain
  })

  // Workflow status helpers
  const getWorkflowStatusType = (status) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'active': return 'info'
      case 'completed': return 'success'
      default: return 'info'
    }
  }

  const getWorkflowStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'active': return 'info'
      case 'completed': return 'success'
      default: return 'grey'
    }
  }

  const getWorkflowStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'mdi-clock-outline'
      case 'active': return 'mdi-play-circle'
      case 'completed': return 'mdi-check-circle'
      default: return 'mdi-help-circle'
    }
  }

  const getWorkflowStatusMessage = (workflow) => {
    const completionRate = workflow.stats.totalParents > 0 
      ? Math.round((workflow.stats.formsSubmitted / workflow.stats.totalParents) * 100)
      : 0
    
    return t('admin.workflowProgress', {
      schoolYear: workflow.schoolYear,
      completed: workflow.stats.formsSubmitted,
      total: workflow.stats.totalParents,
      percentage: completionRate
    })
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
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
      const baseUrl = import.meta.env.DEV 
        ? 'http://localhost:5001/bottin2-3b41d/us-central1'
        : 'https://us-central1-bottin2-3b41d.cloudfunctions.net'

      const response = await fetch(`${baseUrl}/startAnnualUpdate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        },
        body: JSON.stringify({
          schoolYear,
          adminEmail: authStore.userEmail
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Refresh workflow data
      await loadWorkflowData()
      
      showStartWorkflowDialog.value = false
      confirmationText.value = '' // Reset confirmation
      
    } catch (err) {
      console.error('Failed to start workflow:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Load current workflow and history
  const loadWorkflowData = async () => {
    try {
      const baseUrl = import.meta.env.DEV 
        ? 'http://localhost:5001/bottin2-3b41d/us-central1'
        : 'https://us-central1-bottin2-3b41d.cloudfunctions.net'

      const response = await fetch(`${baseUrl}/getWorkflowStatus`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      currentWorkflow.value = data.current
      workflowHistory.value = data.history || []
      
    } catch (err) {
      console.error('Failed to load workflow data:', err)
    }
  }

  // Send email notifications to parents
  const sendEmails = async () => {
    if (!currentWorkflow.value) return

    try {
      sendingEmails.value = true
      error.value = null

      const baseUrl = import.meta.env.DEV 
        ? 'http://localhost:5001/bottin2-3b41d/us-central1'
        : 'https://us-central1-bottin2-3b41d.cloudfunctions.net'

      const response = await fetch(`${baseUrl}/sendUpdateEmails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log(`Emails sent successfully: ${result.emailsSent}/${result.totalParents}`)
      
      // Refresh workflow data to show updated stats
      await loadWorkflowData()
      
    } catch (err) {
      console.error('Failed to send emails:', err)
      error.value = err.message
    } finally {
      sendingEmails.value = false
    }
  }

  onMounted(async () => {
    if (isAuthorized.value) {
      await loadWorkflowData()
    }
  })
</script>
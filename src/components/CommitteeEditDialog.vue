<template>
  <v-card>
    <!-- Dialog Header -->
    <v-card-title class="d-flex align-center justify-space-between bg-primary text-white">
      <div class="d-flex align-center gap-3">
        <v-icon class="mr-3">mdi-account-group-outline</v-icon>
        <span>{{ committee.name }}</span>
      </div>
      <v-btn
        density="comfortable"
        icon="mdi-close"
        variant="text"
        @click="$emit('close')"
      />
    </v-card-title>

    <!-- Committee Name (Read-only) -->
    <v-card-subtitle class="pa-4 pb-0">
      <v-chip color="primary" variant="tonal">
        {{ committee.name }}
      </v-chip>
    </v-card-subtitle>

    <v-card-text class="pa-4">
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular color="primary" indeterminate />
        <p class="mt-4">{{ $t('committees.loadingMembers') }}</p>
      </div>

      <div v-else-if="error" class="text-center py-4">
        <v-alert type="error">{{ error }}</v-alert>
      </div>

      <div v-else>
        <!-- Current Members -->
        <div class="mb-6">
          <div class="d-flex align-center justify-space-between mb-4">
            <h3 class="text-h6">{{ $t('committees.currentMembers') }}</h3>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              size="small"
              @click="showAddMember = true"
            >
              {{ $t('committees.addMember') }}
            </v-btn>
          </div>

          <!-- Members List -->
          <div v-if="members.length > 0" class="space-y-2">
            <v-card
              v-for="(member, index) in members"
              :key="member.email"
              class="pa-3"
              variant="outlined"
            >
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center gap-3">
                  <div>
                    <div class="font-weight-medium">{{ member.fullName || member.email }}</div>
                    <div class="text-body-2 text-grey-darken-1">{{ member.email }}</div>
                  </div>
                  <v-chip
                    :color="member.memberType === 'staff' ? 'blue' : 'grey'"
                    size="small"
                    variant="tonal"
                  >
                    {{ member.memberType === 'staff' ? $t('committees.staff') : $t('committees.parent') }}
                  </v-chip>
                </div>

                <div class="d-flex align-center gap-2">
                  <!-- Role Selection -->
                  <v-select
                    v-model="member.role"
                    density="compact"
                    hide-details
                    :items="availableRoles"
                    :label="$t('common.role')"
                    style="min-width: 150px;"
                    variant="outlined"
                    @update:model-value="markAsModified(index)"
                  />

                  <!-- Remove Member Button -->
                  <v-btn
                    color="error"
                    density="comfortable"
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    @click="removeMember(index)"
                  />
                </div>
              </div>
            </v-card>
          </div>

          <div v-else class="text-center py-4 text-grey-darken-1">
            <v-icon class="mb-2" color="grey-darken-2" size="48">mdi-account-group-outline</v-icon>
            <div>{{ $t('committees.noMembers') }}</div>
          </div>
        </div>

        <!-- Add Member Section -->
        <v-expand-transition>
          <v-card v-if="showAddMember" class="pa-4 bg-grey-lighten-4" variant="outlined">
            <h4 class="text-h6 mb-3 text-grey-darken-3">{{ $t('committees.addNewMember') }}</h4>

            <v-row>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="newMemberEmail"
                  clearable
                  item-title="label"
                  item-value="email"
                  :items="availableUsers"
                  :label="$t('committees.selectUser')"
                  :loading="searchingUsers"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  @update:search="searchUsers"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="newMemberRole"
                  :items="availableRoles"
                  :label="$t('common.role')"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="2">
                <div class="d-flex gap-2">
                  <v-btn
                    color="success"
                    :disabled="!newMemberEmail || !newMemberRole"
                    icon="mdi-check"
                    @click="addMember"
                  />
                  <v-btn
                    color="grey"
                    icon="mdi-close"
                    @click="cancelAddMember"
                  />
                </div>
              </v-col>
            </v-row>
          </v-card>
        </v-expand-transition>
      </div>
    </v-card-text>

    <!-- Dialog Actions -->
    <v-card-actions class="pa-4 pt-0">
      <v-spacer />
      <v-btn
        color="grey"
        variant="text"
        @click="$emit('close')"
      >
        {{ $t('common.cancel') }}
      </v-btn>
      <v-btn
        color="primary"
        :disabled="!hasChanges"
        :loading="saving"
        @click="saveChanges"
      >
        {{ $t('common.save') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { getCommitteeRoles } from '@/config/committees'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const props = defineProps({
    committee: {
      type: Object,
      required: true,
    },
  })

  const emit = defineEmits(['close', 'updated'])

  // Stores
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // State
  const loading = ref(true)
  const saving = ref(false)
  const error = ref(null)
  const members = ref([])
  const originalMembers = ref([])
  const hasChanges = ref(false)
  const showAddMember = ref(false)
  const newMemberEmail = ref('')
  const newMemberRole = ref('')
  const availableUsers = ref([])
  const searchingUsers = ref(false)

  // Get available roles for this committee
  const availableRoles = computed(() => {
    return getCommitteeRoles(props.committee.name)
  })

  // Initialize members data
  const initializeMembers = async () => {
    try {
      loading.value = true
      error.value = null

      // Start with existing enriched members from the committee
      const enrichedMembers = props.committee.enrichedMembers || []

      members.value = enrichedMembers.map(member => ({
        email: member.email,
        fullName: member.fullName,
        role: member.role,
        memberType: member.memberType,
      }))

      // Store original state for change detection
      // eslint-disable-next-line unicorn/prefer-structured-clone
      originalMembers.value = JSON.parse(JSON.stringify(members.value))
      hasChanges.value = false

      // Set default role for new members
      if (availableRoles.value.length > 0) {
        newMemberRole.value = availableRoles.value[0]
      }
    } catch (error_) {
      console.error('Error initializing members:', error_)
      error.value = 'Failed to load committee members'
    } finally {
      loading.value = false
    }
  }

  // Search for users (parents and staff)
  const searchUsers = async query => {
    if (!query || query.length < 2) {
      availableUsers.value = []
      return
    }

    // Don't search if the query looks like a formatted label (contains " - Parent" or " - Staff")
    if (query.includes(' - Parent') || query.includes(' - Staff')) {
      return
    }

    try {
      searchingUsers.value = true

      // Search in both parents and staff
      const [parents, staff] = await Promise.all([
        firebaseStore.searchParentsDTO(query),
        firebaseStore.searchStaffDTO(query),
      ])

      // Combine and format results
      const allUsers = [
        ...parents.map(p => ({
          email: p.email,
          label: `${p.fullName} (${p.email}) - Parent`,
          fullName: p.fullName,
          memberType: 'parent',
        })),
        ...staff.map(s => ({
          email: s.email,
          label: `${s.fullName} (${s.email}) - Staff`,
          fullName: s.fullName,
          memberType: 'staff',
        })),
      ]

      // Filter out existing members
      const existingEmails = new Set(members.value.map(m => m.email))
      availableUsers.value = allUsers.filter(u => !existingEmails.has(u.email))
    } catch (error_) {
      console.error('Error searching users:', error_)
    } finally {
      searchingUsers.value = false
    }
  }

  // Add new member
  const addMember = () => {
    const selectedUser = availableUsers.value.find(u => u.email === newMemberEmail.value)
    if (!selectedUser) return

    members.value.push({
      email: selectedUser.email,
      fullName: selectedUser.fullName,
      role: newMemberRole.value,
      memberType: selectedUser.memberType,
    })

    // Reset add member form
    cancelAddMember()
    markAsModified()
  }

  // Cancel adding member
  const cancelAddMember = () => {
    showAddMember.value = false
    newMemberEmail.value = ''
    newMemberRole.value = availableRoles.value[0] || ''
    availableUsers.value = []
  }

  // Remove member
  const removeMember = index => {
    members.value.splice(index, 1)
    markAsModified()
  }

  // Mark as modified
  const markAsModified = () => {
    hasChanges.value = JSON.stringify(members.value) !== JSON.stringify(originalMembers.value)
  }

  // Save changes
  const saveChanges = async () => {
    try {
      saving.value = true
      error.value = null

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/updateCommitteeMembersV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          committeeId: props.committee.id,
          members: members.value.map(m => ({
            email: m.email,
            role: m.role,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Committee members updated:', result)
      emit('updated')
    } catch (error_) {
      console.error('Error saving committee members:', error_)
      error.value = 'Failed to save changes. Please try again.'
    } finally {
      saving.value = false
    }
  }

  // Watch for changes
  watch(() => members.value, markAsModified, { deep: true })

  onMounted(async () => {
    await initializeMembers()
  })
</script>

<style scoped>
  .space-y-2 > * + * {
    margin-top: 8px;
  }
</style>

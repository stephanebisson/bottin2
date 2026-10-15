<template>
  <v-container>
    <div v-if="firebaseStore.committeesErrorDTO" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.committeesErrorDTO"
        :title="$i18n('committees.errorLoadingCommittees')"
        type="error"
        @click:close="firebaseStore.committeesErrorDTO = null"
      />
    </div>

    <div v-if="firebaseStore.committeesLoadingDTO" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-title-large mt-4">{{ $i18n('committees.loadingCommittees') }}</p>
    </div>

    <div v-else-if="firebaseStore.committeesDTO.length === 0" class="text-center py-8">
      <v-icon class="text-medium-emphasis" size="64">mdi-account-group-outline</v-icon>
      <p class="text-title-large mt-4 text-medium-emphasis">{{ $i18n('committees.noCommitteesFound') }}</p>
    </div>

    <div v-else>
      <!-- Search Bar -->
      <v-card class="mb-4">
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            clearable
            hide-details
            :label="$i18n('committees.searchCommittees')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </v-card-text>
      </v-card>

      <!-- Committees List -->
      <v-row>
        <v-col
          v-for="committee in filteredCommittees"
          :key="committee.id"
          cols="12"
          lg="4"
          md="6"
        >
          <v-card height="100%">
            <!-- Committee Header -->
            <div class="bg-primary text-white pa-4">
              <div class="d-flex align-start justify-space-between gap-3 mb-2">
                <div class="committee-name text-title-large font-weight-bold">
                  <HighlightedText :query="searchQuery" :text="committee.name" />
                </div>

                <div class="d-flex align-center gap-2">
                  <v-chip
                    class="flex-shrink-0"
                    color="white"
                    size="small"
                    text-color="primary"
                  >
                    {{ $i18n('committees.memberCount', committee.enrichedMembers.length) }}
                  </v-chip>

                  <v-btn
                    v-if="authStore.isAdmin"
                    class="flex-shrink-0"
                    color="white"
                    density="compact"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openEditDialog(committee)"
                  />
                </div>
              </div>

              <!-- Committee Details -->
              <div v-if="committee.description || committee.email || committee.phone || committee.url" class="committee-details">
                <div v-if="committee.description" class="text-body-medium mb-2 font-italic">
                  {{ committee.description }}
                </div>

                <div v-if="committee.email || committee.phone || committee.url" class="committee-contact-info">
                  <div v-if="committee.email" class="d-flex align-center text-body-small">
                    <v-icon class="me-2" size="small">mdi-email</v-icon>
                    <a class="text-white text-decoration-none" :href="`mailto:${committee.email}`">{{ committee.email }}</a>
                  </div>

                  <div v-if="committee.phone" class="d-flex align-center text-body-small">
                    <v-icon class="me-2" size="small">mdi-phone</v-icon>
                    <a class="text-white text-decoration-none" :href="`tel:${committee.phone}`">{{ formatPhone(committee.phone) }}</a>
                  </div>

                  <div v-if="committee.url" class="d-flex align-center text-body-small">
                    <v-icon class="me-2" size="small">mdi-web</v-icon>
                    <a class="text-white text-decoration-none" :href="ensureHttps(committee.url)" rel="noopener noreferrer" target="_blank">{{ committee.url }}</a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Committee Members -->
            <v-card-text class="pa-3">
              <div v-if="committee.enrichedMembers.length > 0">
                <!-- Parent Members Section -->
                <div v-if="committee.parentMembers.length > 0">
                  <div class="text-title-small font-weight-medium mb-3 d-flex align-center">
                    <v-icon class="me-2" color="primary" size="small">mdi-account-group</v-icon>
                    {{ committee.hasMixedMemberTypes ? $i18n('committees.parentMembers') : $i18n('committees.membersHeader') }}
                  </div>

                  <ParentInfo
                    v-for="member in committee.parentMembers"
                    :key="member.email"
                    class="member-item-compact mb-2 rounded"
                    :class="'bg-surface-light'"
                    :member-type="member.memberType"
                    :parent="member"
                    :role="member.role"
                    :search-query="searchQuery"
                    show-contact
                    show-member-type
                    show-role
                    variant="compact"
                  />
                </div>

                <!-- Staff Members Section -->
                <div v-if="committee.staffMembers.length > 0">
                  <div
                    class="text-title-small font-weight-medium mb-3 d-flex align-center"
                    :class="{ 'mt-4': committee.parentMembers.length > 0 }"
                  >
                    <v-icon class="me-2" color="primary" size="small">mdi-school</v-icon>
                    {{ $i18n('committees.staffMembers') }}
                  </div>

                  <ParentInfo
                    v-for="member in committee.staffMembers"
                    :key="member.email"
                    class="member-item-compact mb-2 rounded"
                    :class="'bg-blue-lighten-5'"
                    :member-type="member.memberType"
                    :parent="member"
                    :role="member.role"
                    :search-query="searchQuery"
                    show-contact
                    show-member-type
                    show-role
                    variant="compact"
                  />
                </div>

                <!-- Student Members Section (fèves committee) -->
                <div v-if="committee.studentMembers.length > 0">
                  <div
                    class="text-title-small font-weight-medium mb-3 d-flex align-center"
                    :class="{ 'mt-4': committee.parentMembers.length > 0 || committee.staffMembers.length > 0 }"
                  >
                    <v-icon class="me-2" color="green" size="small">mdi-leaf</v-icon>
                    {{ $i18n('committees.studentMembers') }}
                  </div>

                  <ParentInfo
                    v-for="member in committee.studentMembers"
                    :key="member.memberId"
                    class="member-item-compact mb-2 rounded"
                    :class="'bg-green-lighten-5'"
                    :member-type="member.memberType"
                    :parent="member"
                    :role="member.role"
                    :search-query="searchQuery"
                    show-contact
                    show-member-type
                    show-role
                    variant="compact"
                  />
                </div>

                <!-- Unknown Members Section (if any) -->
                <div v-if="committee.unknownMembers.length > 0">
                  <div
                    class="text-title-small font-weight-medium mb-3 d-flex align-center"
                    :class="{ 'mt-4': committee.parentMembers.length > 0 || committee.staffMembers.length > 0 || committee.studentMembers.length > 0 }"
                  >
                    <v-icon class="me-2" color="primary" size="small">mdi-help-circle</v-icon>
                    {{ $i18n('committees.unknownMembers') }}
                  </div>

                  <ParentInfo
                    v-for="member in committee.unknownMembers"
                    :key="member.email"
                    class="member-item-compact mb-2 rounded"
                    :class="'bg-orange-lighten-5'"
                    :member-type="member.memberType"
                    :parent="member"
                    :role="member.role"
                    :search-query="searchQuery"
                    show-contact
                    show-member-type
                    show-role
                    variant="compact"
                  />
                </div>

                <!-- Single group fallback (committees with only one member type) -->
                <div v-if="committee.parentMembers.length === 0 && committee.staffMembers.length === 0 && committee.studentMembers.length === 0 && committee.unknownMembers.length === 0">
                  <div class="text-title-small font-weight-medium mb-3 d-flex align-center">
                    <v-icon class="me-2" color="primary" size="small">mdi-account-group</v-icon>
                    {{ $i18n('committees.membersHeader') }}
                  </div>

                  <ParentInfo
                    v-for="member in committee.enrichedMembers"
                    :key="member.email"
                    class="member-item-compact mb-2 rounded"
                    :class="member.memberType === 'staff' ? 'bg-blue-lighten-5' : member.memberType === 'unknown' ? 'bg-orange-lighten-5' : 'bg-surface-light'"
                    :member-type="member.memberType"
                    :parent="member"
                    :role="member.role"
                    :search-query="searchQuery"
                    show-contact
                    show-member-type
                    show-role
                    variant="compact"
                  />
                </div>
              </div>

              <div v-else class="text-center py-4 text-medium-emphasis text-body-small">
                <v-icon class="mb-2 text-medium-emphasis" size="24">mdi-account-group-outline</v-icon>
                <div>{{ $i18n('committees.noMembersFound') }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Edit Committee Members Dialog -->
    <v-dialog
      v-model="editDialogOpen"
      max-width="800px"
      persistent
    >
      <CommitteeEditDialog
        v-if="selectedCommittee"
        :committee="selectedCommittee"
        @close="closeEditDialog"
        @updated="handleCommitteeUpdated"
      />
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import CommitteeEditDialog from '@/components/CommitteeEditDialog.vue'
  import HighlightedText from '@/components/HighlightedText.vue'
  import ParentInfo from '@/components/ParentInfo.vue'
  import { getCommitteeRoleDisplayOrder } from '@/config/committees'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { formatStudentClass } from '@/utils/gradeFormatter.js'
  import { matchesSearch } from '@/utils/search'

  definePage({ meta: { titleKey: 'committees.title' } })

  const MEMBER_TYPE_ORDER = ['parent', 'staff', 'student', 'unknown']

  const bananaI18n = useI18n()
  const searchQuery = ref('')
  const editDialogOpen = ref(false)
  const selectedCommittee = ref(null)

  // Use centralized data store
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  const enrichedCommittees = computed(() => {
    return firebaseStore.committeesDTO.map(committee => {
      // Enrich members with full information from parents, staff and students
      // memberId is the parent, staff or student document ID
      const enrichedMembers = committee.members
        .map(member => {
          // Look up by memberId (parent/staff/student document ID)
          switch (member.member_type) {
            case 'parent': {
              const parentMatch = firebaseStore.parentsDTO.find(p => p.id === member.memberId)
              if (parentMatch) {
                return {
                  ...member,
                  email: parentMatch.email,
                  fullName: parentMatch.fullName,
                  phone: parentMatch.phone,
                  memberType: 'parent',
                }
              }

              break
            }
            case 'staff': {
              const staffMatch = firebaseStore.staffDTO.find(s => s.id === member.memberId)
              if (staffMatch) {
                return {
                  ...member,
                  email: staffMatch.email,
                  fullName: staffMatch.fullName,
                  phone: staffMatch.phone,
                  memberType: 'staff',
                }
              }

              break
            }
            case 'student': {
              const studentMatch = firebaseStore.studentsDTO.find(s => s.id === member.memberId)
              if (studentMatch) {
                return {
                  ...member,
                  email: null,
                  fullName: `${studentMatch.first_name} ${studentMatch.last_name}`,
                  phone: null,
                  classLabel: formatStudentClass(studentMatch, firebaseStore.classes, bananaI18n.locale),
                  memberType: 'student',
                }
              }

              break
            }
          // No default
          }

          // If not found in any collection, show member ID
          return {
            ...member,
            email: null,
            fullName: `[${member.memberId}]`,
            phone: null,
            memberType: 'unknown',
          }
        })
        .toSorted((a, b) => {
          // Get role display order for this committee (if defined)
          const roleOrder = getCommitteeRoleDisplayOrder(committee.name)

          // First sort by member type (parents, then staff, then students, unknown last)
          if (a.memberType !== b.memberType) {
            return MEMBER_TYPE_ORDER.indexOf(a.memberType) - MEMBER_TYPE_ORDER.indexOf(b.memberType)
          }

          // If role order is defined, sort by role order within the same member type
          if (roleOrder) {
            const aRoleIndex = roleOrder.indexOf(a.role)
            const bRoleIndex = roleOrder.indexOf(b.role)

            // If both roles are in the order, sort by their position
            if (aRoleIndex !== -1 && bRoleIndex !== -1) {
              return aRoleIndex - bRoleIndex
            }

            // If only one role is in the order, it comes first
            if (aRoleIndex !== -1) return -1
            if (bRoleIndex !== -1) return 1

            // If neither role is in the order, fall through to name sorting
          }

          // Then sort by name within the same member type and role order
          return a.fullName.localeCompare(b.fullName)
        })

      // Separate members by type for grouped display
      const parentMembers = enrichedMembers.filter(member => member.memberType === 'parent')
      const staffMembers = enrichedMembers.filter(member => member.memberType === 'staff')
      const studentMembers = enrichedMembers.filter(member => member.memberType === 'student')
      const unknownMembers = enrichedMembers.filter(member => member.memberType === 'unknown')

      return {
        ...committee,
        enrichedMembers,
        parentMembers,
        staffMembers,
        studentMembers,
        unknownMembers,
        hasMixedMemberTypes: [parentMembers, staffMembers, studentMembers].filter(group => group.length > 0).length > 1,
      }
    }).toSorted((a, b) => a.name.localeCompare(b.name))
  })

  const filteredCommittees = computed(() => {
    return enrichedCommittees.value.filter(committee => {
      // Search in committee name (accent-insensitive)
      return matchesSearch(committee.name, searchQuery.value)
    })
  })

  // Open edit dialog for committee
  function openEditDialog (committee) {
    selectedCommittee.value = committee
    editDialogOpen.value = true
  }

  // Close edit dialog
  function closeEditDialog () {
    editDialogOpen.value = false
    selectedCommittee.value = null
  }

  // Handle committee updated
  async function handleCommitteeUpdated () {
    // Refresh committee data to show updated members
    await firebaseStore.refreshCommitteesDTO()
    closeEditDialog()
  }

  // Helper: Format phone number
  function formatPhone (phone) {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  // Helper: Ensure URL has https:// protocol
  function ensureHttps (url) {
    if (!url) return ''
    const urlStr = url.toString().trim()
    if (/^https?:\/\//i.test(urlStr)) {
      return urlStr
    }
    return `https://${urlStr}`
  }

  onMounted(async () => {
    // Load DTO data in parallel
    await Promise.all([
      firebaseStore.loadParentsDTO(),
      firebaseStore.loadStaffDTO(),
      firebaseStore.loadStudentsDTO(),
      firebaseStore.loadClasses(),
      firebaseStore.loadCommitteesDTO(),
    ])
  })
</script>

<style scoped>
.committee-name {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
}

.committee-details {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 0.75rem;
}

.committee-contact-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.committee-contact-info a:hover {
  text-decoration: underline !important;
}

.member-item-compact {
  padding: 12px;
}

.member-item-compact.bg-blue-lighten-5 .parent-info {
  border-left-color: rgb(var(--v-theme-blue));
}

.member-item-compact.bg-surface-light .parent-info {
  border-left-color: rgb(var(--v-theme-grey));
}

.member-item-compact.bg-orange-lighten-5 .parent-info {
  border-left-color: rgb(var(--v-theme-orange));
}

a {
  color: inherit;
}

a:hover {
  color: rgb(var(--v-theme-primary));
}
</style>

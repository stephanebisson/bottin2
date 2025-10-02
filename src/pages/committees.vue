<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('committees.title') }}</h1>
      <v-chip
        :color="firebaseStore.loading ? 'orange' : 'green'"
        :prepend-icon="firebaseStore.loading ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
      >
        {{ firebaseStore.loading ? $t('common.loading') : searchQuery ? $t('committees.committeesFiltered', { filtered: filteredCommittees.length, total: firebaseStore.committees.length }) : $t('committees.committeesLoaded', { count: firebaseStore.committees.length }) }}
      </v-chip>
    </div>

    <div v-if="firebaseStore.error" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.error"
        :title="$t('committees.errorLoadingCommittees')"
        type="error"
        @click:close="firebaseStore.error = null"
      />
    </div>

    <div v-if="firebaseStore.loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('committees.loadingCommittees') }}</p>
    </div>

    <div v-else-if="firebaseStore.committees.length === 0" class="text-center py-8">
      <v-icon color="grey-darken-2" size="64">mdi-account-group-outline</v-icon>
      <p class="text-h6 mt-4 text-grey-darken-2">{{ $t('committees.noCommitteesFound') }}</p>
    </div>

    <div v-else>
      <!-- Search Bar -->
      <v-card class="mb-4">
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            clearable
            hide-details
            :label="$t('committees.searchCommittees')"
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
              <div class="d-flex align-start gap-3">
                <div class="committee-name text-h6 font-weight-bold">
                  <HighlightedText :query="searchQuery" :text="committee.name" />
                </div>
                <v-chip
                  class="flex-shrink-0 mt-1"
                  color="white"
                  size="small"
                  text-color="primary"
                >
                  {{ committee.enrichedMembers.length === 1 ? $t('committees.memberCount', { count: committee.enrichedMembers.length }) : $t('committees.memberCountPlural', { count: committee.enrichedMembers.length }) }}
                </v-chip>
              </div>
            </div>

            <!-- Committee Members -->
            <v-card-text class="pa-3">
              <div v-if="committee.enrichedMembers.length > 0">
                <!-- Parent Members Section -->
                <div v-if="committee.parentMembers.length > 0">
                  <div class="text-subtitle-2 font-weight-medium mb-3 d-flex align-center">
                    <v-icon class="me-2" color="primary" size="small">mdi-account-group</v-icon>
                    {{ committee.hasMixedMemberTypes ? $t('committees.parentMembers') : $t('committees.membersHeader') }}
                  </div>
                  <ParentInfo
                    v-for="member in committee.parentMembers"
                    :key="member.email"
                    class="member-item-compact mb-2 rounded"
                    :class="'bg-grey-lighten-4'"
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
                    class="text-subtitle-2 font-weight-medium mb-3 d-flex align-center"
                    :class="{ 'mt-4': committee.parentMembers.length > 0 }"
                  >
                    <v-icon class="me-2" color="primary" size="small">mdi-school</v-icon>
                    {{ $t('committees.staffMembers') }}
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

                <!-- Unknown Members Section (if any) -->
                <div v-if="committee.unknownMembers.length > 0">
                  <div
                    class="text-subtitle-2 font-weight-medium mb-3 d-flex align-center"
                    :class="{ 'mt-4': committee.parentMembers.length > 0 || committee.staffMembers.length > 0 }"
                  >
                    <v-icon class="me-2" color="primary" size="small">mdi-help-circle</v-icon>
                    {{ $t('committees.unknownMembers') }}
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
                <div v-if="committee.parentMembers.length === 0 && committee.staffMembers.length === 0 && committee.unknownMembers.length === 0">
                  <div class="text-subtitle-2 font-weight-medium mb-3 d-flex align-center">
                    <v-icon class="me-2" color="primary" size="small">mdi-account-group</v-icon>
                    {{ $t('committees.membersHeader') }}
                  </div>
                  <ParentInfo
                    v-for="member in committee.enrichedMembers"
                    :key="member.email"
                    class="member-item-compact mb-2 rounded"
                    :class="member.memberType === 'staff' ? 'bg-blue-lighten-5' : member.memberType === 'unknown' ? 'bg-orange-lighten-5' : 'bg-grey-lighten-4'"
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
              <div v-else class="text-center py-4 text-grey-darken-1 text-caption">
                <v-icon class="mb-2" color="grey-darken-2" size="24">mdi-account-group-outline</v-icon>
                <div>{{ $t('committees.noMembersFound') }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import HighlightedText from '@/components/HighlightedText.vue'
  import ParentInfo from '@/components/ParentInfo.vue'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { matchesSearch } from '@/utils/search'

  const searchQuery = ref('')

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()

  const enrichedCommittees = computed(() => {
    return firebaseStore.committees.map(committee => {
      const enrichedMembers = committee.members
        ? committee.members.map(member => {
          // Try to find member in parents collection first
          const parentMatch = firebaseStore.parentsDTO.find(p => p.email === member.email)
          if (parentMatch) {
            return {
              ...member,
              fullName: parentMatch.fullName,
              phone: parentMatch.phone,
              memberType: 'parent',
            }
          }

          // Try to find member in staff collection
          const staffMatch = firebaseStore.staffDTO.find(s => s.email === member.email)
          if (staffMatch) {
            return {
              ...member,
              fullName: staffMatch.fullName,
              phone: staffMatch.phone,
              memberType: 'staff',
            }
          }

          // If not found in either collection, use email as name
          return {
            ...member,
            fullName: member.email,
            phone: null,
            memberType: 'unknown',
          }
        }).sort((a, b) => {
          // First sort by member type (parents first, then staff)
          if (a.memberType !== b.memberType) {
            if (a.memberType === 'parent' && b.memberType === 'staff') return -1
            if (a.memberType === 'staff' && b.memberType === 'parent') return 1
            // For 'unknown' type, place it last
            if (a.memberType === 'unknown') return 1
            if (b.memberType === 'unknown') return -1
          }
          // Then sort by name within the same member type
          return a.fullName.localeCompare(b.fullName)
        })
        : []

      // Separate members by type for grouped display
      const parentMembers = enrichedMembers.filter(member => member.memberType === 'parent')
      const staffMembers = enrichedMembers.filter(member => member.memberType === 'staff')
      const unknownMembers = enrichedMembers.filter(member => member.memberType === 'unknown')

      return {
        ...committee,
        enrichedMembers,
        parentMembers,
        staffMembers,
        unknownMembers,
        hasMixedMemberTypes: parentMembers.length > 0 && staffMembers.length > 0,
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  })

  const filteredCommittees = computed(() => {
    return enrichedCommittees.value.filter(committee => {
      // Search in committee name (accent-insensitive)
      return matchesSearch(committee.name, searchQuery.value)
    })
  })

  onMounted(async () => {
    // Load DTO data in parallel
    await Promise.all([
      firebaseStore.loadParentsDTO(),
      firebaseStore.loadStaffDTO(),
      firebaseStore.loadAllData(), // Still need committees data
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

.member-item-compact {
  padding: 12px;
}

.member-item-compact.bg-blue-lighten-5 .parent-info {
  border-left-color: rgb(var(--v-theme-blue));
}

.member-item-compact.bg-grey-lighten-4 .parent-info {
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

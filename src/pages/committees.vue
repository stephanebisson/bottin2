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
            <v-card-title class="bg-primary text-white">
              <div class="d-flex justify-space-between align-center w-100">
                <HighlightedText :query="searchQuery" :text="committee.name" />
                <v-chip
                  color="white"
                  size="small"
                  text-color="primary"
                >
                  {{ committee.enrichedMembers.length }} member{{ committee.enrichedMembers.length !== 1 ? 's' : '' }}
                </v-chip>
              </div>
            </v-card-title>

            <!-- Committee Members -->
            <v-card-text class="pa-0">
              <v-expansion-panels variant="accordion">
                <v-expansion-panel>
                  <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
                    <v-icon class="me-2" color="primary">mdi-account-group</v-icon>
                    View Members
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div v-if="committee.enrichedMembers.length > 0" class="py-2">
                      <div
                        v-for="member in committee.enrichedMembers"
                        :key="member.email"
                        class="member-item mb-3 pa-3 rounded"
                        :class="member.memberType === 'staff' ? 'bg-blue-lighten-5' : 'bg-green-lighten-5'"
                      >
                        <!-- Member Header -->
                        <div class="d-flex justify-space-between align-center mb-2">
                          <div class="text-subtitle-1 font-weight-bold">
                            <HighlightedText :query="searchQuery" :text="member.fullName" />
                          </div>
                          <v-chip
                            :color="member.memberType === 'staff' ? 'blue' : 'green'"
                            size="small"
                            variant="outlined"
                          >
                            {{ member.memberType === 'staff' ? 'Staff' : 'Parent' }}
                          </v-chip>
                        </div>

                        <!-- Member Contact Info -->
                        <div class="text-body-2">
                          <div class="mb-1">
                            <v-icon class="me-2" size="small">mdi-email</v-icon>
                            <a class="text-decoration-none" :href="`mailto:${member.email}`">
                              {{ member.email }}
                            </a>
                          </div>
                          <div v-if="member.phone" class="mb-1">
                            <v-icon class="me-2" size="small">mdi-phone</v-icon>
                            <a class="text-decoration-none" :href="`tel:${member.phone}`">
                              {{ formatPhone(member.phone) }}
                            </a>
                          </div>
                          <div v-if="member.role && member.role !== 'Member'" class="mt-2">
                            <v-chip
                              color="primary"
                              size="x-small"
                              variant="text"
                            >
                              {{ member.role }}
                            </v-chip>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-center py-4 text-grey-darken-1">
                      No members found for this committee
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
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
          const parentMatch = firebaseStore.parents.find(p => p.email === member.email)
          if (parentMatch) {
            return {
              ...member,
              fullName: `${parentMatch.first_name} ${parentMatch.last_name}`,
              phone: parentMatch.phone,
              memberType: 'parent',
            }
          }

          // Try to find member in staff collection
          const staffMatch = firebaseStore.staff.find(s => s.email === member.email)
          if (staffMatch) {
            return {
              ...member,
              fullName: `${staffMatch.first_name} ${staffMatch.last_name}`,
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
        }).sort((a, b) => a.fullName.localeCompare(b.fullName))
        : []

      return {
        ...committee,
        enrichedMembers,
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  })

  const filteredCommittees = computed(() => {
    return enrichedCommittees.value.filter(committee => {
      // Search in committee name (accent-insensitive)
      return matchesSearch(committee.name, searchQuery.value)
    })
  })

  const formatPhone = phone => {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  onMounted(() => {
    firebaseStore.loadAllData()
  })
</script>

<style scoped>
.member-item {
  border-left: 4px solid;
}

.member-item.bg-blue-lighten-5 {
  border-left-color: rgb(var(--v-theme-blue));
}

.member-item.bg-green-lighten-5 {
  border-left-color: rgb(var(--v-theme-green));
}

a {
  color: inherit;
}

a:hover {
  color: rgb(var(--v-theme-primary));
}
</style>

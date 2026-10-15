<template>
  <v-container>
    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
    </div>

    <!-- Error State -->
    <v-alert
      v-if="error"
      class="mb-4"
      closable
      :text="error"
      type="error"
      @click:close="error = null"
    />

    <!-- Profile Content -->
    <div v-if="parentProfile">
      <!-- Header Section -->
      <v-card class="mb-6">
        <v-card-text class="pa-6">
          <div class="d-flex flex-column flex-sm-row align-center align-sm-start">
            <!-- Avatar -->
            <v-avatar
              class="mb-4 mb-sm-0 me-sm-6"
              color="primary"
              size="80"
            >
              <span class="text-headline-large font-weight-bold">
                {{ getInitials(parentProfile.first_name, parentProfile.last_name) }}
              </span>
            </v-avatar>

            <!-- Name and Contact Info -->
            <div class="flex-grow-1 text-center text-sm-left">
              <h1 class="text-headline-large font-weight-bold mb-2">
                {{ parentProfile.first_name }} {{ parentProfile.last_name }}
              </h1>

              <!-- Contact Information -->
              <div class="d-flex flex-column flex-sm-row gap-4 mb-4">
                <div v-if="parentProfile.email" class="d-flex align-center">
                  <v-icon class="me-2" size="small">mdi-email</v-icon>

                  <a
                    class="text-decoration-none"
                    :href="`mailto:${parentProfile.email}`"
                  >
                    {{ parentProfile.email }}
                  </a>
                </div>

                <div v-if="parentProfile.phone" class="d-flex align-center">
                  <v-icon class="me-2" size="small">mdi-phone</v-icon>

                  <a
                    class="text-decoration-none"
                    :href="`tel:${parentProfile.phone}`"
                  >
                    {{ formatPhone(parentProfile.phone) }}
                  </a>
                </div>
              </div>

              <!-- Address -->
              <div v-if="formattedAddress" class="d-flex align-center">
                <v-icon class="me-2" size="small">mdi-home</v-icon>
                <span class="text-body-large">{{ formattedAddress }}</span>
              </div>
            </div>

            <!-- Edit -->
            <v-btn
              class="mt-4 mt-sm-0"
              color="primary"
              prepend-icon="mdi-pencil"
              to="/profile/edit"
              variant="tonal"
            >
              {{ $i18n('profile.edit') }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Main Content Grid -->
      <v-row>
        <!-- Left Column: Family Information -->
        <v-col cols="12" lg="8">
          <!-- My Children Section -->
          <v-card class="mb-6">
            <v-card-title class="d-flex align-center">
              <v-icon class="me-2" color="primary">mdi-account-child</v-icon>
              {{ $i18n('profile.myChildren') }}
            </v-card-title>

            <v-card-text v-if="children.length > 0" class="pa-0">
              <v-list>
                <v-list-item
                  v-for="(child, index) in children"
                  :key="child.id"
                  :class="{ 'border-b': index < children.length - 1 }"
                >
                  <template #prepend>
                    <v-avatar color="secondary" size="40">
                      <span class="font-weight-bold">
                        {{ getInitials(child.first_name, child.last_name) }}
                      </span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-bold">
                    {{ child.first_name }} {{ child.last_name }}
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <StudentClassInfo :student="child" />
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>

            <v-card-text v-else class="text-center py-6 text-medium-emphasis">
              <v-icon class="mb-2" size="48">mdi-account-child-outline</v-icon>
              <p>{{ $i18n('profile.noChildrenFound') }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right Column: School Involvement -->
        <v-col cols="12" lg="4">
          <!-- Committee Memberships -->
          <v-card class="mb-6">
            <v-card-title class="d-flex align-center">
              <v-icon class="me-2" color="accent">mdi-account-group</v-icon>
              {{ $i18n('profile.committees') }}
            </v-card-title>

            <v-card-text v-if="committees.length > 0" class="pa-0">
              <v-list>
                <v-list-item
                  v-for="(committee, index) in committees"
                  :key="committee.id"
                  :class="{ 'border-b': index < committees.length - 1 }"
                >
                  <template #prepend>
                    <v-icon class="text-medium-emphasis">mdi-account-group</v-icon>
                  </template>

                  <v-list-item-title class="font-weight-bold">
                    {{ committee.name }}
                  </v-list-item-title>

                  <v-list-item-subtitle v-if="committee.role && committee.role !== 'Member'">
                    <v-chip
                      color="accent"
                      size="small"
                      variant="tonal"
                    >
                      {{ committee.role }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>

            <v-card-text v-else class="text-center py-6 text-medium-emphasis">
              <v-icon class="mb-2" size="32">mdi-account-group-outline</v-icon>
              <p class="text-body-medium">{{ $i18n('profile.noCommitteesFound') }}</p>
            </v-card-text>
          </v-card>

          <!-- Interests & Skills -->
          <v-card v-if="displayedInterests.length > 0" class="mb-6">
            <v-card-title class="d-flex align-center">
              <v-icon class="me-2" color="secondary">mdi-heart</v-icon>
              {{ $i18n('profile.interests') }}
            </v-card-title>

            <v-card-text class="pa-4">
              <div class="d-flex flex-wrap gap-2">
                <v-chip
                  v-for="interest in displayedInterests"
                  :key="interest"
                  size="small"
                  variant="outlined"
                >
                  {{ interest }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- No Profile Found -->
    <v-card v-else-if="!loading" class="text-center py-8">
      <v-card-text>
        <v-icon class="mb-4 text-medium-emphasis" size="64">mdi-account-question</v-icon>
        <h2 class="text-headline-small mb-2">{{ $i18n('profile.noProfileFound') }}</h2>
        <p class="text-body-large text-medium-emphasis">{{ $i18n('profile.contactAdmin') }}</p>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useTranslate } from '@/composables/useTranslate'
  import { getInterestNames } from '@/config/interests'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  definePage({ meta: { titleKey: 'nav.profile' } })

  const $i18n = useTranslate()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // Component state
  const loading = ref(true)
  const error = ref(null)

  // Get current user's profile data
  const parentProfile = computed(() => firebaseStore.currentParent)

  // Get children for this parent
  const children = computed(() => {
    if (!parentProfile.value?.id) return []

    const parentId = parentProfile.value.id
    return firebaseStore.studentsDTO.filter(student =>
      student.parent1_id === parentId || student.parent2_id === parentId,
    ).toSorted((a, b) => (a.level ?? 0) - (b.level ?? 0))
  })

  // Get committees for this parent
  const committees = computed(() => {
    if (!parentProfile.value?.id) return []

    const parentId = parentProfile.value.id
    return firebaseStore.committeesDTO
      .filter(committee =>
        committee.members && committee.members.some(member =>
          member.memberId === parentId,
        ),
      )
      .map(committee => {
        const member = committee.members.find(member =>
          member.memberId === parentId,
        )
        return {
          id: committee.id,
          name: committee.name,
          role: member?.role || 'Member',
        }
      })
      .toSorted((a, b) => a.name.localeCompare(b.name))
  })

  // Computed properties for formatting
  const formattedAddress = computed(() => {
    if (!parentProfile.value) return ''

    const addressParts = []
    if (parentProfile.value.address) addressParts.push(parentProfile.value.address)
    if (parentProfile.value.city) addressParts.push(parentProfile.value.city)
    if (parentProfile.value.postal_code) addressParts.push(parentProfile.value.postal_code)

    return addressParts.length > 0 ? addressParts.join(', ') : ''
  })

  const displayedInterests = computed(() => {
    if (!parentProfile.value?.interests?.length) return []
    return getInterestNames(parentProfile.value.interests, $i18n)
  })

  // Utility functions
  function getInitials (firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : ''
    const last = lastName ? lastName.charAt(0).toUpperCase() : ''
    return `${first}${last}` || '?'
  }

  function formatPhone (phone) {
    if (!phone) return ''
    const cleaned = phone.toString().replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  onMounted(async () => {
    try {
      await Promise.all([
        firebaseStore.loadStudentsDTO(),
        firebaseStore.loadStaffDTO(),
        firebaseStore.loadCommitteesDTO(),
        firebaseStore.loadClasses(),
      ])
    } catch (error_) {
      error.value = error_.message
      return
    } finally {
      loading.value = false
    }

    // Check if user has a parent profile
    if (!parentProfile.value) {
      // Check if they're staff instead
      const isStaff = firebaseStore.staffDTO.some(staff =>
        staff.email && staff.email.toLowerCase() === authStore.user.email.toLowerCase(),
      )

      error.value = isStaff ? $i18n('profile.staffNotAvailable') : $i18n('profile.noProfileFoundMessage')
    }
  })
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.gap-4 {
  gap: 1rem;
}

/* Mobile-specific adjustments */
@media (max-width: 600px) {
  .v-card-text {
    padding: 1rem !important;
  }

  .text-headline-large {
    font-size: 1.5rem !important;
  }
}
</style>

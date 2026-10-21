<template>
  <v-container>
    <!-- Welcome verification success message -->
    <v-alert
      v-if="showWelcomeMessage"
      border="start"
      border-color="success"
      class="mb-6"
      closable
      elevation="1"
      icon="mdi-check-circle"
      prominent
      type="success"
      @click:close="showWelcomeMessage = false"
    >
      <v-alert-title class="text-headline-small mb-2">
        🎉 {{ $i18n('auth.emailVerifiedSuccessTitle') }}
      </v-alert-title>

      <div>{{ $i18n('auth.welcomeEmailVerified') }}</div>
    </v-alert>

    <!-- Loading State -->
    <div v-if="firebaseStore.classesLoading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-title-large mt-4">{{ $i18n('dashboard.loadingData') }}</p>
    </div>

    <!-- Error State -->
    <div v-if="firebaseStore.classesError" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.classesError"
        :title="$i18n('dashboard.errorLoadingData')"
        type="error"
        @click:close="firebaseStore.classesError = null"
      />
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="!firebaseStore.classesLoading">
      <MyFamilyCard />

      <ContactCards />

      <AdminTodoStrip
        v-if="authStore.isAdmin"
        :no-children="noChildrenCount"
        :not-emailed="notEmailedCount"
        :not-updated="notUpdatedCount"
        :pending-feedback="pendingFeedbackCount"
        :unassigned="unassignedCount"
      />

      <!-- Navigation Tiles -->
      <v-row>
        <v-col
          v-for="navItem in navigationItems"
          :key="navItem.route"
          cols="12"
          md="3"
          sm="6"
        >
          <v-card
            class="h-100"
            hover
            :to="navItem.route"
          >
            <v-card-text class="d-flex align-center ga-4">
              <v-icon :color="navItem.color" size="40">{{ navItem.icon }}</v-icon>

              <div>
                <div class="text-title-medium font-weight-bold">{{ navItem.title }}</div>

                <div class="text-body-small text-medium-emphasis">
                  {{ navItem.counts.map(c => `${c.count} ${c.label}`).join(' · ') }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup>
  import { collection, getDocs, query, where } from 'firebase/firestore'
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useTranslate } from '@/composables/useTranslate'
  import { ENTITY_STYLES } from '@/config/entities'
  import { db } from '@/firebase'
  import { FeedbackRepository } from '@/repositories/FeedbackRepository'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { getCurrentSchoolYear, isInCurrentSchoolYear } from '@/utils/schoolYear'

  const $i18n = useTranslate()
  const router = useRouter()
  const route = useRoute()

  // Welcome message state
  const showWelcomeMessage = ref(false)

  // Check for welcome query parameter on mount
  onMounted(() => {
    if (route.query.welcome === 'verified') {
      showWelcomeMessage.value = true
      // Clean up the URL
      router.replace({ path: '/', query: {} })
    }
  })

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()
  const authStore = useAuthStore()

  // Load DTO data for dashboard
  onMounted(async () => {
    try {
      // Load all DTO data in parallel
      await Promise.all([
        firebaseStore.loadStudentsDTO(),
        firebaseStore.loadParentsDTO(),
        firebaseStore.loadStaffDTO(),
        firebaseStore.loadCommitteesDTO(),
        firebaseStore.loadClasses(),
        authStore.isAdmin ? loadAdminTodo() : Promise.resolve(),
      ])
    } catch (error) {
      console.error('Error during dashboard initialization:', error)
    }
  })

  // Admin to-do: same rules as the filters on the admin lists the tiles link to
  const emailedParentIds = ref(null)
  const pendingFeedbackCount = ref(null)

  async function loadAdminTodo () {
    try {
      const [logsSnap, feedback] = await Promise.all([
        getDocs(query(
          collection(db, 'actionLogs'),
          where('entityType', '==', 'parent'),
          where('schoolYear', '==', getCurrentSchoolYear()),
          where('actionType', '==', 'send_update_email'),
        )),
        new FeedbackRepository().getAll(),
      ])
      emailedParentIds.value = new Set(logsSnap.docs.map(d => d.data().entityId))
      pendingFeedbackCount.value = feedback.filter(f => f.status === 'pending').length
    } catch (error) {
      console.error('Error loading admin to-do counts:', error)
    }
  }

  const notEmailedCount = computed(() => {
    if (!emailedParentIds.value) return null
    return firebaseStore.parentsDTO.filter(p => p.email && !emailedParentIds.value.has(p.id)).length
  })

  const notUpdatedCount = computed(() =>
    firebaseStore.parentsDTO.filter(p => !isInCurrentSchoolYear(p.lastUpdated)).length,
  )

  const noChildrenCount = computed(() => {
    const linkedParentIds = new Set(firebaseStore.studentsDTO.flatMap(s => [s.parent1_id, s.parent2_id]))
    return firebaseStore.parentsDTO.filter(p => !linkedParentIds.has(p.id)).length
  })

  const unassignedCount = computed(() =>
    firebaseStore.studentsDTO.filter(s => !s.className).length,
  )

  // Navigation tiles
  const navigationItems = computed(() => [
    {
      title: $i18n('nav.classes'),
      ...ENTITY_STYLES.class,
      route: '/classes',
      counts: [{ count: firebaseStore.classes.length, label: $i18n('dashboard.classes') }],
    },
    {
      title: $i18n('directory.title'),
      ...ENTITY_STYLES.family,
      route: '/families',
      counts: [
        { count: firebaseStore.studentsDTO.length, label: $i18n('dashboard.students') },
        { count: firebaseStore.parentsDTO.length, label: $i18n('dashboard.parents') },
      ],
    },
    {
      title: $i18n('nav.staff'),
      ...ENTITY_STYLES.staff,
      route: '/staff',
      counts: [{ count: firebaseStore.staffDTO.length, label: $i18n('dashboard.staffMembers') }],
    },
    {
      title: $i18n('nav.committees'),
      ...ENTITY_STYLES.committee,
      route: '/committees',
      counts: [{ count: firebaseStore.committeesDTO.length, label: $i18n('dashboard.committees') }],
    },
  ])
</script>

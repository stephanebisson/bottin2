<template>
  <v-container>
    <!-- Access Control -->
    <div v-if="!isAuthorized" class="text-center py-12">
      <v-icon color="error" size="64">mdi-shield-alert</v-icon>
      <h2 class="text-headline-small mt-4 text-error">{{ $i18n('admin.accessDenied') }}</h2>

      <p class="text-body-large text-grey-darken-1 mt-2">
        {{ $i18n('admin.adminAccessRequired') }}
      </p>

      <div class="mt-6">
        <p class="text-body-medium text-grey-darken-1 mb-4">
          {{ $i18n('admin.refreshPermissionsInstructions') }}
        </p>

        <v-btn
          color="primary"
          :loading="authLoading"
          prepend-icon="mdi-refresh"
          @click="checkAdminStatus"
        >
          {{ $i18n('admin.refreshAdminStatus') }}
        </v-btn>
      </div>
    </div>

    <div v-else>
      <!-- Filter Bar -->
      <v-row class="mb-4" density="compact">
        <v-col cols="6" sm="2">
          <v-select
            v-model="filterYear"
            density="compact"
            hide-details
            :items="schoolYearOptions"
            :label="$i18n('admin.auditLog.filterSchoolYear')"
            variant="outlined"
            @update:model-value="loadLogs"
          />
        </v-col>

        <v-col cols="6" sm="2">
          <v-select
            v-model="filterActionType"
            clearable
            density="compact"
            hide-details
            :items="actionTypeItems"
            :label="$i18n('admin.auditLog.filterActionType')"
            variant="outlined"
          />
        </v-col>

        <v-col cols="6" sm="2">
          <v-select
            v-model="filterEntityType"
            clearable
            density="compact"
            hide-details
            :items="entityTypeItems"
            :label="$i18n('admin.auditLog.filterEntityType')"
            variant="outlined"
          />
        </v-col>

        <v-col cols="12" sm="3">
          <v-text-field
            v-model="filterActor"
            clearable
            density="compact"
            hide-details
            :placeholder="$i18n('admin.auditLog.filterActor')"
            prepend-inner-icon="mdi-account-search"
            variant="outlined"
          />
        </v-col>

        <v-col cols="6" sm="2">
          <v-text-field
            v-model="filterDateFrom"
            clearable
            density="compact"
            hide-details
            :label="$i18n('admin.auditLog.filterDateFrom')"
            type="date"
            variant="outlined"
          />
        </v-col>

        <v-col class="d-flex align-center justify-center" cols="6" sm="1">
          <v-btn
            density="compact"
            icon="mdi-filter-remove"
            :title="$i18n('admin.auditLog.clearFilters')"
            variant="text"
            @click="clearFilters"
          />
        </v-col>
      </v-row>

      <!-- Data Table -->
      <v-card>
        <v-data-table
          class="elevation-0"
          density="compact"
          :headers="tableHeaders"
          :items="filteredLogs"
          :items-per-page="50"
          :loading="loading"
          :sort-by="[{ key: 'timestamp', order: 'desc' }]"
        >
          <!-- Timestamp Column -->
          <template #item.timestamp="{ item }">
            <span class="text-body-medium text-no-wrap">{{ formatDateTime(item.timestamp) }}</span>
          </template>

          <!-- Action Column -->
          <template #item.actionType="{ item }">
            <v-chip
              :color="ACTION_COLORS[item.actionType] || 'grey'"
              size="x-small"
              variant="tonal"
            >
              {{ $i18n(`admin.auditLog.actionTypes.${item.actionType}`) || item.actionType }}
            </v-chip>

            <v-chip
              v-if="item.actionType === 'send_update_email'"
              class="ml-1"
              size="x-small"
              variant="outlined"
            >
              {{ $i18n(`admin.auditLog.variants.${item.details?.variant || 'initial'}`) }}
            </v-chip>
          </template>

          <!-- Entity Type Column -->
          <template #item.entityType="{ item }">
            <span class="text-body-medium">
              {{ $i18n(`admin.auditLog.entityTypes.${item.entityType}`) || item.entityType }}
            </span>
          </template>

          <!-- No data slot -->
          <template #no-data>
            <div class="text-center py-8 text-grey">
              {{ $i18n('admin.auditLog.noLogs') }}
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
  import { collection, getDocs, query, where } from 'firebase/firestore'
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { db } from '@/firebase'
  import { useAuthStore } from '@/stores/auth'
  import { getCurrentSchoolYear } from '@/utils/schoolYear.js'

  definePage({ meta: { titleKey: 'admin.auditLog.title' } })

  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  const authStore = useAuthStore()

  const currentSchoolYear = getCurrentSchoolYear()
  const startYear = Number.parseInt(currentSchoolYear.split('-', 1)[0])

  const isAuthorized = ref(false)
  const authLoading = ref(false)
  const loading = ref(false)
  const logs = ref([])

  // Filters
  const filterYear = ref(currentSchoolYear)
  const filterActionType = ref(null)
  const filterEntityType = ref(null)
  const filterActor = ref('')
  const filterDateFrom = ref(null)

  const ACTION_COLORS = {
    send_update_email: 'info',
    opt_out_parent: 'warning',
    remove_parent: 'error',
    progress_student: 'success',
    graduate_student: 'secondary',
    depart_student: 'error',
    assign_class: 'primary',
  }

  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }
    try {
      authLoading.value = true
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      isAuthorized.value = !!idTokenResult.claims.admin
    } catch {
      isAuthorized.value = false
    } finally {
      authLoading.value = false
    }
  }

  const schoolYearOptions = computed(() => {
    const options = [{ title: $i18n('admin.auditLog.allYears'), value: 'all' }]
    for (let i = 0; i <= 4; i++) {
      const y = startYear - i
      options.push({ title: `${y}-${y + 1}`, value: `${y}-${y + 1}` })
    }
    return options
  })

  const actionTypeItems = computed(() => [
    { title: $i18n('admin.auditLog.actionTypeOptions.all'), value: null },
    ...Object.keys(ACTION_COLORS).map(key => ({
      title: $i18n(`admin.auditLog.actionTypes.${key}`) || key,
      value: key,
    })),
  ])

  const entityTypeItems = computed(() => [
    { title: $i18n('admin.auditLog.entityTypeOptions.all'), value: null },
    { title: $i18n('admin.auditLog.entityTypeOptions.parent'), value: 'parent' },
    { title: $i18n('admin.auditLog.entityTypeOptions.student'), value: 'student' },
  ])

  const tableHeaders = computed(() => [
    { title: $i18n('admin.auditLog.headers.timestamp'), key: 'timestamp', sortable: true, width: '150px' },
    { title: $i18n('admin.auditLog.headers.action'), key: 'actionType', sortable: false, width: '160px' },
    { title: $i18n('admin.auditLog.headers.entityType'), key: 'entityType', sortable: true, width: '100px' },
    { title: $i18n('admin.auditLog.headers.entityName'), key: 'entityName', sortable: true },
    { title: $i18n('admin.auditLog.headers.actor'), key: 'actor', sortable: true },
    { title: $i18n('admin.auditLog.headers.schoolYear'), key: 'schoolYear', sortable: true, width: '120px' },
  ])

  const filteredLogs = computed(() => {
    let result = logs.value

    if (filterActionType.value) {
      result = result.filter(l => l.actionType === filterActionType.value)
    }

    if (filterEntityType.value) {
      result = result.filter(l => l.entityType === filterEntityType.value)
    }

    if (filterActor.value) {
      const search = filterActor.value.toLowerCase()
      result = result.filter(l => l.actor?.toLowerCase().includes(search))
    }

    if (filterDateFrom.value) {
      const from = new Date(filterDateFrom.value).getTime()
      result = result.filter(l => {
        const ts = l.timestamp?.toMillis ? l.timestamp.toMillis() : new Date(l.timestamp || 0).getTime()
        return ts >= from
      })
    }

    return result
  })

  function formatDateTime (timestamp) {
    if (!timestamp) return '—'
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('fr-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function clearFilters () {
    filterActionType.value = null
    filterEntityType.value = null
    filterActor.value = ''
    filterDateFrom.value = null
  }

  async function loadLogs () {
    loading.value = true
    try {
      const q = filterYear.value === 'all'
        ? query(collection(db, 'actionLogs'))
        : query(
          collection(db, 'actionLogs'),
          where('schoolYear', '==', filterYear.value),
        )
      const snap = await getDocs(q)
      logs.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await loadLogs()
    }
  })
</script>

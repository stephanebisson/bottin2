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
          :loading="loading"
          prepend-icon="mdi-refresh"
          @click="checkAdminStatus"
        >
          {{ $i18n('admin.refreshAdminStatus') }}
        </v-btn>
      </div>
    </div>

    <!-- Parents Directory -->
    <div v-else>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular color="primary" indeterminate size="64" />
        <p class="text-title-large mt-4">{{ $i18n('common.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <v-icon color="error" size="64">mdi-alert-circle</v-icon>
        <h2 class="text-headline-small mt-4 text-error">{{ $i18n('common.error') }}</h2>
        <p class="text-body-large text-grey-darken-1 mt-2">{{ error }}</p>

        <v-btn class="mt-4" color="primary" @click="loadData">
          {{ $i18n('common.retry') }}
        </v-btn>
      </div>

      <!-- Parents Table -->
      <div v-else>
        <!-- Filter Bar: wraps onto more lines when space runs out -->
        <div class="d-flex flex-wrap align-center ga-2 mb-4">
          <v-text-field
            v-model="filterSearch"
            class="filter-search"
            clearable
            density="compact"
            hide-details
            :placeholder="$i18n('admin.parentsTable.filterSearch')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />

          <v-select
            v-model="filterClass"
            class="filter-select"
            clearable
            density="compact"
            hide-details
            :items="classOptions"
            :label="$i18n('admin.parentsTable.filterClass')"
            variant="outlined"
          />

          <v-select
            v-model="filterEmailStatus"
            class="filter-select"
            density="compact"
            hide-details
            :items="emailStatusItems"
            :label="$i18n('admin.parentsTable.filterEmailStatus')"
            variant="outlined"
          />

          <v-select
            v-model="filterSubmitted"
            class="filter-select"
            density="compact"
            hide-details
            :items="submittedItems"
            :label="$i18n('admin.parentsTable.filterSubmitted')"
            variant="outlined"
          />

          <v-select
            v-model="filterAccount"
            class="filter-select"
            density="compact"
            hide-details
            :items="accountItems"
            :label="$i18n('admin.parentsTable.filterAccount')"
            variant="outlined"
          />

          <v-chip-group v-model="toggleFilters" color="warning" filter multiple>
            <v-chip value="optedOut">{{ $i18n('admin.parentsTable.filterOptedOut') }}</v-chip>
            <v-chip value="noChildren">{{ $i18n('admin.parentsTable.filterNoChildren') }}</v-chip>
          </v-chip-group>
        </div>

        <!-- Selection Toolbar -->
        <v-toolbar
          v-if="selectedIds.length > 0"
          class="mb-2 rounded"
          color="blue-grey-lighten-5"
          density="compact"
          flat
        >
          <v-toolbar-title class="text-body-medium">
            {{ $i18n('admin.parentsTable.xSelected', selectedIds.length) }}
          </v-toolbar-title>

          <v-btn
            color="primary"
            density="compact"
            prepend-icon="mdi-email-send"
            size="small"
            variant="tonal"
            @click="openSendEmailDialog"
          >
            {{ $i18n('admin.parentsTable.sendEmail') }}
          </v-btn>

          <v-btn
            class="ml-2"
            color="warning"
            density="compact"
            prepend-icon="mdi-account-remove"
            size="small"
            variant="tonal"
            @click="openOptOutDialog"
          >
            {{ $i18n('admin.parentsTable.markOptedOut') }}
          </v-btn>

          <v-btn
            class="ml-2"
            color="error"
            density="compact"
            prepend-icon="mdi-delete"
            size="small"
            variant="tonal"
            @click="openRemoveDialog"
          >
            {{ $i18n('admin.parentsTable.removeParent') }}
          </v-btn>

          <v-btn
            class="ml-2"
            density="compact"
            icon="mdi-close"
            size="small"
            variant="text"
            @click="selectedIds = []"
          />
        </v-toolbar>

        <!-- Data Table -->
        <v-card>
          <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2 pa-4">
            <span>
              {{ $i18n('admin.parentsDirectory.allParents') }}
              <span class="text-body-medium text-grey-darken-1 ml-2">
                {{ $i18n('admin.parentsDirectory.totalParents', filteredParents.length) }}
              </span>
            </span>

            <v-btn
              color="primary"
              prepend-icon="mdi-account-plus"
              @click="openNewParentDialog"
            >
              {{ $i18n('admin.parentsDirectory.addNewParent') }}
            </v-btn>
          </v-card-title>

          <v-data-table
            v-model="selectedIds"
            v-model:page="tablePage"
            v-model:sort-by="sortBy"
            class="elevation-0"
            :headers="tableHeaders"
            item-value="id"
            :items="tableParents"
            :items-per-page="50"
            :row-props="getRowProps"
            show-select
            @update:sort-by="recentlyAddedIds = []"
          >
            <!-- First Name Column -->
            <template #item.first_name="{ item }">
              <span class="font-weight-medium">{{ item.first_name }}</span>
            </template>

            <!-- Last Name Column -->
            <template #item.last_name="{ item }">
              <span class="font-weight-medium">{{ item.last_name }}</span>
            </template>

            <!-- Email Column -->
            <template #item.email="{ item }">
              <a
                v-if="item.email"
                class="text-primary text-decoration-none parent-email"
                :href="`mailto:${item.email}`"
              >
                {{ item.email }}
              </a>

              <span v-else class="text-grey-darken-1 font-italic">{{ $i18n('common.notProvided') }}</span>
            </template>

            <!-- Phone Column -->
            <template #item.phone="{ item }">
              <span v-if="item.phone">{{ item.displayPhone }}</span>
              <span v-else class="text-grey-darken-1 font-italic">{{ $i18n('common.notProvided') }}</span>
            </template>

            <!-- Children Column -->
            <template #item.children="{ item }">
              <div v-if="item.childrenInfo && item.childrenInfo.length > 0">
                <div class="text-body-medium">
                  <div
                    v-for="child in item.childrenInfo"
                    :key="child.id"
                    class="mb-1 text-no-wrap"
                  >
                    <div>{{ child.fullName }}</div>

                    <div class="text-caption text-medium-emphasis">
                      {{ child.displayLevel }} - {{ getTeacherName(getClassTeacher(child.className)) || $i18n('admin.parentsDirectory.noTeacher') }}
                    </div>
                  </div>
                </div>
              </div>

              <span v-else class="text-grey-darken-1 font-italic">
                {{ $i18n('admin.parentsDirectory.noChildren') }}
              </span>
            </template>

            <!-- Status Column -->
            <template #item.status="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-chip
                  v-if="item.optedOut"
                  color="error"
                  size="x-small"
                  variant="tonal"
                >
                  {{ $i18n('admin.parentsTable.status.optedOut') }}
                </v-chip>

                <v-chip
                  v-if="emailSentMap.get(item.id)"
                  color="info"
                  size="x-small"
                  variant="tonal"
                >
                  {{ $i18n(`admin.parentsTable.status.sent.${getEmailVariant(emailSentMap.get(item.id))}`, formatDate(emailSentMap.get(item.id)?.timestamp)) }}
                </v-chip>

                <v-chip
                  v-if="accountStatuses.get(item.id) === 'active'"
                  color="primary"
                  size="x-small"
                  variant="tonal"
                >
                  {{ $i18n('admin.parentsTable.status.accountActive') }}
                </v-chip>

                <v-chip
                  v-else-if="accountStatuses.get(item.id) === 'unverified'"
                  color="grey"
                  size="x-small"
                  variant="tonal"
                >
                  {{ $i18n('admin.parentsTable.status.accountUnverified') }}
                </v-chip>

                <v-chip
                  v-if="submittedThisYear(item)"
                  color="success"
                  size="x-small"
                  variant="tonal"
                >
                  {{ $i18n('admin.parentsTable.status.submittedOn', formatDate(item.lastUpdated)) }}
                </v-chip>
              </div>
            </template>

            <!-- Log Column -->
            <template #item.log="{ item }">
              <v-chip
                v-if="parentLogs.get(item.id)"
                :color="getLogChipColor(item.id)"
                size="x-small"
                variant="tonal"
              >
                {{ getLogChip(item.id) }}
              </v-chip>
            </template>

            <!-- Actions Column -->
            <template #item.actions="{ item }">
              <v-btn
                color="primary"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openEditParentDialog(item)"
              />
            </template>
          </v-data-table>
        </v-card>
      </div>
    </div>

    <!-- Parent Form Dialog -->
    <v-dialog v-model="parentDialogOpen" max-width="500" :persistent="parentFormSaving">
      <v-card>
        <v-card-title>
          {{ editingParent ? $i18n('admin.parentsDirectory.editParent') : $i18n('admin.parentsDirectory.addNewParent') }}
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="parentForm.first_name"
            autofocus
            class="mb-2"
            density="compact"
            :label="$i18n('common.firstName')"
            variant="outlined"
          />

          <v-text-field
            v-model="parentForm.last_name"
            class="mb-2"
            density="compact"
            :label="$i18n('common.lastName')"
            variant="outlined"
          />

          <v-text-field
            v-model="parentForm.email"
            class="mb-2"
            density="compact"
            :label="$i18n('common.email')"
            :placeholder="$i18n('common.optional')"
            type="email"
            variant="outlined"
          />

          <v-text-field
            v-model="parentForm.phone"
            density="compact"
            :label="$i18n('common.phone')"
            :placeholder="$i18n('common.optional')"
            type="tel"
            variant="outlined"
          />

          <v-alert
            v-if="parentFormError"
            class="mt-3"
            type="error"
            variant="tonal"
          >
            {{ parentFormError }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn :disabled="parentFormSaving" variant="text" @click="parentDialogOpen = false">
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="primary"
            :loading="parentFormSaving"
            variant="tonal"
            @click="saveParentForm"
          >
            {{ $i18n('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Send Email Dialog -->
    <v-dialog v-model="sendEmailDialogOpen" max-width="500">
      <v-card>
        <v-card-title>{{ $i18n('admin.parentsTable.sendEmailDialog.title') }}</v-card-title>

        <v-card-text>
          <v-radio-group
            v-model="sendEmailVariant"
            density="compact"
            hide-details
            :label="$i18n('admin.parentsTable.sendEmailDialog.variantLabel')"
          >
            <v-radio
              v-for="variant in EMAIL_VARIANTS"
              :key="variant"
              :label="$i18n(`admin.parentsTable.sendEmailDialog.variants.${variant}`)"
              :value="variant"
            />
          </v-radio-group>

          <v-alert
            v-if="sendEmailAlreadySent > 0"
            class="my-3"
            type="warning"
            variant="tonal"
          >
            {{ $i18n('admin.parentsTable.sendEmailDialog.alreadySent', sendEmailAlreadySent) }}
          </v-alert>

          <v-alert
            v-if="sendEmailState.submitted.length > 0 || sendEmailState.optedOut.length > 0"
            class="my-3"
            type="warning"
            variant="tonal"
          >
            <div v-if="sendEmailState.submitted.length > 0">
              {{ $i18n('admin.parentsTable.sendEmailDialog.skippedSubmitted', sendEmailState.submitted.length) }}
            </div>

            <div v-if="sendEmailState.optedOut.length > 0">
              {{ $i18n('admin.parentsTable.sendEmailDialog.skippedOptedOut', sendEmailState.optedOut.length) }}
            </div>

            <v-checkbox
              v-model="sendEmailIncludeSkipped"
              density="compact"
              hide-details
              :label="$i18n('admin.parentsTable.sendEmailDialog.includeSkipped')"
            />
          </v-alert>

          <v-alert
            v-if="sendEmailState.noEmail > 0"
            class="mb-3"
            type="info"
            variant="tonal"
          >
            {{ $i18n('admin.parentsTable.sendEmailDialog.noEmail', sendEmailState.noEmail) }}
          </v-alert>

          <p>{{ $i18n('admin.parentsTable.sendEmailDialog.message', sendEmailTargets.length) }}</p>

          <v-alert
            v-if="sendEmailError"
            class="mt-3"
            type="error"
            variant="tonal"
          >
            {{ sendEmailError }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" @click="sendEmailDialogOpen = false">
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="primary"
            :disabled="sendEmailTargets.length === 0"
            :loading="sendEmailLoading"
            variant="tonal"
            @click="executeSendEmails"
          >
            {{ $i18n('admin.parentsTable.sendEmailDialog.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Opt Out Dialog -->
    <v-dialog v-model="optOutDialogOpen" max-width="500">
      <v-card>
        <v-card-title>{{ $i18n('admin.parentsTable.optOutDialog.title') }}</v-card-title>

        <v-card-text>
          <v-alert class="mb-3" type="warning" variant="tonal">
            {{ $i18n('admin.parentsTable.optOutDialog.warning') }}
          </v-alert>

          <p>{{ $i18n('admin.parentsTable.optOutDialog.message', selectedIds.length) }}</p>

          <v-alert
            v-if="optOutError"
            class="mt-3"
            type="error"
            variant="tonal"
          >
            {{ optOutError }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" @click="optOutDialogOpen = false">
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="warning"
            :loading="optOutLoading"
            variant="tonal"
            @click="executeOptOut"
          >
            {{ $i18n('admin.parentsTable.optOutDialog.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Dialog -->
    <v-dialog v-model="removeDialogOpen" max-width="500">
      <v-card>
        <v-card-title>{{ $i18n('admin.parentsTable.removeDialog.title') }}</v-card-title>

        <v-card-text>
          <v-alert class="mb-3" type="error" variant="tonal">
            {{ $i18n('admin.parentsTable.removeDialog.warning') }}
          </v-alert>

          <p>{{ $i18n('admin.parentsTable.removeDialog.message', selectedIds.length) }}</p>

          <v-alert
            v-if="removeError"
            class="mt-3"
            type="error"
            variant="tonal"
          >
            {{ removeError }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" @click="removeDialogOpen = false">
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="error"
            :loading="removeLoading"
            variant="tonal"
            @click="executeRemoveParents"
          >
            {{ $i18n('admin.parentsTable.removeDialog.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useRoute } from 'vue-router'
  import { getFunctionsBaseUrl, secureFetch } from '@/config/functions.js'
  import { db } from '@/firebase'
  import { ParentRepository } from '@/repositories/ParentRepository.js'
  import { StudentRepository } from '@/repositories/StudentRepository.js'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { getCurrentSchoolYear, isInCurrentSchoolYear } from '@/utils/schoolYear.js'
  import { normalizeText } from '@/utils/search.js'

  definePage({ meta: { titleKey: 'admin.parentsDirectory.title' } })

  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  const currentSchoolYear = getCurrentSchoolYear()

  // State
  const loading = ref(false)
  const error = ref(null)
  const parents = ref([])
  const students = ref([])
  const isAuthorized = ref(false)

  // Selection
  const selectedIds = ref([])

  // Table sorting/paging. Parents added this session stay pinned at the top
  // (newest first) until the admin sorts by a column header.
  const sortBy = ref([])
  const tablePage = ref(1)
  const recentlyAddedIds = ref([])

  // Filters (email status and submitted can be preset from the URL, e.g. links from the home page)
  const route = useRoute()
  const filterSearch = ref('')
  const filterClass = ref(null)
  const filterEmailStatus = ref(route.query.emailStatus === 'notSent' ? 'notSent' : 'all')
  const filterSubmitted = ref(route.query.submitted === 'no' ? 'no' : 'all')
  const filterAccount = ref('all')
  const filterOptedOut = ref(false)
  const filterNoChildren = ref(false)

  // The two on/off filters, shown as chips
  const toggleFilters = computed({
    get: () => [filterOptedOut.value && 'optedOut', filterNoChildren.value && 'noChildren'].filter(Boolean),
    set: values => {
      filterOptedOut.value = values.includes('optedOut')
      filterNoChildren.value = values.includes('noChildren')
    },
  })

  // Logs
  const parentLogs = ref(new Map())
  const emailSentMap = ref(new Map())
  const emailVariantsSentMap = ref(new Map())

  // Online directory account status by parent ID: 'active' | 'unverified' | 'none'
  const accountStatuses = ref(new Map())

  // Dialog state
  const sendEmailDialogOpen = ref(false)
  const sendEmailLoading = ref(false)
  const sendEmailError = ref(null)
  const sendEmailState = ref({ noEmail: 0, eligible: [], submitted: [], optedOut: [] })
  const sendEmailVariant = ref('initial')
  const sendEmailIncludeSkipped = ref(false)

  const optOutDialogOpen = ref(false)
  const optOutLoading = ref(false)
  const optOutError = ref(null)

  const removeDialogOpen = ref(false)
  const removeLoading = ref(false)
  const removeError = ref(null)

  const parentDialogOpen = ref(false)
  const editingParent = ref(null)
  const parentForm = ref({ first_name: '', last_name: '', email: '', phone: '' })
  const parentFormSaving = ref(false)
  const parentFormError = ref(null)

  // Repositories
  const parentRepository = new ParentRepository()
  const studentRepository = new StudentRepository()

  const EMAIL_VARIANTS = ['initial', 'reminder', 'final']

  const LOG_CHIP_COLORS = {
    send_update_email: 'info',
    opt_out_parent: 'warning',
    remove_parent: 'error',
  }

  function getTeacherName (teacherId) {
    if (!teacherId || !firebaseStore.staffDTO) return ''
    const teacher = firebaseStore.staffDTO.find(s => s.id === teacherId)
    return teacher ? teacher.fullName : ''
  }

  function getClassTeacher (className) {
    if (!className || !firebaseStore.classes) return null
    const classItem = firebaseStore.classes.find(c => c.classLetter === className)
    return classItem ? classItem.teacher : null
  }

  function formatDate (timestamp) {
    if (!timestamp) return ''
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })
  }

  function submittedThisYear (parent) {
    return isInCurrentSchoolYear(parent.lastUpdated)
  }

  // Logs written before email versions existed have no variant: they were initial emails
  function getEmailVariant (log) {
    return log?.details?.variant || 'initial'
  }

  function getLogChip (parentId) {
    const log = parentLogs.value.get(parentId)
    if (!log) return null
    return $i18n(`admin.parentsTable.logs.${log.actionType}`) || log.actionType
  }

  function getLogChipColor (parentId) {
    const log = parentLogs.value.get(parentId)
    if (!log) return 'grey'
    return LOG_CHIP_COLORS[log.actionType] || 'grey'
  }

  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }
    try {
      const idTokenResult = await authStore.user.getIdTokenResult(true)
      isAuthorized.value = !!idTokenResult.claims.admin
    } catch {
      isAuthorized.value = false
    }
  }

  const tableHeaders = computed(() => [
    { title: $i18n('common.firstName'), align: 'start', sortable: true, key: 'first_name' },
    { title: $i18n('common.lastName'), align: 'start', sortable: true, key: 'last_name' },
    { title: $i18n('common.email'), align: 'start', sortable: true, key: 'email' },
    { title: $i18n('common.phone'), align: 'start', sortable: false, key: 'phone', nowrap: true },
    { title: $i18n('admin.parentsDirectory.children'), align: 'start', sortable: false, key: 'children' },
    { title: $i18n('admin.parentsTable.headers.status'), align: 'start', sortable: false, key: 'status', width: '140px' },
    { title: $i18n('admin.parentsTable.headers.log'), align: 'start', sortable: false, key: 'log' },
    { title: $i18n('common.actions'), key: 'actions', sortable: false },
  ])

  const classOptions = computed(() => {
    if (!firebaseStore.classes) return []
    return firebaseStore.classes.map(c => c.classLetter).toSorted()
  })

  const emailStatusItems = computed(() => [
    { title: $i18n('admin.parentsTable.emailStatusOptions.all'), value: 'all' },
    { title: $i18n('admin.parentsTable.emailStatusOptions.sent'), value: 'sent' },
    ...EMAIL_VARIANTS.map(variant => ({ title: $i18n(`admin.parentsTable.emailStatusOptions.${variant}`), value: variant })),
    { title: $i18n('admin.parentsTable.emailStatusOptions.notSent'), value: 'notSent' },
  ])

  const accountItems = computed(() => [
    { title: $i18n('admin.parentsTable.accountOptions.all'), value: 'all' },
    { title: $i18n('admin.parentsTable.accountOptions.active'), value: 'active' },
    { title: $i18n('admin.parentsTable.accountOptions.notActive'), value: 'notActive' },
  ])

  const submittedItems = computed(() => [
    { title: $i18n('admin.parentsTable.submittedOptions.all'), value: 'all' },
    { title: $i18n('admin.parentsTable.submittedOptions.yes'), value: 'yes' },
    { title: $i18n('admin.parentsTable.submittedOptions.no'), value: 'no' },
  ])

  const sortedParents = computed(() => {
    if (parents.value.length === 0) return []
    const withChildren = parents.value.map(parent => {
      parent.childrenInfo = students.value.filter(s =>
        s.parent1_id === parent.id || s.parent2_id === parent.id,
      )
      return parent
    })
    return withChildren.toSorted((a, b) => {
      const first = a.first_name.localeCompare(b.first_name)
      if (first !== 0) return first
      return a.last_name.localeCompare(b.last_name)
    })
  })

  const filteredParents = computed(() => {
    let result = sortedParents.value

    if (filterSearch.value) {
      const search = normalizeText(filterSearch.value)
      result = result.filter(p =>
        normalizeText(p.first_name).includes(search)
        || normalizeText(p.last_name).includes(search)
        || normalizeText(p.email).includes(search),
      )
    }

    if (filterClass.value) {
      result = result.filter(p =>
        p.childrenInfo?.some(c => c.className === filterClass.value),
      )
    }

    if (filterEmailStatus.value === 'sent') {
      result = result.filter(p => emailSentMap.value.has(p.id))
    } else if (filterEmailStatus.value === 'notSent') {
      result = result.filter(p => p.email && !emailSentMap.value.has(p.id))
    } else if (EMAIL_VARIANTS.includes(filterEmailStatus.value)) {
      result = result.filter(p => emailSentMap.value.has(p.id) && getEmailVariant(emailSentMap.value.get(p.id)) === filterEmailStatus.value)
    }

    if (filterSubmitted.value === 'yes') {
      result = result.filter(p => submittedThisYear(p))
    } else if (filterSubmitted.value === 'no') {
      result = result.filter(p => !submittedThisYear(p))
    }

    if (filterAccount.value === 'active') {
      result = result.filter(p => accountStatuses.value.get(p.id) === 'active')
    } else if (filterAccount.value === 'notActive') {
      result = result.filter(p => accountStatuses.value.get(p.id) !== 'active')
    }

    if (filterOptedOut.value) {
      result = result.filter(p => p.optedOut)
    }

    if (filterNoChildren.value) {
      result = result.filter(p => !p.childrenInfo?.length)
    }

    return result
  })

  const tableParents = computed(() => {
    if (recentlyAddedIds.value.length === 0) return filteredParents.value
    const pinned = recentlyAddedIds.value
      .map(id => filteredParents.value.find(p => p.id === id))
      .filter(Boolean)
    const rest = filteredParents.value.filter(p => !recentlyAddedIds.value.includes(p.id))
    return [...pinned, ...rest]
  })

  function getRowProps ({ item }) {
    const hasChildren = item.childrenInfo && item.childrenInfo.length > 0
    if (!hasChildren) return { class: 'parent-no-children' }
    return {}
  }

  async function writeLog ({ actionType, entityId, entityName, details = {} }) {
    await addDoc(collection(db, 'actionLogs'), {
      actionType,
      actor: authStore.user?.email || 'unknown',
      entityType: 'parent',
      entityId,
      entityName,
      schoolYear: currentSchoolYear,
      timestamp: serverTimestamp(),
      details,
    })
  }

  async function loadParentLogs () {
    const snap = await getDocs(query(
      collection(db, 'actionLogs'),
      where('entityType', '==', 'parent'),
      where('schoolYear', '==', currentSchoolYear),
    ))

    const logMap = new Map()
    const emailMap = new Map()
    const emailVariantsMap = new Map()

    for (const logDoc of snap.docs) {
      const data = logDoc.data()
      const { entityId, actionType } = data
      const ts = data.timestamp?.toMillis() ?? 0

      if (!logMap.has(entityId) || ts > (logMap.get(entityId).timestamp?.toMillis() ?? 0)) {
        logMap.set(entityId, data)
      }
      if (actionType === 'send_update_email' && (!emailMap.has(entityId) || ts > (emailMap.get(entityId).timestamp?.toMillis() ?? 0))) {
        emailMap.set(entityId, data)
      }
      if (actionType === 'send_update_email') {
        if (!emailVariantsMap.has(entityId)) emailVariantsMap.set(entityId, new Set())
        emailVariantsMap.get(entityId).add(getEmailVariant(data))
      }
    }

    parentLogs.value = logMap
    emailSentMap.value = emailMap
    emailVariantsSentMap.value = emailVariantsMap
  }

  async function loadAccountStatuses () {
    const idToken = await authStore.user.getIdToken()
    const response = await secureFetch(`${getFunctionsBaseUrl()}/getParentAccountStatuses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    accountStatuses.value = new Map(Object.entries(data.statuses))
  }

  async function loadData () {
    loading.value = true
    error.value = null
    try {
      await Promise.all([
        (!firebaseStore.hasData || firebaseStore.isDataStale) ? firebaseStore.loadAllData() : Promise.resolve(),
        firebaseStore.loadStaffDTO(),
      ])
      const [parentsData, studentsData] = await Promise.all([
        parentRepository.getAll(),
        studentRepository.getAll(),
      ])
      parents.value = parentsData
      students.value = studentsData
      await Promise.all([loadParentLogs(), loadAccountStatuses()])
    } catch (error_) {
      error.value = error_.message || 'Failed to load data'
    } finally {
      loading.value = false
    }
  }

  // ==================== SELECTION ACTIONS ====================

  function openSendEmailDialog () {
    const selectedParents = filteredParents.value.filter(p => selectedIds.value.includes(p.id))
    const withEmail = selectedParents.filter(p => p.email)

    sendEmailState.value = {
      noEmail: selectedParents.length - withEmail.length,
      eligible: withEmail.filter(p => !p.optedOut && !submittedThisYear(p)),
      submitted: withEmail.filter(p => submittedThisYear(p)),
      optedOut: withEmail.filter(p => p.optedOut),
    }
    // Suggest the next version: initial until someone in the selection got an email this year
    sendEmailVariant.value = withEmail.some(p => emailSentMap.value.has(p.id)) ? 'reminder' : 'initial'
    sendEmailIncludeSkipped.value = false
    sendEmailError.value = null
    sendEmailDialogOpen.value = true
  }

  const sendEmailTargets = computed(() => {
    const { eligible, submitted, optedOut } = sendEmailState.value
    if (!sendEmailIncludeSkipped.value) return eligible
    return [...new Set([...eligible, ...submitted, ...optedOut])]
  })

  const sendEmailAlreadySent = computed(() =>
    sendEmailTargets.value.filter(p => emailVariantsSentMap.value.get(p.id)?.has(sendEmailVariant.value)).length,
  )

  async function executeSendEmails () {
    sendEmailLoading.value = true
    sendEmailError.value = null

    try {
      const idToken = await authStore.user.getIdToken()
      const baseUrl = getFunctionsBaseUrl()
      const errors = []

      const variant = sendEmailVariant.value
      for (const parent of sendEmailTargets.value) {
        try {
          const response = await secureFetch(`${baseUrl}/sendParentUpdateEmail`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ parentId: parent.id, variant }),
          })
          const data = await response.json()
          if (!response.ok) {
            errors.push(`${parent.fullName}: ${data.error}`)
            continue
          }
          await writeLog({
            actionType: 'send_update_email',
            entityId: parent.id,
            entityName: parent.fullName,
            details: { variant, accountStatus: data.accountStatus },
          })
        } catch (error_) {
          errors.push(`${parent.fullName}: ${error_.message}`)
        }
      }

      if (errors.length > 0) {
        sendEmailError.value = errors.join('\n')
        return
      }

      await loadParentLogs()
      selectedIds.value = []
      sendEmailDialogOpen.value = false
    } catch (error_) {
      sendEmailError.value = error_.message
    } finally {
      sendEmailLoading.value = false
    }
  }

  function openOptOutDialog () {
    optOutError.value = null
    optOutDialogOpen.value = true
  }

  async function executeOptOut () {
    optOutLoading.value = true
    optOutError.value = null

    const selectedParents = filteredParents.value.filter(p => selectedIds.value.includes(p.id))

    try {
      const batch = writeBatch(db)
      for (const parent of selectedParents) {
        batch.update(doc(db, 'parents', parent.id), {
          phone: '',
          address: '',
          city: '',
          postal_code: '',
          interests: [],
          optedOut: true,
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()

      // Remove committee memberships
      const committeesSnap = await getDocs(collection(db, 'committees'))
      for (const committeeDoc of committeesSnap.docs) {
        const membersSnap = await getDocs(collection(db, 'committees', committeeDoc.id, 'members'))
        const toDelete = membersSnap.docs.filter(m => {
          const data = m.data()
          return selectedParents.some(p => p.id === data.parentId || p.email === data.email)
        })
        await Promise.all(toDelete.map(m => deleteDoc(m.ref)))
      }

      for (const parent of selectedParents) {
        await writeLog({ actionType: 'opt_out_parent', entityId: parent.id, entityName: parent.fullName })
        parent.optedOut = true
        parent.phone = ''
        parent.address = ''
        parent.city = ''
        parent.postal_code = ''
        parent.interests = []
      }

      await loadParentLogs()
      selectedIds.value = []
      optOutDialogOpen.value = false
    } catch (error_) {
      optOutError.value = error_.message
    } finally {
      optOutLoading.value = false
    }
  }

  function openRemoveDialog () {
    removeError.value = null
    removeDialogOpen.value = true
  }

  async function executeRemoveParents () {
    removeLoading.value = true
    removeError.value = null

    const selectedParents = filteredParents.value.filter(p => selectedIds.value.includes(p.id))

    try {
      const batch = writeBatch(db)
      for (const parent of selectedParents) {
        batch.delete(doc(db, 'parents', parent.id))
      }
      await batch.commit()

      for (const parent of selectedParents) {
        await writeLog({ actionType: 'remove_parent', entityId: parent.id, entityName: parent.fullName })
      }

      const removedIds = new Set(selectedParents.map(p => p.id))
      parents.value = parents.value.filter(p => !removedIds.has(p.id))
      selectedIds.value = []
      removeDialogOpen.value = false
    } catch (error_) {
      removeError.value = error_.message
    } finally {
      removeLoading.value = false
    }
  }

  // ==================== ADD / EDIT DIALOG ====================

  function openNewParentDialog () {
    editingParent.value = null
    parentForm.value = { first_name: '', last_name: '', email: '', phone: '' }
    parentFormError.value = null
    parentDialogOpen.value = true
  }

  function openEditParentDialog (parentDTO) {
    editingParent.value = parentDTO
    parentForm.value = {
      first_name: parentDTO.first_name,
      last_name: parentDTO.last_name,
      email: parentDTO.email || '',
      phone: parentDTO.phone || '',
    }
    parentFormError.value = null
    parentDialogOpen.value = true
  }

  async function saveParentForm () {
    const data = {
      first_name: parentForm.value.first_name.trim(),
      last_name: parentForm.value.last_name.trim(),
      email: parentForm.value.email.trim(),
      phone: parentForm.value.phone.trim(),
    }
    if (!data.first_name || !data.last_name) {
      parentFormError.value = $i18n('admin.parentsDirectory.validation.required')
      return
    }
    const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
    if (data.email && !emailPattern.test(data.email)) {
      parentFormError.value = $i18n('admin.parentsDirectory.validation.invalidEmail')
      return
    }

    parentFormSaving.value = true
    parentFormError.value = null
    try {
      const parentDTO = editingParent.value
      if (parentDTO) {
        const updatedParentDTO = await parentRepository.update(parentDTO.id, data)
        parentDTO.first_name = updatedParentDTO.first_name
        parentDTO.last_name = updatedParentDTO.last_name
        parentDTO.email = updatedParentDTO.email
        parentDTO.phone = updatedParentDTO.phone
        parentDTO.updatedAt = updatedParentDTO.updatedAt
      } else {
        const createdParentDTO = await parentRepository.create(data)
        parents.value.push(createdParentDTO)
        sortBy.value = []
        recentlyAddedIds.value = [createdParentDTO.id, ...recentlyAddedIds.value]
        tablePage.value = 1
      }
      parentDialogOpen.value = false
    } catch (error_) {
      parentFormError.value = error_.message
    } finally {
      parentFormSaving.value = false
    }
  }

  onMounted(async () => {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await loadData()
    }
  })
</script>

<style scoped>
  .v-data-table {
    border-radius: 0;
  }

  .v-data-table :deep(th),
  .v-data-table :deep(td) {
    padding-inline: 6px !important;
  }

  .filter-search {
    flex: 1 1 320px;
  }

  .filter-select {
    flex: 1 1 160px;
    max-width: 220px;
  }

  .parent-email {
    overflow-wrap: anywhere;
  }

  :deep(.parent-no-children) {
    background-color: #fff3e0 !important;
  }

  :deep(.parent-no-children:hover) {
    background-color: #ffe0b2 !important;
  }
</style>

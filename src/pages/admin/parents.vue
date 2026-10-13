<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-display-medium font-weight-bold">{{ $i18n('admin.parentsDirectory.title') }}</h1>
    </div>

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
        <!-- Summary Stats -->
        <v-card class="mb-4" color="primary" variant="tonal">
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon class="mr-4" size="48">mdi-account-group</v-icon>

              <div>
                <h2 class="text-headline-small font-weight-bold">{{ $i18n('admin.parentsDirectory.summary') }}</h2>

                <p class="text-body-large mt-2">
                  {{ $i18n('admin.parentsDirectory.totalParents', filteredParents.length) }}
                </p>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Filter Bar -->
        <v-row class="mb-2" density="compact">
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="filterSearch"
              clearable
              density="compact"
              hide-details
              :placeholder="$i18n('admin.parentsTable.filterSearch')"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </v-col>

          <v-col cols="6" sm="2">
            <v-select
              v-model="filterClass"
              clearable
              density="compact"
              hide-details
              :items="classOptions"
              :label="$i18n('admin.parentsTable.filterClass')"
              variant="outlined"
            />
          </v-col>

          <v-col cols="6" sm="2">
            <v-select
              v-model="filterEmailStatus"
              density="compact"
              hide-details
              :items="emailStatusItems"
              :label="$i18n('admin.parentsTable.filterEmailStatus')"
              variant="outlined"
            />
          </v-col>

          <v-col cols="6" sm="2">
            <v-select
              v-model="filterSubmitted"
              density="compact"
              hide-details
              :items="submittedItems"
              :label="$i18n('admin.parentsTable.filterSubmitted')"
              variant="outlined"
            />
          </v-col>

          <v-col class="d-flex flex-column justify-center" cols="6" sm="2">
            <v-switch
              v-model="filterOptedOut"
              color="warning"
              density="compact"
              hide-details
              :label="$i18n('admin.parentsTable.filterOptedOut')"
            />

            <v-switch
              v-model="filterNoChildren"
              color="warning"
              density="compact"
              hide-details
              :label="$i18n('admin.parentsTable.filterNoChildren')"
            />
          </v-col>
        </v-row>

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
          <v-card-title>
            <div class="d-flex justify-space-between align-center w-100">
              <span class="text-headline-small">{{ $i18n('admin.parentsDirectory.allParents') }}</span>

              <v-btn
                color="primary"
                prepend-icon="mdi-account-plus"
                @click="createNewParent"
              >
                {{ $i18n('admin.parentsDirectory.addNewParent') }}
              </v-btn>
            </div>
          </v-card-title>

          <v-data-table
            v-model="selectedIds"
            class="elevation-0"
            :disable-sort="true"
            :headers="tableHeaders"
            item-value="id"
            :items="displayParents"
            :items-per-page="50"
            :row-props="getRowProps"
            show-select
          >
            <!-- First Name Column -->
            <template #item.first_name="{ item }">
              <v-text-field
                v-if="editingRows.has(getParentKey(item))"
                v-model="item.first_name"
                density="compact"
                hide-details
                variant="outlined"
              />

              <span v-else class="font-weight-medium">{{ item.first_name }}</span>
            </template>

            <!-- Last Name Column -->
            <template #item.last_name="{ item }">
              <v-text-field
                v-if="editingRows.has(getParentKey(item))"
                v-model="item.last_name"
                density="compact"
                hide-details
                variant="outlined"
              />

              <span v-else class="font-weight-medium">{{ item.last_name }}</span>
            </template>

            <!-- Email Column -->
            <template #item.email="{ item }">
              <v-text-field
                v-if="editingRows.has(getParentKey(item))"
                v-model="item.email"
                density="compact"
                hide-details
                :placeholder="$i18n('common.optional')"
                type="email"
                variant="outlined"
              />

              <a
                v-else-if="item.email"
                class="text-primary text-decoration-none parent-email"
                :href="`mailto:${item.email}`"
              >
                {{ item.email }}
              </a>

              <span v-else class="text-grey-darken-1 font-italic">{{ $i18n('common.notProvided') }}</span>
            </template>

            <!-- Phone Column -->
            <template #item.phone="{ item }">
              <v-text-field
                v-if="editingRows.has(getParentKey(item))"
                v-model="item.phone"
                density="compact"
                hide-details
                type="tel"
                variant="outlined"
              />

              <span v-else-if="item.phone">{{ item.displayPhone }}</span>
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
                  {{ $i18n('admin.parentsTable.status.emailSent') }} {{ formatDate(emailSentMap.get(item.id)?.timestamp) }}
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
              <div class="d-flex align-center ga-1">
                <template v-if="!editingRows.has(getParentKey(item))">
                  <v-btn
                    color="primary"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="startEditing(item)"
                  />
                </template>

                <template v-else>
                  <v-btn
                    color="success"
                    icon="mdi-check"
                    :loading="item._saving"
                    size="small"
                    variant="text"
                    @click="saveParent(item)"
                  />

                  <v-btn
                    color="grey"
                    :disabled="item._saving"
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    @click="cancelEditing(item)"
                  />
                </template>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </div>
    </div>

    <!-- Send Email Dialog -->
    <v-dialog v-model="sendEmailDialogOpen" max-width="500">
      <v-card>
        <v-card-title>{{ $i18n('admin.parentsTable.sendEmailDialog.title') }}</v-card-title>

        <v-card-text>
          <v-alert
            v-if="sendEmailState.alreadySent > 0"
            class="mb-3"
            type="warning"
            variant="tonal"
          >
            {{ $i18n('admin.parentsTable.sendEmailDialog.alreadySent', sendEmailState.alreadySent) }}
          </v-alert>

          <v-alert
            v-if="sendEmailState.noEmail > 0"
            class="mb-3"
            type="info"
            variant="tonal"
          >
            {{ $i18n('admin.parentsTable.sendEmailDialog.noEmail', sendEmailState.noEmail) }}
          </v-alert>

          <p>{{ $i18n('admin.parentsTable.sendEmailDialog.message', sendEmailState.withEmail) }}</p>

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
            :disabled="sendEmailState.withEmail === 0"
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
  import { getFunctionsBaseUrl, secureFetch } from '@/config/functions.js'
  import { db } from '@/firebase'
  import { ParentRepository } from '@/repositories/ParentRepository.js'
  import { StudentRepository } from '@/repositories/StudentRepository.js'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { getCurrentSchoolYear } from '@/utils/schoolYear.js'

  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  const currentSchoolYear = getCurrentSchoolYear()
  const schoolYearStartYear = Number.parseInt(currentSchoolYear.split('-', 1)[0])
  const schoolYearStart = new Date(schoolYearStartYear, 6, 1)

  // State
  const loading = ref(false)
  const error = ref(null)
  const parents = ref([])
  const students = ref([])
  const editingRows = ref(new Set())
  const newParent = ref(null)
  const isAuthorized = ref(false)

  // Selection
  const selectedIds = ref([])

  // Filters
  const filterSearch = ref('')
  const filterClass = ref(null)
  const filterEmailStatus = ref('all')
  const filterSubmitted = ref('all')
  const filterOptedOut = ref(false)
  const filterNoChildren = ref(false)

  // Logs
  const parentLogs = ref(new Map())
  const emailSentMap = ref(new Map())

  // Dialog state
  const sendEmailDialogOpen = ref(false)
  const sendEmailLoading = ref(false)
  const sendEmailError = ref(null)
  const sendEmailState = ref({ withEmail: 0, noEmail: 0, alreadySent: 0, parents: [] })

  const optOutDialogOpen = ref(false)
  const optOutLoading = ref(false)
  const optOutError = ref(null)

  const removeDialogOpen = ref(false)
  const removeLoading = ref(false)
  const removeError = ref(null)

  // Repositories
  const parentRepository = new ParentRepository()
  const studentRepository = new StudentRepository()

  const LOG_CHIP_COLORS = {
    send_update_email: 'info',
    opt_out_parent: 'warning',
    remove_parent: 'error',
  }

  function getParentKey (parent) {
    return parent._tempEmail || parent.id || parent.email
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
    if (!parent.lastUpdated) return false
    const ts = parent.lastUpdated?.toMillis ? parent.lastUpdated.toMillis() : new Date(parent.lastUpdated).getTime()
    return ts >= schoolYearStart.getTime()
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
    { title: $i18n('common.firstName'), align: 'start', sortable: false, key: 'first_name' },
    { title: $i18n('common.lastName'), align: 'start', sortable: false, key: 'last_name' },
    { title: $i18n('common.email'), align: 'start', sortable: false, key: 'email' },
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
    { title: $i18n('admin.parentsTable.emailStatusOptions.notSent'), value: 'notSent' },
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
      const search = filterSearch.value.toLowerCase()
      result = result.filter(p =>
        p.first_name.toLowerCase().includes(search)
        || p.last_name.toLowerCase().includes(search)
        || p.email.toLowerCase().includes(search),
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
    }

    if (filterSubmitted.value === 'yes') {
      result = result.filter(p => submittedThisYear(p))
    } else if (filterSubmitted.value === 'no') {
      result = result.filter(p => !submittedThisYear(p))
    }

    if (filterOptedOut.value) {
      result = result.filter(p => p.optedOut)
    }

    if (filterNoChildren.value) {
      result = result.filter(p => !p.childrenInfo?.length)
    }

    return result
  })

  const displayParents = computed(() => {
    if (newParent.value) {
      return [newParent.value, ...filteredParents.value]
    }
    return filteredParents.value
  })

  function getRowProps ({ item }) {
    if (item._isNew) return {}
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
    }

    parentLogs.value = logMap
    emailSentMap.value = emailMap
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
      await loadParentLogs()
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
    const noEmail = selectedParents.filter(p => !p.email)
    const alreadySent = withEmail.filter(p => emailSentMap.value.has(p.id))

    sendEmailState.value = {
      withEmail: withEmail.length,
      noEmail: noEmail.length,
      alreadySent: alreadySent.length,
      parents: withEmail,
    }
    sendEmailError.value = null
    sendEmailDialogOpen.value = true
  }

  async function executeSendEmails () {
    sendEmailLoading.value = true
    sendEmailError.value = null

    try {
      const idToken = await authStore.user.getIdToken()
      const baseUrl = getFunctionsBaseUrl()
      const errors = []

      for (const parent of sendEmailState.value.parents) {
        try {
          const response = await secureFetch(`${baseUrl}/sendParentUpdateEmail`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ parentId: parent.id }),
          })
          if (!response.ok) {
            const data = await response.json()
            errors.push(`${parent.fullName}: ${data.error}`)
            continue
          }
          await writeLog({ actionType: 'send_update_email', entityId: parent.id, entityName: parent.fullName })
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
          chat: false,
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

  // ==================== INLINE EDITING ====================

  function startEditing (parentDTO) {
    parentDTO._originalValues = {
      first_name: parentDTO.first_name,
      last_name: parentDTO.last_name,
      email: parentDTO.email,
      phone: parentDTO.phone,
    }
    editingRows.value.add(getParentKey(parentDTO))
  }

  function cancelNewParent () {
    if (newParent.value) {
      editingRows.value.delete(getParentKey(newParent.value))
      newParent.value = null
    }
  }

  function cancelEditing (parentDTO) {
    if (newParent.value && getParentKey(parentDTO) === getParentKey(newParent.value)) {
      cancelNewParent()
      return
    }
    if (parentDTO._originalValues) {
      parentDTO.first_name = parentDTO._originalValues.first_name
      parentDTO.last_name = parentDTO._originalValues.last_name
      parentDTO.email = parentDTO._originalValues.email
      parentDTO.phone = parentDTO._originalValues.phone
      delete parentDTO._originalValues
    }
    editingRows.value.delete(getParentKey(parentDTO))
  }

  function createNewParent () {
    if (newParent.value) return
    const tempEmail = 'new-parent-' + Date.now() + '@temp.com'
    newParent.value = {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      displayPhone: '',
      fullName: '',
      childrenInfo: [],
      _isNew: true,
      _tempEmail: tempEmail,
    }
    editingRows.value.add(tempEmail)
  }

  async function saveNewParent () {
    if (!newParent.value) return
    try {
      newParent.value._saving = true
      if (!newParent.value.first_name.trim() || !newParent.value.last_name.trim()) {
        error.value = $i18n('admin.parentsDirectory.validation.required')
        setTimeout(() => {
          error.value = null
        }, 5000)
        return
      }
      if (newParent.value.email.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
        if (!emailPattern.test(newParent.value.email.trim())) {
          error.value = $i18n('admin.parentsDirectory.validation.invalidEmail')
          setTimeout(() => {
            error.value = null
          }, 5000)
          return
        }
      }
      const createdParentDTO = await parentRepository.create({
        first_name: newParent.value.first_name.trim(),
        last_name: newParent.value.last_name.trim(),
        email: newParent.value.email.trim(),
        phone: newParent.value.phone.trim() || '',
      })
      parents.value.push(createdParentDTO)
      editingRows.value.delete(getParentKey(newParent.value))
      newParent.value = null
    } catch (error_) {
      error.value = `Failed to create parent: ${error_.message}`
      setTimeout(() => {
        error.value = null
      }, 5000)
    } finally {
      if (newParent.value) newParent.value._saving = false
    }
  }

  async function saveParent (parentDTO) {
    if (newParent.value && (getParentKey(parentDTO) === getParentKey(newParent.value) || parentDTO._isNew)) {
      await saveNewParent()
      return
    }
    try {
      parentDTO._saving = true
      const updatedParentDTO = await parentRepository.update(parentDTO.id || parentDTO.email, {
        first_name: parentDTO.first_name,
        last_name: parentDTO.last_name,
        email: parentDTO.email || '',
        phone: parentDTO.phone || '',
      })
      parentDTO.first_name = updatedParentDTO.first_name
      parentDTO.last_name = updatedParentDTO.last_name
      parentDTO.email = updatedParentDTO.email
      parentDTO.phone = updatedParentDTO.phone
      parentDTO.updatedAt = updatedParentDTO.updatedAt
      delete parentDTO._originalValues
      editingRows.value.delete(getParentKey(parentDTO))
    } catch (error_) {
      error.value = `Failed to update parent: ${error_.message}`
      setTimeout(() => {
        error.value = null
      }, 5000)
    } finally {
      parentDTO._saving = false
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

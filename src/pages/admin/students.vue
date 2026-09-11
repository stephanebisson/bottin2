<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $i18n('admin.studentsTable.title') }}</h1>
    </div>

    <!-- Access Control -->
    <div v-if="!isAuthorized" class="text-center py-12">
      <v-icon color="error" size="64">mdi-shield-alert</v-icon>
      <h2 class="text-h5 mt-4 text-error">{{ $i18n('admin.accessDenied') }}</h2>
      <p class="text-body-1 text-grey-darken-1 mt-2">{{ $i18n('admin.adminAccessRequired') }}</p>
    </div>

    <div v-else>
      <!-- Error -->
      <v-alert
        v-if="error"
        class="mb-4"
        closable
        color="error"
        icon="mdi-alert-circle"
        @click:close="error = null"
      >
        {{ error }}
      </v-alert>

      <!-- Filter Bar -->
      <v-row class="mb-4" dense>
        <v-col cols="12" sm="4">
          <v-text-field
            v-model="searchQuery"
            clearable
            density="compact"
            hide-details
            :label="$i18n('admin.studentsTable.filterSearch')"
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
            item-title="text"
            item-value="value"
            :items="classOptions"
            :label="$i18n('admin.studentsTable.filterClass')"
            variant="outlined"
          />
        </v-col>

        <v-col cols="6" sm="2">
          <v-select
            v-model="filterLevel"
            clearable
            density="compact"
            hide-details
            :items="allLevelOptions"
            :label="$i18n('admin.studentsTable.filterLevel')"
            variant="outlined"
          />
        </v-col>

        <v-col class="d-flex align-center" cols="12" sm="4">
          <v-switch
            v-model="showUnassignedOnly"
            color="warning"
            density="compact"
            hide-details
            :label="$i18n('admin.studentsTable.filterUnassigned')"
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
        <v-toolbar-title class="text-body-2 font-weight-medium">
          {{ $i18n('admin.studentsTable.xSelected', selectedIds.length) }}
        </v-toolbar-title>

        <v-btn
          v-if="hasUnassignedSelected"
          class="mr-2"
          prepend-icon="mdi-google-classroom"
          size="small"
          variant="tonal"
          @click="openAssignClassDialog"
        >
          {{ $i18n('admin.studentsTable.assignClass') }}
        </v-btn>

        <v-btn
          class="mr-2"
          color="error"
          prepend-icon="mdi-logout"
          size="small"
          variant="tonal"
          @click="openDepartDialog"
        >
          {{ $i18n('admin.studentsTable.markDeparted') }}
        </v-btn>

        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="selectedIds = []"
        />
      </v-toolbar>

      <!-- Main Card -->
      <v-card>
        <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2 pa-4">
          <span>
            {{ $i18n('admin.studentsTable.tableTitle') }}
            <span class="text-body-2 text-grey-darken-1 ml-2">
              {{ $i18n('admin.studentsTable.totalStudents', filteredStudents.length) }}
            </span>
          </span>

          <div class="d-flex align-center ga-2">
            <v-btn
              color="warning"
              prepend-icon="mdi-school"
              variant="elevated"
              @click="openProgressDialog"
            >
              {{ $i18n('admin.studentsTable.progressAll') }}
            </v-btn>

            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              variant="elevated"
              @click="createNewStudent"
            >
              {{ $i18n('admin.studentsTable.newStudent') }}
            </v-btn>
          </div>
        </v-card-title>

        <!-- Data Table -->
        <v-data-table
          v-model="selectedIds"
          class="elevation-0"
          disable-sort
          :headers="headers"
          item-value="id"
          :items="filteredStudents"
          :items-per-page="50"
          :loading="loading"
          show-select
          :sort-by="[]"
        >
          <!-- First Name -->
          <template #item.first_name="{ item }">
            <v-text-field
              v-if="editingRows.has(item.id)"
              v-model="item.first_name"
              density="compact"
              hide-details
              variant="outlined"
            />

            <span v-else class="font-weight-medium">{{ item.first_name }}</span>
          </template>

          <!-- Last Name -->
          <template #item.last_name="{ item }">
            <v-text-field
              v-if="editingRows.has(item.id)"
              v-model="item.last_name"
              density="compact"
              hide-details
              variant="outlined"
            />

            <span v-else class="font-weight-medium">{{ item.last_name }}</span>
          </template>

          <!-- Class -->
          <template #item.className="{ item }">
            <v-select
              v-if="editingRows.has(item.id)"
              v-model="item.className"
              density="compact"
              hide-details
              item-title="text"
              item-value="value"
              :items="classOptions"
              style="min-width: 140px"
              variant="outlined"
            >
              <template #selection="{ item: sel }">
                <span class="font-weight-medium">{{ sel.title }}</span>
              </template>
            </v-select>

            <v-chip
              v-else-if="!item.className"
              color="orange"
              size="small"
              variant="tonal"
            >
              —
            </v-chip>

            <span v-else class="font-weight-medium">
              {{ classOptions.find(c => c.value === item.className)?.text || item.className }}
            </span>
          </template>

          <!-- Level -->
          <template #item.level="{ item }">
            <v-select
              v-if="editingRows.has(item.id)"
              v-model="item.level"
              density="compact"
              hide-details
              :items="getLevelOptions(item.className)"
              style="min-width: 70px"
              variant="outlined"
            >
              <template #selection="{ item: sel }">
                <span class="font-weight-medium">{{ sel.title }}</span>
              </template>
            </v-select>

            <span v-else class="font-weight-medium">{{ item.level }}</span>
          </template>

          <!-- Parents -->
          <template #item.parents="{ item }">
            <div v-if="editingRows.has(item.id)" class="d-flex flex-column ga-1">
              <v-autocomplete
                v-model="item.parent1_id"
                clearable
                density="compact"
                hide-details
                item-title="fullName"
                item-value="id"
                :items="parentOptions"
                placeholder="Parent 1"
                variant="outlined"
              />

              <v-autocomplete
                v-model="item.parent2_id"
                clearable
                density="compact"
                hide-details
                item-title="fullName"
                item-value="id"
                :items="parentOptions"
                placeholder="Parent 2"
                variant="outlined"
              />
            </div>

            <div v-else class="d-flex flex-column">
              <span v-if="item.parent1_id" class="text-body-2 mb-1">{{ getParentDisplayName(item.parent1_id) }}</span>
              <span v-if="item.parent2_id" class="text-body-2">{{ getParentDisplayName(item.parent2_id) }}</span>

              <span v-if="!item.parent1_id && !item.parent2_id" class="text-grey-darken-1 font-italic">
                {{ $i18n('admin.studentsTable.noParent') }}
              </span>
            </div>
          </template>

          <!-- Log chip -->
          <template #item.log="{ item }">
            <v-chip
              v-if="getLogChip(item.id)"
              :color="getLogChipColor(item.id)"
              size="small"
              variant="tonal"
            >
              {{ getLogChip(item.id) }}
            </v-chip>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex align-center ga-1">
              <template v-if="!editingRows.has(item.id)">
                <v-btn
                  color="primary"
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="startEditing(item)"
                />

                <v-btn
                  color="error"
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  @click="openDeleteStudentDialog(item)"
                />
              </template>

              <template v-else>
                <v-btn
                  color="success"
                  icon="mdi-check"
                  :loading="item._saving"
                  size="small"
                  variant="text"
                  @click="saveStudent(item)"
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

          <!-- No data -->
          <template #no-data>
            <div class="text-center pa-12">
              <v-icon color="grey-lighten-1" size="64">mdi-school-outline</v-icon>
              <p class="text-h6 mt-4 text-grey-darken-1">{{ $i18n('admin.studentsTable.noStudents') }}</p>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- Progress All Dialog -->
    <v-dialog v-model="showProgressDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-warning text-white d-flex align-center pa-4">
          <v-icon class="mr-2">mdi-school</v-icon>
          {{ $i18n('admin.studentsTable.progressDialog.title') }}
        </v-card-title>

        <v-card-text class="pt-6">
          <v-alert class="mb-4" color="warning" icon="mdi-alert" variant="tonal">
            {{ $i18n('admin.studentsTable.progressDialog.warning') }}
          </v-alert>

          <div class="d-flex flex-column ga-3">
            <div class="d-flex align-center ga-2">
              <v-icon color="success">mdi-arrow-up-circle</v-icon>
              <span>{{ $i18n('admin.studentsTable.progressDialog.autoProgress', progressionPlan.auto.length) }}</span>
            </div>

            <div class="d-flex align-center ga-2">
              <v-icon color="orange">mdi-swap-horizontal</v-icon>
              <span>{{ $i18n('admin.studentsTable.progressDialog.needsAssignment', progressionPlan.needsAssignment.length) }}</span>
            </div>

            <div class="d-flex align-center ga-2">
              <v-icon color="error">mdi-graduation-cap</v-icon>
              <span>{{ $i18n('admin.studentsTable.progressDialog.graduating', progressionPlan.graduating.length) }}</span>
            </div>

            <div v-if="progressionPlan.invalid.length > 0" class="d-flex align-center ga-2">
              <v-icon color="grey">mdi-alert-circle-outline</v-icon>
              <span>{{ $i18n('admin.studentsTable.progressDialog.invalid', progressionPlan.invalid.length) }}</span>
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn color="grey" :disabled="progressingAll" variant="text" @click="showProgressDialog = false">
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn color="warning" :loading="progressingAll" variant="flat" @click="executeProgressAll">
            {{ $i18n('admin.studentsTable.progressDialog.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Depart Dialog -->
    <v-dialog v-model="showDepartDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="bg-error text-white d-flex align-center pa-4">
          <v-icon class="mr-2">mdi-logout</v-icon>
          {{ $i18n('admin.studentsTable.departDialog.title') }}
        </v-card-title>

        <v-card-text class="pt-6">
          <v-alert class="mb-4" color="error" icon="mdi-alert" variant="tonal">
            {{ $i18n('admin.studentsTable.departDialog.warning') }}
          </v-alert>

          <p class="mb-3">{{ $i18n('admin.studentsTable.departDialog.message', selectedIds.length) }}</p>

          <v-list class="bg-grey-lighten-4 rounded" density="compact">
            <v-list-item
              v-for="student in selectedStudents"
              :key="student.id"
              :subtitle="`${student.className || '—'} · Niveau ${student.level}`"
              :title="student.fullName"
            />
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn color="grey" :disabled="departingInProgress" variant="text" @click="showDepartDialog = false">
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn color="error" :loading="departingInProgress" variant="flat" @click="executeDeparture">
            {{ $i18n('admin.studentsTable.departDialog.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Assign Class Dialog -->
    <v-dialog v-model="showAssignClassDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white d-flex align-center pa-4">
          <v-icon class="mr-2">mdi-google-classroom</v-icon>
          {{ $i18n('admin.studentsTable.assignClassDialog.title') }}
        </v-card-title>

        <v-card-text class="pt-6">
          <p class="mb-4">
            {{ $i18n('admin.studentsTable.assignClassDialog.message', unassignedSelected.length) }}
          </p>

          <v-select
            v-model="assignClassTarget"
            density="compact"
            item-title="text"
            item-value="value"
            :items="assignableClassOptions"
            :label="$i18n('admin.studentsTable.assignClassDialog.selectClass')"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn color="grey" :disabled="assigningClass" variant="text" @click="showAssignClassDialog = false">
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="primary"
            :disabled="!assignClassTarget"
            :loading="assigningClass"
            variant="flat"
            @click="executeAssignClass"
          >
            {{ $i18n('admin.studentsTable.assignClassDialog.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Individual Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-error text-white">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="white" size="large">mdi-alert-circle</v-icon>
            <span class="text-h5">{{ $i18n('admin.parentsDirectory.confirmDeleteStudent') }}</span>
          </div>
        </v-card-title>

        <v-card-text class="pt-6">
          <v-alert class="mb-4" color="error" icon="mdi-alert" variant="tonal">
            <div class="text-body-1 font-weight-bold mb-2">
              {{ $i18n('admin.parentsDirectory.deleteStudentWarning') }}
            </div>
          </v-alert>

          <div v-if="studentToDelete" class="mb-4">
            <div class="text-h6 mb-2">{{ studentToDelete.fullName }}</div>

            <div class="text-body-2 text-grey-darken-1">
              {{ studentToDelete.displayLevel }} - {{ studentToDelete.className }}
            </div>
          </div>

          <p class="text-body-1 mb-4">{{ $i18n('admin.parentsDirectory.deleteStudentExplanation') }}</p>
          <v-divider class="my-4" />

          <div class="mb-4">
            <p class="text-body-1 font-weight-bold mb-2">
              {{ $i18n('admin.parentsDirectory.deleteStudentConfirmation') }}
            </p>

            <v-text-field
              v-model="deleteConfirmationText"
              class="mt-2"
              color="error"
              density="comfortable"
              :error="deleteConfirmationError"
              :error-messages="deleteConfirmationErrorMessage"
              hide-details="auto"
              :placeholder="$i18n('admin.parentsDirectory.typeDeleteToConfirm')"
              variant="outlined"
              @keyup.enter="confirmDeleteStudent"
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn color="grey" :disabled="deletingStudent" variant="text" @click="cancelDeleteStudent">
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="error"
            :disabled="!isDeleteConfirmed"
            :loading="deletingStudent"
            variant="flat"
            @click="confirmDeleteStudent"
          >
            {{ $i18n('admin.parentsDirectory.deleteStudent') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
  import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { CLASS_LEVEL_MAPPING, getValidLevelsForClass } from '@/config/classLevels'
  import { StudentDTO } from '@/dto/StudentDTO.js'
  import { db } from '@/firebase'
  import { ClassRepository } from '@/repositories/ClassRepository'
  import { ParentRepository } from '@/repositories/ParentRepository'
  import { StudentRepository } from '@/repositories/StudentRepository'
  import { useAuthStore } from '@/stores/auth'
  import { getCurrentSchoolYear } from '@/utils/schoolYear'

  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  const authStore = useAuthStore()

  // ─── State ────────────────────────────────────────────────────────────────────

  const loading = ref(false)
  const error = ref(null)
  const students = ref([])
  const classOptions = ref([])
  const parentOptions = ref([])
  const editingRows = ref(new Set())
  const newStudent = ref(null)
  const isAuthorized = ref(false)

  // Filters
  const searchQuery = ref('')
  const filterClass = ref(null)
  const filterLevel = ref(null)
  const showUnassignedOnly = ref(false)

  // Selection
  const selectedIds = ref([])

  // Log chips
  const studentLogs = ref(new Map())

  // Progress All
  const showProgressDialog = ref(false)
  const progressionPlan = ref({ auto: [], needsAssignment: [], graduating: [], invalid: [] })
  const progressingAll = ref(false)

  // Depart
  const showDepartDialog = ref(false)
  const departingInProgress = ref(false)

  // Assign Class
  const showAssignClassDialog = ref(false)
  const assignClassTarget = ref(null)
  const assigningClass = ref(false)

  // Delete Individual
  const showDeleteDialog = ref(false)
  const studentToDelete = ref(null)
  const deleteConfirmationText = ref('')
  const deleteConfirmationError = ref(false)
  const deleteConfirmationErrorMessage = ref('')
  const deletingStudent = ref(false)

  // ─── Computed ─────────────────────────────────────────────────────────────────

  const displayStudents = computed(() => {
    if (newStudent.value) return [newStudent.value, ...students.value]
    return students.value
  })

  const filteredStudents = computed(() => {
    let result = displayStudents.value
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(s =>
        s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q),
      )
    }
    if (filterClass.value) result = result.filter(s => s.className === filterClass.value)
    if (filterLevel.value !== null) result = result.filter(s => s.level === filterLevel.value)
    if (showUnassignedOnly.value) result = result.filter(s => !s.className)
    return result
  })

  const selectedStudents = computed(() =>
    selectedIds.value.map(idOrItem => {
      if (typeof idOrItem === 'object' && idOrItem !== null) return idOrItem
      return students.value.find(s => s.id === idOrItem)
    }).filter(Boolean),
  )

  const unassignedSelected = computed(() => selectedStudents.value.filter(s => !s.className))

  const hasUnassignedSelected = computed(() => unassignedSelected.value.length > 0)

  const allLevelOptions = computed(() =>
    [1, 2, 3, 4, 5, 6].map(l => ({ title: String(l), value: l })),
  )

  // Filter class options to those valid for the unassigned students' level(s)
  const assignableClassOptions = computed(() => {
    const uniqueLevels = [...new Set(unassignedSelected.value.map(s => s.level).filter(Boolean))]
    if (uniqueLevels.length === 1) {
      const targetLevel = uniqueLevels[0]
      const validLetters = new Set(Object.entries(CLASS_LEVEL_MAPPING)
        .filter(([, levels]) => levels.includes(targetLevel))
        .map(([letter]) => letter))
      return classOptions.value.filter(c => validLetters.has(c.value))
    }
    return classOptions.value
  })

  const isDeleteConfirmed = computed(() => {
    const expectedText = $i18n('admin.delete').toUpperCase()
    return deleteConfirmationText.value.trim().toUpperCase() === expectedText
  })

  const headers = computed(() => [
    { title: $i18n('admin.studentsTable.headers.firstName'), key: 'first_name', sortable: false, width: '120px' },
    { title: $i18n('admin.studentsTable.headers.lastName'), key: 'last_name', sortable: false, width: '120px' },
    { title: $i18n('admin.studentsTable.headers.class'), key: 'className', sortable: false, width: '150px' },
    { title: $i18n('admin.studentsTable.headers.level'), key: 'level', sortable: false, width: '80px' },
    { title: $i18n('admin.studentsTable.headers.parents'), key: 'parents', sortable: false },
    { title: $i18n('admin.studentsTable.headers.log'), key: 'log', sortable: false, width: '170px' },
    { title: $i18n('common.actions'), key: 'actions', sortable: false, width: '100px' },
  ])

  // ─── Auth ─────────────────────────────────────────────────────────────────────

  async function checkAdminStatus () {
    if (!authStore.isAuthenticated || !authStore.user) {
      isAuthorized.value = false
      return
    }
    try {
      const result = await authStore.user.getIdTokenResult(true)
      isAuthorized.value = !!result.claims.admin
    } catch {
      isAuthorized.value = false
    }
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────────

  async function loadStudents () {
    try {
      loading.value = true
      error.value = null
      const repo = new StudentRepository()
      const dtos = await repo.getAll()
      students.value = dtos.toSorted((a, b) => {
        const la = a.level === null ? Number.MAX_SAFE_INTEGER : a.level
        const lb = b.level === null ? Number.MAX_SAFE_INTEGER : b.level
        if (la !== lb) return la - lb
        const ca = a.className || '\uFFFF'
        const cb = b.className || '\uFFFF'
        if (ca !== cb) return ca < cb ? -1 : 1
        if (a.first_name !== b.first_name) return a.first_name < b.first_name ? -1 : 1
        return a.last_name < b.last_name ? -1 : 1
      })
    } catch {
      error.value = $i18n('admin.studentsTable.loadError')
    } finally {
      loading.value = false
    }
  }

  async function loadClassOptions () {
    try {
      classOptions.value = await new ClassRepository().getClassDropdownOptions()
    } catch {}
  }

  async function loadParentOptions () {
    try {
      const parents = await new ParentRepository().getAll()
      parentOptions.value = parents.map(p => ({ id: p.id, fullName: p.fullName }))
    } catch {}
  }

  async function loadStudentLogs () {
    try {
      const q = query(
        collection(db, 'actionLogs'),
        where('entityType', '==', 'student'),
        where('schoolYear', '==', getCurrentSchoolYear()),
      )
      const snapshot = await getDocs(q)
      const map = new Map()
      for (const snap of snapshot.docs) {
        const data = snap.data()
        const existing = map.get(data.entityId)
        if (!existing || (data.timestamp?.seconds ?? 0) > (existing.timestamp?.seconds ?? 0)) {
          map.set(data.entityId, data)
        }
      }
      studentLogs.value = map
    } catch {}
  }

  // ─── Log Chips ────────────────────────────────────────────────────────────────

  const chipColors = {
    progress_student: 'blue',
    graduate_student: 'purple',
    depart_student: 'red',
    assign_class: 'green',
  }

  function getLogChip (studentId) {
    const log = studentLogs.value.get(studentId)
    if (!log) return null
    const label = $i18n(`admin.studentsTable.logs.${log.actionType}`)
    const date = log.timestamp?.toDate?.()
    const dateStr = date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
    return `${label} ${dateStr}`.trim()
  }

  function getLogChipColor (studentId) {
    const log = studentLogs.value.get(studentId)
    return log ? (chipColors[log.actionType] ?? 'grey') : 'grey'
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function getLevelOptions (classLetter) {
    return getValidLevelsForClass(classLetter).map(level => ({ title: String(level), value: level }))
  }

  function getParentDisplayName (parentId) {
    return parentOptions.value.find(p => p.id === parentId)?.fullName ?? parentId
  }

  async function writeLog (entry) {
    await addDoc(collection(db, 'actionLogs'), {
      actor: authStore.userEmail,
      entityType: 'student',
      schoolYear: getCurrentSchoolYear(),
      timestamp: serverTimestamp(),
      details: {},
      ...entry,
    })
  }

  // ─── Editing (inline row) ─────────────────────────────────────────────────────

  function startEditing (studentDTO) {
    studentDTO._originalValues = {
      first_name: studentDTO.first_name,
      last_name: studentDTO.last_name,
      className: studentDTO.className,
      level: studentDTO.level,
      parent1_id: studentDTO.parent1_id,
      parent2_id: studentDTO.parent2_id,
    }
    editingRows.value.add(studentDTO.id)
  }

  function cancelEditing (studentDTO) {
    if (newStudent.value && studentDTO.id === newStudent.value.id) {
      editingRows.value.delete(newStudent.value.id)
      newStudent.value = null
      return
    }
    if (studentDTO._originalValues) {
      Object.assign(studentDTO, studentDTO._originalValues)
      delete studentDTO._originalValues
    }
    editingRows.value.delete(studentDTO.id)
  }

  function createNewStudent () {
    if (newStudent.value) return
    const tempId = 'new-student-' + Date.now()
    newStudent.value = new StudentDTO({ id: tempId, first_name: '', last_name: '', className: '', level: null, parent1_id: null, parent2_id: null })
    editingRows.value.add(tempId)
  }

  async function saveNewStudent () {
    if (!newStudent.value) return
    try {
      newStudent.value._saving = true
      if (!newStudent.value.first_name.trim()) {
        error.value = $i18n('admin.studentsTable.validation.firstNameRequired')
        return
      }
      if (!newStudent.value.last_name.trim()) {
        error.value = $i18n('admin.studentsTable.validation.lastNameRequired')
        return
      }
      if (!newStudent.value.parent1_id && !newStudent.value.parent2_id) {
        error.value = $i18n('admin.studentsTable.validation.parentRequired')
        return
      }
      const created = await new StudentRepository().create({
        first_name: newStudent.value.first_name.trim(),
        last_name: newStudent.value.last_name.trim(),
        className: newStudent.value.className,
        level: newStudent.value.level,
        parent1_id: newStudent.value.parent1_id || null,
        parent2_id: newStudent.value.parent2_id || null,
      })
      students.value.unshift(created)
      editingRows.value.delete(newStudent.value.id)
      newStudent.value = null
    } catch {
      error.value = $i18n('admin.studentsTable.createError')
    } finally {
      if (newStudent.value) newStudent.value._saving = false
    }
  }

  async function saveStudent (studentDTO) {
    if (newStudent.value && studentDTO.id === newStudent.value.id) {
      await saveNewStudent()
      return
    }
    try {
      studentDTO._saving = true
      const updated = await new StudentRepository().update(studentDTO.id, {
        first_name: studentDTO.first_name,
        last_name: studentDTO.last_name,
        className: studentDTO.className,
        level: studentDTO.level,
        parent1_id: studentDTO.parent1_id || null,
        parent2_id: studentDTO.parent2_id || null,
      })
      Object.assign(studentDTO, {
        first_name: updated.first_name,
        last_name: updated.last_name,
        className: updated.className,
        level: updated.level,
        parent1_id: updated.parent1_id,
        parent2_id: updated.parent2_id,
        updatedAt: updated.updatedAt,
      })
      delete studentDTO._originalValues
      editingRows.value.delete(studentDTO.id)
    } catch {
      error.value = $i18n('admin.studentsTable.updateError')
    } finally {
      studentDTO._saving = false
    }
  }

  // ─── Progress All ─────────────────────────────────────────────────────────────

  function openProgressDialog () {
    const auto = [], needsAssignment = [], graduating = [], invalid = []
    for (const s of students.value) {
      switch (s.level) {
        case 6: {
          graduating.push(s)
          break
        }
        case 2:
        case 4: {
          needsAssignment.push(s)
          break
        }
        case 1:
        case 3:
        case 5: {
          auto.push(s)
          break
        }
        default: { invalid.push(s)
        }
      }
    }
    progressionPlan.value = { auto, needsAssignment, graduating, invalid }
    showProgressDialog.value = true
  }

  async function executeProgressAll () {
    progressingAll.value = true
    try {
      const { auto, needsAssignment, graduating } = progressionPlan.value
      const batch = writeBatch(db)

      for (const s of auto) {
        batch.update(doc(db, 'students', s.id), { level: s.level + 1, updatedAt: serverTimestamp() })
      }
      for (const s of needsAssignment) {
        batch.update(doc(db, 'students', s.id), { level: s.level + 1, className: null, updatedAt: serverTimestamp() })
      }
      for (const s of graduating) {
        batch.delete(doc(db, 'students', s.id))
      }

      const classesSnap = await getDocs(collection(db, 'classes'))
      for (const classDoc of classesSnap.docs) {
        batch.update(classDoc.ref, { parent_rep_1: null, parent_rep_2: null, student_rep_1: null, student_rep_2: null })
      }

      await batch.commit()

      await Promise.all([
        ...auto.map(s => writeLog({ actionType: 'progress_student', entityId: s.id, entityName: s.fullName, details: { fromLevel: s.level, toLevel: s.level + 1, fromClass: s.className, toClass: s.className } })),
        ...needsAssignment.map(s => writeLog({ actionType: 'progress_student', entityId: s.id, entityName: s.fullName, details: { fromLevel: s.level, toLevel: s.level + 1, fromClass: s.className, toClass: null, needsAssignment: true } })),
        ...graduating.map(s => writeLog({ actionType: 'graduate_student', entityId: s.id, entityName: s.fullName, details: { fromLevel: s.level, fromClass: s.className } })),
      ])

      showProgressDialog.value = false
      await loadStudents()
      await loadStudentLogs()
    } catch {
      error.value = $i18n('admin.studentsTable.progressError')
    } finally {
      progressingAll.value = false
    }
  }

  // ─── Mark as Departed ─────────────────────────────────────────────────────────

  function openDepartDialog () {
    showDepartDialog.value = true
  }

  async function executeDeparture () {
    departingInProgress.value = true
    try {
      const toDepart = selectedStudents.value
      const batch = writeBatch(db)
      for (const s of toDepart) batch.delete(doc(db, 'students', s.id))
      await batch.commit()
      await Promise.all(toDepart.map(s => writeLog({
        actionType: 'depart_student',
        entityId: s.id,
        entityName: s.fullName,
        details: { level: s.level, className: s.className },
      })))
      const departedIds = new Set(toDepart.map(s => s.id))
      students.value = students.value.filter(s => !departedIds.has(s.id))
      selectedIds.value = []
      showDepartDialog.value = false
    } catch {
      error.value = $i18n('admin.studentsTable.departError')
    } finally {
      departingInProgress.value = false
    }
  }

  // ─── Assign Class ─────────────────────────────────────────────────────────────

  function openAssignClassDialog () {
    assignClassTarget.value = null
    showAssignClassDialog.value = true
  }

  async function executeAssignClass () {
    if (!assignClassTarget.value) return
    assigningClass.value = true
    try {
      const targets = unassignedSelected.value
      const className = assignClassTarget.value
      const batch = writeBatch(db)
      for (const s of targets) batch.update(doc(db, 'students', s.id), { className, updatedAt: serverTimestamp() })
      await batch.commit()
      await Promise.all(targets.map(s => writeLog({
        actionType: 'assign_class',
        entityId: s.id,
        entityName: s.fullName,
        details: { fromClass: null, toClass: className, level: s.level },
      })))
      for (const s of targets) s.className = className
      await loadStudentLogs()
      selectedIds.value = []
      showAssignClassDialog.value = false
    } catch {
      error.value = $i18n('admin.studentsTable.assignClassError')
    } finally {
      assigningClass.value = false
    }
  }

  // ─── Delete Individual ────────────────────────────────────────────────────────

  function openDeleteStudentDialog (student) {
    studentToDelete.value = student
    deleteConfirmationText.value = ''
    deleteConfirmationError.value = false
    deleteConfirmationErrorMessage.value = ''
    showDeleteDialog.value = true
  }

  function cancelDeleteStudent () {
    showDeleteDialog.value = false
    studentToDelete.value = null
    deleteConfirmationText.value = ''
  }

  async function confirmDeleteStudent () {
    if (!isDeleteConfirmed.value) {
      deleteConfirmationError.value = true
      deleteConfirmationErrorMessage.value = $i18n('admin.parentsDirectory.deleteStudentMismatch')
      return
    }
    if (!studentToDelete.value) return
    deletingStudent.value = true
    try {
      const student = studentToDelete.value
      await new StudentRepository().delete(student.id)
      await writeLog({
        actionType: 'depart_student',
        entityId: student.id,
        entityName: student.fullName,
        details: { level: student.level, className: student.className },
      })
      students.value = students.value.filter(s => s.id !== student.id)
      showDeleteDialog.value = false
      studentToDelete.value = null
      deleteConfirmationText.value = ''
    } catch {
      deleteConfirmationError.value = true
      deleteConfirmationErrorMessage.value = $i18n('admin.parentsDirectory.deleteStudentError')
    } finally {
      deletingStudent.value = false
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  async function initialize () {
    await checkAdminStatus()
    if (isAuthorized.value) {
      await Promise.all([loadStudents(), loadClassOptions(), loadParentOptions()])
      await loadStudentLogs()
    }
  }

  onMounted(initialize)

  watch(() => authStore.isAuthenticated, async isAuth => {
    if (isAuth) {
      await initialize()
    } else {
      isAuthorized.value = false
      students.value = []
    }
  })
</script>

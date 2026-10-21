<template>
  <v-container>
    <div v-if="firebaseStore.classesError" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.classesError"
        :title="$i18n('classes.errorLoadingClasses')"
        type="error"
        @click:close="firebaseStore.classesError = null"
      />
    </div>

    <div v-if="firebaseStore.classesLoading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-title-large mt-4">{{ $i18n('classes.loadingClasses') }}</p>
    </div>

    <div v-else-if="firebaseStore.classes.length === 0" class="text-center py-8">
      <v-icon class="text-medium-emphasis" size="64">mdi-school-outline</v-icon>
      <p class="text-title-large mt-4 text-medium-emphasis">{{ $i18n('classes.noClassesFound') }}</p>
    </div>

    <div v-else>
      <!-- Classes Grid -->
      <v-row>
        <v-col
          v-for="classItem in firebaseStore.classes"
          :id="`class-${classItem.classLetter}`"
          :key="classItem.id"
          class="class-col"
          cols="12"
          lg="6"
          md="6"
          sm="12"
        >
          <v-card :class="['d-flex flex-column', { 'class-highlight': highlightedClass === classItem.classLetter }]" height="100%">
            <ClassCardHeader :class-item="classItem">
              <template v-if="authStore.isAdmin" #actions>
                <v-btn
                  class="mt-n1 me-n2"
                  color="white"
                  icon="mdi-pencil"
                  size="x-small"
                  variant="text"
                  @click="openEditDialog(classItem)"
                />
              </template>
            </ClassCardHeader>

            <!-- Class Details -->
            <v-card-text class="flex-grow-1 pa-0">
              <!-- Parent Representatives -->
              <div v-if="classItem.parent_rep_1 || classItem.parent_rep_2" class="class-reps d-flex align-center ga-2">
                <v-icon color="secondary" size="small" :title="$i18n('classes.parentRepresentatives')">mdi-account-voice</v-icon>

                <div class="class-reps-names">
                  <!-- Parent Rep 1 -->
                  <div v-if="classItem.parent_rep_1">
                    <a class="plain-link" :href="mailto(getParentData(classItem.parent_rep_1)?.email)">
                      {{ getParentName(classItem.parent_rep_1) }}
                    </a>
                  </div>

                  <!-- Parent Rep 2 -->
                  <div v-if="classItem.parent_rep_2">
                    <a class="plain-link" :href="mailto(getParentData(classItem.parent_rep_2)?.email)">
                      {{ getParentName(classItem.parent_rep_2) }}
                    </a>
                  </div>
                </div>
              </div>

              <!-- Students List -->
              <div class="class-students">
                <div>
                  <template v-if="getClassStudents(classItem.classLetter).length > 0">
                    <!-- All levels in columns (2 levels per row), sized to the names they hold -->
                    <template v-for="(levelPair, pairIndex) in getLevelPairs(classItem.classLetter)" :key="`pair-${pairIndex}`">
                      <div class="class-levels" :style="{ '--level-count': levelPair.length }">
                        <div
                          v-for="levelData in levelPair"
                          :key="`level-${levelData.level}`"
                          class="class-level"
                        >
                          <!-- Level header -->
                          <div class="level-header">
                            {{ formatGradeLevel(levelData.level, bananaI18n.locale) }}
                            <span class="level-count">{{ levelData.students.length }}</span>
                          </div>

                          <!-- Students in this level -->
                          <div>
                            <div
                              v-for="student in levelData.students"
                              :key="student.id"
                              class="student-row"
                            >
                              <span>
                                <span class="text-no-wrap">{{ student.first_name }}</span>

                                {{ ' ' }}<span class="text-no-wrap">{{ student.last_name }}<v-icon
                                  v-if="isStudentRepresentative(student.id, classItem.classLetter)"
                                  class="ml-1"
                                  color="secondary"
                                  size="small"
                                  :title="$i18n('classes.representative')"
                                >mdi-account-voice</v-icon>

                                  <v-icon
                                    v-if="isFevesMember(student.id)"
                                    class="ml-1"
                                    color="feve"
                                    size="small"
                                    :title="$i18n('classes.fevesMember')"
                                  >mdi-leaf</v-icon></span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </template>

                  <div v-else class="text-body-medium text-medium-emphasis">
                    {{ $i18n('classes.noStudentsFound') }}
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Edit Class Dialog -->
    <v-dialog
      v-model="editDialog"
      max-width="600px"
      persistent
    >
      <v-card>
        <v-card-title class="bg-primary text-white">
          <span class="text-headline-small">{{ $i18n('classes.editClass') }}</span>
        </v-card-title>

        <v-card-text class="pt-6">
          <!-- Error Alert -->
          <v-alert
            v-if="editError"
            class="mb-4"
            closable
            type="error"
            @click:close="editError = null"
          >
            {{ editError }}
          </v-alert>

          <!-- Class Name Field -->
          <v-text-field
            v-model="editForm.className"
            density="comfortable"
            :label="$i18n('classes.className')"
            required
            variant="outlined"
          />

          <!-- Parent Representative 1 Field -->
          <v-autocomplete
            v-model="editForm.parent_rep_1"
            clearable
            density="comfortable"
            :items="getAllParents"
            :label="$i18n('classes.parentRepresentative1')"
            variant="outlined"
          />

          <!-- Parent Representative 2 Field -->
          <v-autocomplete
            v-model="editForm.parent_rep_2"
            class="mt-2"
            clearable
            density="comfortable"
            :items="getAllParents"
            :label="$i18n('classes.parentRepresentative2')"
            variant="outlined"
          />

          <!-- Student Representative 1 Field -->
          <v-select
            v-model="editForm.student_rep_1"
            clearable
            density="comfortable"
            :hint="$i18n('classes.studentRep1Hint')"
            :items="editingClass ? getStudentsByLevelForClass(editingClass.classLetter, 0) : []"
            :label="$i18n('classes.studentRep1')"
            persistent-hint
            variant="outlined"
          />

          <!-- Student Representative 2 Field -->
          <v-select
            v-model="editForm.student_rep_2"
            class="mt-2"
            clearable
            density="comfortable"
            :hint="$i18n('classes.studentRep2Hint')"
            :items="editingClass ? getStudentsByLevelForClass(editingClass.classLetter, 1) : []"
            :label="$i18n('classes.studentRep2')"
            persistent-hint
            variant="outlined"
          />

          <!-- Fèves Committee Member Fields (one per level) -->
          <v-select
            v-model="editForm.feves_1"
            class="mt-2"
            clearable
            density="comfortable"
            :hint="$i18n('classes.feves1Hint')"
            :items="editingClass ? getStudentsByLevelForClass(editingClass.classLetter, 0) : []"
            :label="$i18n('classes.feves1')"
            persistent-hint
            variant="outlined"
          />

          <v-select
            v-model="editForm.feves_2"
            class="mt-2"
            clearable
            density="comfortable"
            :hint="$i18n('classes.feves2Hint')"
            :items="editingClass ? getStudentsByLevelForClass(editingClass.classLetter, 1) : []"
            :label="$i18n('classes.feves2')"
            persistent-hint
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn
            :disabled="savingClass"
            variant="text"
            @click="closeEditDialog"
          >
            {{ $i18n('common.cancel') }}
          </v-btn>

          <v-btn
            color="primary"
            :loading="savingClass"
            variant="elevated"
            @click="saveClassChanges"
          >
            {{ $i18n('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
  import { computed, nextTick, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useRoute } from 'vue-router'
  import { FEVES_COMMITTEE_ID, STUDENT_MEMBER_ROLE } from '@/config/committees'
  import { ClassRepository } from '@/repositories/ClassRepository.js'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'
  import { formatGradeLevel } from '@/utils/gradeFormatter.js'

  definePage({ meta: { titleKey: 'classes.title' } })

  const bananaI18n = useI18n()

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()
  const authStore = useAuthStore()
  const classRepository = new ClassRepository()

  // Edit dialog state
  const editDialog = ref(false)
  const editingClass = ref(null)
  const editForm = ref({
    className: '',
    parent_rep_1: null,
    parent_rep_2: null,
    student_rep_1: null,
    student_rep_2: null,
    feves_1: null,
    feves_2: null,
  })
  const savingClass = ref(false)
  const editError = ref(null)

  // Get all parents for parent representative selection
  const getAllParents = computed(() => {
    return firebaseStore.parentsDTO
      .map(parent => ({
        value: parent.id,
        title: parent.fullName,
      }))
      .toSorted((a, b) => a.title.localeCompare(b.title))
  })

  // Get students by level in a class
  function getStudentsByLevelForClass (classLetter, levelIndex) {
    const classStudents = getClassStudents(classLetter)
    const levels = [...new Set(classStudents.map(s => s.level).filter(level => level != null))]
      .toSorted((a, b) => Number(a) - Number(b))

    if (levelIndex >= levels.length) return []

    const targetLevel = levels[levelIndex]
    return classStudents
      .filter(student => student.level === targetLevel)
      .map(student => ({
        value: student.id,
        title: `${student.first_name} ${student.last_name}`,
      }))
      .toSorted((a, b) => a.title.localeCompare(b.title))
  }

  // Student IDs that are members of the fèves committee
  const fevesStudentIds = computed(() => {
    const feves = firebaseStore.committeesDTO.find(c => c.id === FEVES_COMMITTEE_ID)
    return new Set(feves ? feves.studentMembers.map(m => m.memberId) : [])
  })

  function isFevesMember (studentId) {
    return fevesStudentIds.value.has(studentId)
  }

  // Fèves member among a class level's students (one per level)
  function findFevesMember (classLetter, levelIndex) {
    const match = getStudentsByLevelForClass(classLetter, levelIndex).find(s => isFevesMember(s.value))
    return match ? match.value : null
  }

  // Sync the class's student members of the fèves committee with the selection
  async function saveFevesMembers (classLetter, selectedIds) {
    const desired = new Set(selectedIds.filter(Boolean))
    const current = new Set(getClassStudents(classLetter).map(s => s.id).filter(id => isFevesMember(id)))

    await Promise.all([
      ...[...current].filter(id => !desired.has(id)).map(id => firebaseStore.committeeRepository.removeMember(FEVES_COMMITTEE_ID, id)),
      ...[...desired].filter(id => !current.has(id)).map(id => firebaseStore.committeeRepository.addMember(FEVES_COMMITTEE_ID, id, { role: STUDENT_MEMBER_ROLE, member_type: 'student' })),
    ])
  }

  // Open edit dialog
  function openEditDialog (classItem) {
    editingClass.value = classItem
    editForm.value = {
      className: classItem.className,
      parent_rep_1: classItem.parent_rep_1 || null,
      parent_rep_2: classItem.parent_rep_2 || null,
      student_rep_1: classItem.student_rep_1 || null,
      student_rep_2: classItem.student_rep_2 || null,
      feves_1: findFevesMember(classItem.classLetter, 0),
      feves_2: findFevesMember(classItem.classLetter, 1),
    }
    editError.value = null
    editDialog.value = true
  }

  // Close edit dialog
  function closeEditDialog () {
    editDialog.value = false
    editingClass.value = null
    editError.value = null
  }

  // Save class changes
  async function saveClassChanges () {
    if (!editingClass.value) return

    try {
      savingClass.value = true
      editError.value = null

      const updates = {
        className: editForm.value.className,
        parent_rep_1: editForm.value.parent_rep_1 || '',
        parent_rep_2: editForm.value.parent_rep_2 || '',
        student_rep_1: editForm.value.student_rep_1 || '',
        student_rep_2: editForm.value.student_rep_2 || '',
      }

      await classRepository.update(editingClass.value.classLetter, updates)
      await saveFevesMembers(editingClass.value.classLetter, [editForm.value.feves_1, editForm.value.feves_2])

      // Refresh classes and committees data
      await Promise.all([
        firebaseStore.loadClasses(true),
        firebaseStore.loadCommitteesDTO(true),
      ])

      closeEditDialog()
    } catch (error) {
      console.error('Failed to update class:', error)
      editError.value = error.message || 'Failed to update class'
    } finally {
      savingClass.value = false
    }
  }

  // Helper functions

  function getParentName (parentId) {
    const parent = firebaseStore.parentsDTO.find(p => p.id === parentId)
    return parent ? parent.fullName : parentId
  }

  function getParentData (parentId) {
    return firebaseStore.parentsDTO.find(p => p.id === parentId) || null
  }

  // mailto link for a name; no href (plain text) when there is no email
  function mailto (email) {
    return email ? `mailto:${email}` : undefined
  }

  function getClassStudents (classLetter) {
    return firebaseStore.studentsDTO.filter(student => student.className === classLetter)
  }

  function getStudentsByLevel (classLetter) {
    const classStudents = getClassStudents(classLetter)

    // Group students by level, ensuring levels are treated as numbers
    const grouped = classStudents.reduce((acc, student) => {
      const level = student.level ? String(student.level) : 'Unknown'
      if (!acc[level]) {
        acc[level] = []
      }
      acc[level].push(student)
      return acc
    }, {})

    // Sort each level's students by name
    for (const level of Object.keys(grouped)) {
      grouped[level].sort((a, b) => {
        return a.last_name.localeCompare(b.last_name)
      })
    }

    return grouped
  }

  function getLevelPairs (classLetter) {
    const levelData = getStudentsByLevel(classLetter)

    // Convert to array and sort by level number
    const sortedLevels = Object.keys(levelData)
      .filter(level => level !== 'Unknown')
      .toSorted((a, b) => {
        const numA = Number.parseInt(a)
        const numB = Number.parseInt(b)
        return numA - numB
      })
      .map(level => ({
        level,
        students: levelData[level],
      }))

    // Add Unknown level at the end if it exists
    if (levelData['Unknown']) {
      sortedLevels.push({
        level: 'Unknown',
        students: levelData['Unknown'],
      })
    }

    // Group into pairs for 2-column layout
    const pairs = []
    for (let i = 0; i < sortedLevels.length; i += 2) {
      const pair = [sortedLevels[i]]
      if (i + 1 < sortedLevels.length) {
        pair.push(sortedLevels[i + 1])
      }
      pairs.push(pair)
    }

    return pairs
  }

  function isStudentRepresentative (studentId, classLetter) {
    const classItem = firebaseStore.classes.find(c => c.classLetter === classLetter)
    if (!classItem) return false

    return classItem.student_rep_1 === studentId || classItem.student_rep_2 === studentId
  }

  // A link like /classes#class-B (from the home page) scrolls to that class and briefly highlights it
  const route = useRoute()
  const highlightedClass = ref(null)

  async function scrollToLinkedClass () {
    const letter = route.hash.replace('#class-', '')
    if (!route.hash.startsWith('#class-') || !firebaseStore.classes.some(c => c.classLetter === letter)) return
    await nextTick()
    document.querySelector(`#class-${CSS.escape(letter)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    highlightedClass.value = letter
    setTimeout(() => {
      highlightedClass.value = null
    }, 2000)
  }

  // Load data on component mount
  onMounted(async () => {
    await Promise.all([
      firebaseStore.loadStudentsDTO(),
      firebaseStore.loadParentsDTO(),
      firebaseStore.loadStaffDTO(),
      firebaseStore.loadClasses(),
      firebaseStore.loadCommitteesDTO(),
    ])
    await scrollToLinkedClass()
  })
</script>

<style scoped>
/* Scrolling to a linked class leaves room for the app bar */
.class-col {
  scroll-margin-top: 80px;
}

/* The class a link pointed to pulses once so it stands out */
.class-highlight {
  animation: class-highlight 2s ease-out;
}

@keyframes class-highlight {
  0%, 40% { box-shadow: 0 0 0 4px rgb(var(--v-theme-secondary)); }
  100% { box-shadow: 0 0 0 4px transparent; }
}

.class-reps {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.8125rem;
}

.class-reps-names {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}

/* Parent reps are mailto links that look like plain names */
.plain-link {
  color: inherit;
  text-decoration: none;
}

.class-students {
  padding: 12px 16px 16px;
}

/* Columns size to their names when there is room and shrink together when not,
   so two levels stay side by side on a phone */
.class-levels {
  display: grid;
  grid-template-columns: repeat(var(--level-count), auto);
  gap: 14px 24px;
}

.class-levels + .class-levels {
  margin-top: 16px;
}

.class-level {
  min-width: 0;
}

.level-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 4px;
  margin-bottom: 4px;
  border-bottom: 2px solid rgba(var(--v-theme-on-surface), 0.12);
  color: rgba(var(--v-theme-on-surface), 0.75);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.level-count {
  margin-left: auto;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  font-variant-numeric: tabular-nums;
}

/* A name breaks only between first and last name, with the last name indented */
.student-row {
  padding: 3px 0 3px 12px;
  text-indent: -12px;
  line-height: 1.3;
}

@media (max-width: 599px) {
  .class-reps,
  .class-students {
    padding-left: 12px;
    padding-right: 12px;
  }

  .class-levels {
    column-gap: 14px;
  }
}

.text-body-small {
  opacity: 0.7;
}
</style>

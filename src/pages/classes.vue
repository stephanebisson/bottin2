<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h3 font-weight-bold">{{ $t('classes.title') }}</h1>
      <v-chip
        :color="firebaseStore.loading ? 'orange' : 'green'"
        :prepend-icon="firebaseStore.loading ? 'mdi-loading mdi-spin' : 'mdi-check-circle'"
      >
        {{ firebaseStore.loading ? $t('common.loading') : $t('classes.classesLoaded', { count: firebaseStore.classes.length }) }}
      </v-chip>
    </div>

    <div v-if="firebaseStore.error" class="mb-4">
      <v-alert
        closable
        :text="firebaseStore.error"
        :title="$t('classes.errorLoadingClasses')"
        type="error"
        @click:close="firebaseStore.error = null"
      />
    </div>

    <div v-if="firebaseStore.loading" class="text-center py-8">
      <v-progress-circular color="primary" indeterminate size="64" />
      <p class="text-h6 mt-4">{{ $t('classes.loadingClasses') }}</p>
    </div>

    <div v-else-if="firebaseStore.classes.length === 0" class="text-center py-8">
      <v-icon color="grey-darken-2" size="64">mdi-school-outline</v-icon>
      <p class="text-h6 mt-4 text-grey-darken-2">{{ $t('classes.noClassesFound') }}</p>
    </div>

    <div v-else>
      <!-- Classes Grid -->
      <v-row>
        <v-col
          v-for="classItem in firebaseStore.classes"
          :key="classItem.id"
          cols="12"
          lg="6"
          md="6"
          sm="12"
        >
          <v-card class="d-flex flex-column" height="100%">
            <!-- Class Header -->
            <v-card-title class="d-flex justify-space-between align-start bg-primary pa-3">
              <div class="flex-grow-1 overflow-hidden">
                <h5 class="text-white text-wrap" style="word-break: break-word; line-height: 1.3; margin-bottom: 0;">
                  {{ classItem.className }}
                </h5>
              </div>
              <div class="flex-shrink-0 ml-3">
                <span class="text-white text-body-2" style="white-space: nowrap;">
                  ({{ classItem.classCode }})
                </span>
              </div>
            </v-card-title>

            <!-- Class Details -->
            <v-card-text class="flex-grow-1">
              <!-- Teacher -->
              <div v-if="classItem.teacher" class="mb-3 mt-3">
                <div class="d-flex align-center mb-1">
                  <v-icon class="me-2" color="primary">mdi-account-tie</v-icon>
                  <span class="font-weight-medium">{{ $t('classes.teacher') }}</span>
                </div>
                <div class="ms-6 text-body-2">
                  <v-tooltip
                    v-if="showPopups"
                    location="top"
                    max-width="350"
                  >
                    <template #activator="{ props }">
                      <span
                        v-bind="props"
                        class="teacher-name"
                        style="cursor: help; text-decoration: underline dotted; text-decoration-color: rgba(0,0,0,0.3);"
                      >
                        {{ getTeacherName(classItem.teacher) }}
                      </span>
                    </template>
                    <template #default>
                      <div class="pa-3" style="min-width: 280px;">
                        <div v-if="getTeacherInfo(classItem.teacher)">
                          <div class="text-h6 mb-2 text-white">
                            {{ getTeacherInfo(classItem.teacher).first_name }} {{ getTeacherInfo(classItem.teacher).last_name }}
                          </div>

                          <div v-if="getTeacherInfo(classItem.teacher).title" class="mb-1">
                            <strong>{{ $t('classes.teacherTitle') }}:</strong> {{ getTeacherInfo(classItem.teacher).title }}
                          </div>

                          <div v-if="getTeacherInfo(classItem.teacher).email" class="mb-1">
                            <strong>{{ $t('common.email') }}:</strong> {{ getTeacherInfo(classItem.teacher).email }}
                          </div>

                          <div v-if="getTeacherInfo(classItem.teacher).phone" class="mb-1">
                            <strong>{{ $t('common.phone') }}:</strong> {{ formatPhone(getTeacherInfo(classItem.teacher).phone) }}
                          </div>

                          <div v-if="getTeacherInfo(classItem.teacher).directory_table" class="mb-1">
                            <strong>{{ $t('classes.directory') }}:</strong> {{ getTeacherInfo(classItem.teacher).directory_table }}
                          </div>

                          <div v-if="getTeacherInfo(classItem.teacher).ce_role" class="mb-1">
                            <strong>{{ $t('classes.ceRole') }}:</strong> {{ getTeacherInfo(classItem.teacher).ce_role }}
                          </div>

                          <div v-if="getTeacherInfo(classItem.teacher).ce_hierarchy" class="mb-1">
                            <strong>{{ $t('classes.ceHierarchy') }}:</strong> {{ getTeacherInfo(classItem.teacher).ce_hierarchy }}
                          </div>
                        </div>

                        <div v-else class="text-caption">
                          {{ $t('classes.noStaffInfo', { teacher: classItem.teacher }) }}
                        </div>
                      </div>
                    </template>
                  </v-tooltip>
                  <span v-else class="teacher-name">
                    {{ getTeacherName(classItem.teacher) }}
                  </span>
                </div>
              </div>

              <!-- Parent Representative -->
              <div v-if="classItem.parent_rep" class="mb-3">
                <div class="d-flex align-center mb-1">
                  <v-icon class="me-2" color="primary">mdi-account-supervisor</v-icon>
                  <span class="font-weight-medium">{{ $t('classes.parentRepresentative') }}</span>
                </div>
                <div class="ms-6 text-body-2">
                  <v-tooltip
                    v-if="showPopups"
                    location="top"
                    max-width="450"
                  >
                    <template #activator="{ props }">
                      <span
                        v-bind="props"
                        class="parent-name"
                        style="cursor: help; text-decoration: underline dotted; text-decoration-color: rgba(0,0,0,0.3);"
                      >
                        {{ getParentName(classItem.parent_rep) }}
                      </span>
                    </template>
                    <template #default>
                      <div class="pa-3" style="min-width: 350px;">
                        <div v-if="getParentData(classItem.parent_rep)">
                          <div class="text-h6 mb-3 text-white">
                            {{ getParentData(classItem.parent_rep).first_name }} {{ getParentData(classItem.parent_rep).last_name }}
                            <br>
                            <span class="text-body-2">{{ $t('classes.parentRepresentative') }}</span>
                          </div>

                          <!-- Contact Information -->
                          <div class="mb-3">
                            <div class="text-subtitle-2 mb-2 text-white">{{ $t('classes.contactInformation') }}</div>

                            <div class="mb-1">
                              <strong>{{ $t('common.email') }}:</strong> {{ getParentData(classItem.parent_rep).email }}
                            </div>

                            <div v-if="getParentData(classItem.parent_rep).phone" class="mb-1">
                              <strong>{{ $t('common.phone') }}:</strong> {{ formatPhone(getParentData(classItem.parent_rep).phone) }}
                            </div>

                            <div v-if="formatAddress(getParentData(classItem.parent_rep))" class="mb-1">
                              <strong>{{ $t('common.address') }}:</strong> {{ formatAddress(getParentData(classItem.parent_rep)) }}
                            </div>
                          </div>

                          <!-- Interests Section -->
                          <div v-if="getParentData(classItem.parent_rep).interests && getParentData(classItem.parent_rep).interests.length > 0" class="mb-3">
                            <div class="text-subtitle-2 mb-2 text-white">{{ $t('classes.interests') }}</div>
                            <div class="text-body-2">
                              {{ getParentData(classItem.parent_rep).interests.join(', ') }}
                            </div>
                          </div>

                          <!-- Children Section -->
                          <div class="mb-2">
                            <div class="text-subtitle-2 mb-2 text-white">{{ $t('classes.children') }}</div>

                            <div v-if="getParentChildren(classItem.parent_rep).length > 0">
                              <div
                                v-for="child in getParentChildren(classItem.parent_rep)"
                                :key="child.id"
                                class="mb-1"
                              >
                                <div class="font-weight-bold">{{ child.first_name }} {{ child.last_name }}</div>
                                <div class="text-caption">
                                  {{ $t('classes.class') }}: {{ child.className }}
                                  <span v-if="child.level"> - {{ formatGradeLevel(child.level) }}</span>
                                  <span v-if="getTeacherName(getClassTeacher(child.className))">
                                    - {{ $t('classes.teacher') }}: {{ getTeacherName(getClassTeacher(child.className)) }}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div v-else class="text-caption text-grey">
                              {{ $t('classes.noChildrenFound') }}
                            </div>
                          </div>
                        </div>

                        <div v-else class="text-caption">
                          {{ $t('classes.noParentInfo', { parent: classItem.parent_rep }) }}
                        </div>
                      </div>
                    </template>
                  </v-tooltip>
                  <span v-else class="parent-name">
                    {{ getParentName(classItem.parent_rep) }}
                  </span>
                </div>
              </div>

              <!-- Students List -->
              <div class="mb-3">
                <div class="d-flex align-center mb-2">
                  <v-icon class="me-2" color="primary">mdi-account-multiple</v-icon>
                  <span class="font-weight-medium">
                    {{ $t('classes.students') }} ({{ getClassStudents(classItem.classLetter).length }})
                  </span>
                </div>

                <div class="ms-6">
                  <template v-if="getClassStudents(classItem.classLetter).length > 0">
                    <!-- All levels in columns (2 levels per row) -->
                    <template v-for="(levelPair, pairIndex) in getLevelPairs(classItem.classLetter)" :key="`pair-${pairIndex}`">
                      <v-row class="mb-3">
                        <v-col
                          v-for="levelData in levelPair"
                          :key="`level-${levelData.level}`"
                          cols="6"
                        >
                          <!-- Level header -->
                          <div class="d-flex align-center mb-1">
                            <v-chip
                              class="me-2"
                              color="secondary"
                              size="small"
                              variant="outlined"
                            >
                              {{ formatGradeLevel(levelData.level) }}
                            </v-chip>
                            <span class="text-caption text-grey">
                              {{ $t(levelData.students.length === 1 ? 'classes.studentCount' : 'classes.studentCountPlural', { count: levelData.students.length }) }}
                            </span>
                          </div>

                          <!-- Students in this level -->
                          <div class="ms-4">
                            <div
                              v-for="student in levelData.students"
                              :key="student.id"
                              class="text-body-2 py-1"
                            >
                              <v-tooltip
                                v-if="showPopups"
                                location="top"
                                max-width="450"
                              >
                                <template #activator="{ props }">
                                  <span
                                    v-bind="props"
                                    class="student-name"
                                    :class="{ 'font-weight-bold': isStudentRepresentative(student.id, classItem.classLetter) }"
                                    style="cursor: help; text-decoration: underline dotted; text-decoration-color: rgba(0,0,0,0.3);"
                                  >
                                    {{ student.first_name }} {{ student.last_name }}
                                    <span v-if="isStudentRepresentative(student.id, classItem.classLetter)" class="text-primary font-weight-bold ml-1">{{ $t('classes.representative') }}</span>
                                  </span>
                                </template>
                                <template #default>
                                  <div class="pa-3" style="min-width: 350px;">
                                    <div class="text-h6 mb-3 text-white">
                                      {{ student.first_name }} {{ student.last_name }}
                                      <span v-if="student.level" class="text-caption ml-2">({{ formatGradeLevel(student.level) }})</span>
                                      <br>
                                      <span class="text-body-2">{{ student.className }}</span>
                                    </div>

                                    <!-- Parents Section -->
                                    <div class="mb-3">
                                      <div class="text-subtitle-2 mb-2 text-white">{{ $t('classes.parents') }}</div>

                                      <div v-if="getStudentParent(student, 1)" class="mb-2">
                                        <div class="font-weight-bold">{{ getStudentParent(student, 1).first_name }} {{ getStudentParent(student, 1).last_name }}</div>
                                        <div class="text-caption">{{ getStudentParent(student, 1).email }}</div>
                                        <div v-if="getStudentParent(student, 1).phone" class="text-caption">{{ formatPhone(getStudentParent(student, 1).phone) }}</div>
                                        <div v-if="formatAddress(getStudentParent(student, 1))" class="text-caption">
                                          <strong>{{ $t('common.address') }}:</strong> {{ formatAddress(getStudentParent(student, 1)) }}
                                        </div>
                                        <div v-if="getStudentParent(student, 1).interests && getStudentParent(student, 1).interests.length > 0" class="text-caption mt-1">
                                          <strong>{{ $t('common.interests') }}:</strong> {{ getStudentParent(student, 1).interests.join(', ') }}
                                        </div>
                                      </div>

                                      <div v-if="getStudentParent(student, 2)" class="mb-2">
                                        <div class="font-weight-bold">{{ getStudentParent(student, 2).first_name }} {{ getStudentParent(student, 2).last_name }}</div>
                                        <div class="text-caption">{{ getStudentParent(student, 2).email }}</div>
                                        <div v-if="getStudentParent(student, 2).phone" class="text-caption">{{ formatPhone(getStudentParent(student, 2).phone) }}</div>
                                        <div v-if="formatAddress(getStudentParent(student, 2))" class="text-caption">
                                          <strong>{{ $t('common.address') }}:</strong> {{ formatAddress(getStudentParent(student, 2)) }}
                                        </div>
                                        <div v-if="getStudentParent(student, 2).interests && getStudentParent(student, 2).interests.length > 0" class="text-caption mt-1">
                                          <strong>{{ $t('common.interests') }}:</strong> {{ getStudentParent(student, 2).interests.join(', ') }}
                                        </div>
                                      </div>

                                      <div v-if="!getStudentParent(student, 1) && !getStudentParent(student, 2)" class="text-caption text-grey">
                                        {{ $t('classes.noParentInfoFound') }}
                                      </div>
                                    </div>

                                    <!-- Siblings Section -->
                                    <div class="mb-2">
                                      <div class="text-subtitle-2 mb-2 text-white">{{ $t('classes.siblings') }}</div>

                                      <div v-if="getStudentSiblings(student).length > 0">
                                        <div
                                          v-for="sibling in getStudentSiblings(student)"
                                          :key="sibling.id"
                                          class="mb-1"
                                        >
                                          <div class="font-weight-bold">{{ sibling.first_name }} {{ sibling.last_name }}</div>
                                          <div class="text-caption">
                                            {{ $t('classes.class') }}: {{ sibling.className }}
                                            <span v-if="getTeacherName(getClassTeacher(sibling.className))">
                                              - {{ $t('classes.teacher') }}: {{ getTeacherName(getClassTeacher(sibling.className)) }}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div v-else class="text-caption text-grey">
                                        {{ $t('classes.noSiblingsFound') }}
                                      </div>
                                    </div>
                                  </div>
                                </template>
                              </v-tooltip>
                              <span
                                v-else
                                class="student-name"
                                :class="{ 'font-weight-bold': isStudentRepresentative(student.id, classItem.classLetter) }"
                              >
                                {{ student.first_name }} {{ student.last_name }}
                                <span v-if="isStudentRepresentative(student.id, classItem.classLetter)" class="text-primary font-weight-bold ml-1">(R)</span>
                              </span>
                            </div>
                          </div>
                        </v-col>
                      </v-row>
                    </template>
                  </template>

                  <div v-else class="text-body-2 text-grey">
                    {{ $t('classes.noStudentsFound') }}
                  </div>
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
  import { onMounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  // Feature flags
  const showPopups = ref(false)

  // Use centralized data store
  const firebaseStore = useFirebaseDataStore()
  const { locale } = useI18n()

  // Helper functions
  const formatGradeLevel = level => {
    // Handle special cases
    if (!level || level === 'Unknown') return level

    const currentLocale = locale.value || 'en'
    const numLevel = Number(level)

    if (currentLocale === 'fr') {
      switch (numLevel) {
        case 1: { return '1ère année'
        }
        case 2: { return '2ème année'
        }
        case 3: { return '3ème année'
        }
        case 4: { return '4ème année'
        }
        case 5: { return '5ème année'
        }
        case 6: { return '6ème année'
        }
        default: { return `${level}ème année`
        }
      }
    } else {
      switch (numLevel) {
        case 1: { return '1st grade'
        }
        case 2: { return '2nd grade'
        }
        case 3: { return '3rd grade'
        }
        case 4: { return '4th grade'
        }
        case 5: { return '5th grade'
        }
        case 6: { return '6th grade'
        }
        default: { return `${level}th grade`
        }
      }
    }
  }

  const getStudentName = studentId => {
    const student = firebaseStore.studentsDTO.find(s => s.id === studentId)
    return student ? student.fullName : studentId
  }

  const getStudentLevel = studentId => {
    const student = firebaseStore.studentsDTO.find(s => s.id === studentId)
    return student ? student.level : null
  }

  const getStudentData = studentId => {
    return firebaseStore.studentsDTO.find(s => s.id === studentId) || null
  }

  const getStudentParentById = (studentId, parentNumber) => {
    const student = firebaseStore.studentsDTO.find(s => s.id === studentId)
    if (!student) return null

    const parentIdField = parentNumber === 1 ? 'parent1_id' : 'parent2_id'
    const parentId = student[parentIdField]

    if (!parentId) return null

    return firebaseStore.parentsDTO.find(p => p.id === parentId) || null
  }

  const getStudentSiblingsById = studentId => {
    const student = firebaseStore.studentsDTO.find(s => s.id === studentId)
    if (!student || (!student.parent1_id && !student.parent2_id)) return []

    // Find siblings by matching parent IDs (excluding the student themselves)
    return firebaseStore.studentsDTO.filter(s =>
      s.id !== student.id && (
        (student.parent1_id && (s.parent1_id === student.parent1_id || s.parent2_id === student.parent1_id))
        || (student.parent2_id && (s.parent1_id === student.parent2_id || s.parent2_id === student.parent2_id))
      ),
    )
  }

  const getParentName = parentId => {
    const parent = firebaseStore.parentsDTO.find(p => p.id === parentId)
    return parent ? parent.fullName : parentId
  }

  const getParentData = parentId => {
    return firebaseStore.parentsDTO.find(p => p.id === parentId) || null
  }

  const getParentChildren = parentId => {
    if (!parentId) return []

    // Find all students where this parent is either parent1 or parent2
    return firebaseStore.studentsDTO.filter(student =>
      student.parent1_id === parentId || student.parent2_id === parentId,
    )
  }

  const formatAddress = parent => {
    if (!parent) return ''

    const addressParts = []

    if (parent.address) addressParts.push(parent.address)
    if (parent.city) addressParts.push(parent.city)
    if (parent.postal_code) addressParts.push(parent.postal_code)

    return addressParts.length > 0 ? addressParts.join(', ') : ''
  }

  const formatPhone = phone => {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  const getTeacherName = teacherId => {
    const teacher = firebaseStore.staffDTO.find(s => s.id === teacherId)
    return teacher ? teacher.fullName : teacherId
  }

  const getTeacherInfo = teacherId => {
    return firebaseStore.staffDTO.find(s => s.id === teacherId) || null
  }

  const getClassStudents = classLetter => {
    return firebaseStore.studentsDTO.filter(student => student.className === classLetter)
  }

  const getStudentsByLevel = classLetter => {
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
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
    }

    return grouped
  }

  const getLevelPairs = classLetter => {
    const levelData = getStudentsByLevel(classLetter)

    // Convert to array and sort by level number
    const sortedLevels = Object.keys(levelData)
      .filter(level => level !== 'Unknown')
      .sort((a, b) => {
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

  const getStudentParent = (student, parentNumber) => {
    const parentIdField = parentNumber === 1 ? 'parent1_id' : 'parent2_id'
    const parentId = student[parentIdField]

    if (!parentId) return null

    return firebaseStore.parentsDTO.find(p => p.id === parentId) || null
  }

  const getStudentSiblings = student => {
    if (!student.parent1_id && !student.parent2_id) return []

    // Find siblings by matching parent IDs (excluding the student themselves)
    return firebaseStore.studentsDTO.filter(s =>
      s.id !== student.id && (
        (student.parent1_id && (s.parent1_id === student.parent1_id || s.parent2_id === student.parent1_id))
        || (student.parent2_id && (s.parent1_id === student.parent2_id || s.parent2_id === student.parent2_id))
      ),
    )
  }

  const isStudentRepresentative = (studentId, classLetter) => {
    const classItem = firebaseStore.classes.find(c => c.classLetter === classLetter)
    if (!classItem) return false

    return classItem.student_rep_1 === studentId || classItem.student_rep_2 === studentId
  }

  const getClassTeacher = classLetter => {
    const classItem = firebaseStore.classes.find(c => c.classLetter === classLetter)
    return classItem ? classItem.teacher : null
  }

  const getClassLevelRange = classLetter => {
    const classStudents = getClassStudents(classLetter)

    if (classStudents.length === 0) return 'No students'

    // Get all unique levels for this class
    const levels = [...new Set(classStudents.map(s => s.level).filter(level => level != null))]
      .sort((a, b) => Number(a) - Number(b))

    if (levels.length === 0) return 'No levels'
    if (levels.length === 1) return levels[0].toString()

    // Return range format like "1-3" for multiple levels
    return `${levels[0]}-${levels.at(-1)}`
  }

  // Load data on component mount
  onMounted(async () => {
    await Promise.all([
      firebaseStore.loadStudentsDTO(),
      firebaseStore.loadParentsDTO(),
      firebaseStore.loadStaffDTO(),
      firebaseStore.loadAllData(), // Still need classes data
    ])
  })
</script>

<style scoped>
.v-card-title {
  word-break: break-word;
}

.text-caption {
  opacity: 0.7;
}
</style>

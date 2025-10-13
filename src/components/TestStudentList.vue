<template>
  <v-container>
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-test-tube</v-icon>
        DTO Pattern Test Component
        <v-spacer />
        <v-chip :color="dtoDataLoaded ? 'success' : 'warning'" small>
          {{ dtoDataLoaded ? 'DTO Loaded' : 'DTO Not Loaded' }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <v-alert
          class="mb-4"
          type="info"
          variant="outlined"
        >
          This component tests the new DTO pattern alongside the existing data store.
          It helps validate that the new approach works before migration.
        </v-alert>

        <div class="d-flex gap-2 mb-4">
          <v-btn
            color="primary"
            :loading="dtoLoading"
            variant="outlined"
            @click="loadDTOData"
          >
            Load DTO Students
          </v-btn>

          <v-btn
            color="secondary"
            :loading="storeLoading"
            variant="outlined"
            @click="loadStoreData"
          >
            Load Store Students
          </v-btn>

          <v-btn
            color="success"
            :disabled="!dtoDataLoaded || !storeDataLoaded"
            variant="outlined"
            @click="compareData"
          >
            Compare Data
          </v-btn>

          <v-btn
            color="info"
            :loading="testLoading"
            variant="outlined"
            @click="testRepository"
          >
            Test Repository
          </v-btn>

          <v-btn
            color="purple"
            :loading="parentTestLoading"
            variant="outlined"
            @click="testParentLookup"
          >
            Test Parent Lookup
          </v-btn>
        </div>

        <!-- Stats Comparison -->
        <v-row v-if="dtoDataLoaded || storeDataLoaded" class="mb-4">
          <v-col cols="6">
            <v-card variant="outlined">
              <v-card-subtitle>DTO Approach</v-card-subtitle>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title>Count: {{ dtoStudents.length }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Load Time: {{ dtoLoadTime }}ms</v-list-item-title>
                  </v-list-item>
                  <v-list-item v-if="dtoError">
                    <v-list-item-title class="text-error">Error: {{ dtoError }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="6">
            <v-card variant="outlined">
              <v-card-subtitle>Store Approach</v-card-subtitle>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title>Count: {{ storeStudents.length }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Load Time: {{ storeLoadTime }}ms</v-list-item-title>
                  </v-list-item>
                  <v-list-item v-if="storeError">
                    <v-list-item-title class="text-error">Error: {{ storeError }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Comparison Results -->
        <v-alert
          v-if="comparisonResults"
          class="mb-4"
          :type="comparisonResults.identical ? 'success' : 'warning'"
          variant="outlined"
        >
          <div class="font-weight-bold">Data Comparison Results:</div>
          <ul class="mt-2">
            <li>Records match: {{ comparisonResults.identical ? 'Yes' : 'No' }}</li>
            <li>DTO validation passed: {{ comparisonResults.dtoValidationPassed }} / {{ comparisonResults.totalDTO }}</li>
            <li>Store validation passed: {{ comparisonResults.storeValidationPassed }} / {{ comparisonResults.totalStore }}</li>
            <li v-if="comparisonResults.issues.length > 0">
              Issues found: {{ comparisonResults.issues.length }}
            </li>
          </ul>
        </v-alert>

        <!-- Repository Test Results -->
        <v-alert
          v-if="repositoryTestResults"
          class="mb-4"
          :type="repositoryTestResults.success ? 'success' : 'error'"
          variant="outlined"
        >
          <div class="font-weight-bold">Repository Test Results:</div>
          <ul class="mt-2">
            <li v-for="result in repositoryTestResults.tests" :key="result.name">
              {{ result.name }}: {{ result.passed ? 'PASS' : 'FAIL' }}
              <span v-if="result.error" class="text-error"> - {{ result.error }}</span>
            </li>
          </ul>
        </v-alert>

        <!-- Parent Lookup Test Results -->
        <v-alert
          v-if="parentLookupTestResults"
          class="mb-4"
          :type="parentLookupTestResults.success ? 'success' : 'error'"
          variant="outlined"
        >
          <div class="font-weight-bold">Parent Lookup Test Results:</div>
          <ul class="mt-2">
            <li v-for="result in parentLookupTestResults.tests" :key="result.name">
              {{ result.name }}: {{ result.passed ? 'PASS' : 'FAIL' }}
              <span v-if="result.error" class="text-error"> - {{ result.error }}</span>
              <span v-if="result.details" class="text-body-2"> - {{ result.details }}</span>
            </li>
          </ul>
          <div v-if="parentLookupTestResults.sampleData" class="mt-3">
            <div class="font-weight-bold">Sample Parent Data:</div>
            <pre class="text-body-2 mt-1">{{ JSON.stringify(parentLookupTestResults.sampleData, null, 2) }}</pre>
          </div>
        </v-alert>

        <!-- Sample Data Display -->
        <v-expansion-panels v-if="dtoDataLoaded" class="mt-4">
          <v-expansion-panel title="Sample DTO Student Data">
            <v-expansion-panel-text>
              <pre class="text-body-2">{{ JSON.stringify(sampleDTOStudent, null, 2) }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel v-if="storeDataLoaded" title="Sample Store Student Data">
            <v-expansion-panel-text>
              <pre class="text-body-2">{{ JSON.stringify(sampleStoreStudent, null, 2) }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { StudentDTO } from '@/dto/StudentDTO.js'
  import { ParentRepository } from '@/repositories/ParentRepository.js'
  import { StudentRepository } from '@/repositories/StudentRepository.js'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  // Store reference
  const firebaseStore = useFirebaseDataStore()

  // Repository instances
  const studentRepository = new StudentRepository()
  const parentRepository = new ParentRepository()

  // DTO approach data
  const dtoStudents = ref([])
  const dtoLoading = ref(false)
  const dtoError = ref(null)
  const dtoLoadTime = ref(0)

  // Store approach data
  const storeStudents = ref([])
  const storeLoading = ref(false)
  const storeError = ref(null)
  const storeLoadTime = ref(0)

  // Test results
  const comparisonResults = ref(null)
  const repositoryTestResults = ref(null)
  const parentLookupTestResults = ref(null)
  const testLoading = ref(false)
  const parentTestLoading = ref(false)

  // Computed properties
  const dtoDataLoaded = computed(() => dtoStudents.value.length > 0)
  const storeDataLoaded = computed(() => storeStudents.value.length > 0)

  const sampleDTOStudent = computed(() => {
    if (dtoStudents.value.length === 0) return null
    return dtoStudents.value[0].toJSON()
  })

  const sampleStoreStudent = computed(() => {
    if (storeStudents.value.length === 0) return null
    return storeStudents.value[0]
  })

  // Load data using DTO approach
  const loadDTOData = async () => {
    try {
      dtoLoading.value = true
      dtoError.value = null

      const startTime = performance.now()
      dtoStudents.value = await studentRepository.getAll()
      const endTime = performance.now()

      dtoLoadTime.value = Math.round(endTime - startTime)
      console.log('DTO approach loaded:', dtoStudents.value.length, 'students')
    } catch (error) {
      dtoError.value = error.message
      console.error('DTO load error:', error)
    } finally {
      dtoLoading.value = false
    }
  }

  // Load data using existing store approach
  const loadStoreData = async () => {
    try {
      storeLoading.value = true
      storeError.value = null

      const startTime = performance.now()
      await firebaseStore.loadAllData(true) // Force refresh
      storeStudents.value = [...firebaseStore.students]
      const endTime = performance.now()

      storeLoadTime.value = Math.round(endTime - startTime)
      console.log('Store approach loaded:', storeStudents.value.length, 'students')
    } catch (error) {
      storeError.value = error.message
      console.error('Store load error:', error)
    } finally {
      storeLoading.value = false
    }
  }

  // Compare data between approaches
  const compareData = () => {
    const issues = []
    let dtoValidationPassed = 0
    let storeValidationPassed = 0

    // Validate DTO data
    for (const [index, student] of dtoStudents.value.entries()) {
      if (student instanceof StudentDTO && student.isValid()) {
        dtoValidationPassed++
      } else {
        issues.push(`DTO student at index ${index} failed validation`)
      }
    }

    // Validate store data (create DTOs to test)
    for (const [index, student] of storeStudents.value.entries()) {
      try {
        const dto = new StudentDTO(student)
        if (dto.isValid()) {
          storeValidationPassed++
        } else {
          issues.push(`Store student at index ${index} would fail DTO validation: ${dto.getValidationErrors().join(', ')}`)
        }
      } catch (error) {
        issues.push(`Store student at index ${index} caused DTO creation error: ${error.message}`)
      }
    }

    // Compare counts
    const identical = dtoStudents.value.length === storeStudents.value.length
      && dtoValidationPassed === storeValidationPassed
      && issues.length === 0

    comparisonResults.value = {
      identical,
      totalDTO: dtoStudents.value.length,
      totalStore: storeStudents.value.length,
      dtoValidationPassed,
      storeValidationPassed,
      issues,
    }

    console.log('Comparison results:', comparisonResults.value)
  }

  // Test repository methods
  const testRepository = async () => {
    try {
      testLoading.value = true
      const tests = []

      // Test 1: getAll
      try {
        const allStudents = await studentRepository.getAll()
        tests.push({
          name: 'getAll()',
          passed: Array.isArray(allStudents) && allStudents.every(s => s instanceof StudentDTO),
          error: null,
        })
      } catch (error) {
        tests.push({
          name: 'getAll()',
          passed: false,
          error: error.message,
        })
      }

      // Test 2: getActive
      try {
        const activeStudents = await studentRepository.getActive()
        tests.push({
          name: 'getActive()',
          passed: Array.isArray(activeStudents) && activeStudents.every(s => s instanceof StudentDTO),
          error: null,
        })
      } catch (error) {
        tests.push({
          name: 'getActive()',
          passed: false,
          error: error.message,
        })
      }

      // Test 3: getStats
      try {
        const stats = await studentRepository.getStats()
        tests.push({
          name: 'getStats()',
          passed: typeof stats === 'object'
            && typeof stats.total === 'number'
            && typeof stats.active === 'number',
          error: null,
        })
      } catch (error) {
        tests.push({
          name: 'getStats()',
          passed: false,
          error: error.message,
        })
      }

      // Test 4: search
      try {
        const searchResults = await studentRepository.search('test')
        tests.push({
          name: 'search("test")',
          passed: Array.isArray(searchResults),
          error: null,
        })
      } catch (error) {
        tests.push({
          name: 'search("test")',
          passed: false,
          error: error.message,
        })
      }

      repositoryTestResults.value = {
        success: tests.every(t => t.passed),
        tests,
      }

      console.log('Repository test results:', repositoryTestResults.value)
    } catch (error) {
      repositoryTestResults.value = {
        success: false,
        tests: [{ name: 'Repository Test Suite', passed: false, error: error.message }],
      }
    } finally {
      testLoading.value = false
    }
  }

  // Test parent lookup functionality
  const testParentLookup = async () => {
    try {
      parentTestLoading.value = true
      const tests = []
      let sampleData = null

      // Test 1: Load students first
      let students = []
      try {
        students = await studentRepository.getAll()
        tests.push({
          name: 'Load students for parent testing',
          passed: students.length > 0,
          error: null,
          details: `Found ${students.length} students`,
        })
      } catch (error) {
        tests.push({
          name: 'Load students for parent testing',
          passed: false,
          error: error.message,
        })
      }

      if (students.length > 0) {
        // Test 2: Find a student with parent contacts
        const studentWithParents = students.find(s => s.hasParentContacts)
        if (studentWithParents) {
          tests.push({
            name: 'Find student with parent contacts',
            passed: true,
            error: null,
            details: `Found ${studentWithParents.fullName} with ${studentWithParents.parentIds.length} parent(s)`,
          })

          // Test 3: Test individual parent lookup
          try {
            const parent1 = await studentWithParents.getParent1(parentRepository)
            tests.push({
              name: 'getParent1() method',
              passed: parent1 !== null,
              error: null,
              details: parent1 ? `Found: ${parent1.fullName}` : 'No parent1 found',
            })

            if (parent1) {
              sampleData = parent1.toJSON()
            }
          } catch (error) {
            tests.push({
              name: 'getParent1() method',
              passed: false,
              error: error.message,
            })
          }

          // Test 4: Test all parents lookup
          try {
            const allParents = await studentWithParents.getParents(parentRepository)
            tests.push({
              name: 'getParents() method',
              passed: Array.isArray(allParents),
              error: null,
              details: `Found ${allParents.length} parent(s) for ${studentWithParents.fullName}`,
            })
          } catch (error) {
            tests.push({
              name: 'getParents() method',
              passed: false,
              error: error.message,
            })
          }

          // Test 5: Test bulk loading with parents
          try {
            const studentsWithParents = await studentRepository.getAllWithParents(parentRepository)
            const hasValidData = studentsWithParents.some(item =>
              item.student && item.parents && item.parents.length > 0,
            )

            tests.push({
              name: 'getAllWithParents() bulk method',
              passed: hasValidData,
              error: null,
              details: `Loaded ${studentsWithParents.length} student records, ${studentsWithParents.filter(item => item.parents.length > 0).length} with parent data`,
            })
          } catch (error) {
            tests.push({
              name: 'getAllWithParents() bulk method',
              passed: false,
              error: error.message,
            })
          }
        } else {
          tests.push({
            name: 'Find student with parent contacts',
            passed: false,
            error: null,
            details: 'No students found with parent contact information',
          })
        }
      }

      // Test 6: ParentRepository functionality
      try {
        const allParents = await parentRepository.getAll()
        tests.push({
          name: 'ParentRepository.getAll()',
          passed: Array.isArray(allParents),
          error: null,
          details: `Found ${allParents.length} parents total`,
        })
      } catch (error) {
        tests.push({
          name: 'ParentRepository.getAll()',
          passed: false,
          error: error.message,
        })
      }

      parentLookupTestResults.value = {
        success: tests.every(t => t.passed),
        tests,
        sampleData,
      }

      console.log('Parent lookup test results:', parentLookupTestResults.value)
    } catch (error) {
      parentLookupTestResults.value = {
        success: false,
        tests: [{ name: 'Parent Lookup Test Suite', passed: false, error: error.message }],
      }
    } finally {
      parentTestLoading.value = false
    }
  }
</script>

<style scoped>
pre {
  background-color: rgba(0,0,0,0.05);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
}
</style>

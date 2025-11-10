import { collection, getDocs } from 'firebase/firestore'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/firebase'
import { CommitteeRepository } from '@/repositories/CommitteeRepository.js'
import { ParentRepository } from '@/repositories/ParentRepository.js'
import { StaffRepository } from '@/repositories/StaffRepository.js'
import { StudentRepository } from '@/repositories/StudentRepository.js'

export const useFirebaseDataStore = defineStore('firebaseData', () => {
  // ===== LEGACY STATE (classes and committees only) =====
  const classes = ref([])
  const committees = ref([])

  const loading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)

  // Cache settings (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000

  // ===== DTO STATE =====
  const studentsDTO = ref([])
  const studentsLoadingDTO = ref(false)
  const studentsErrorDTO = ref(null)
  const studentsLastUpdatedDTO = ref(null)

  const parentsDTO = ref([])
  const parentsLoadingDTO = ref(false)
  const parentsErrorDTO = ref(null)
  const parentsLastUpdatedDTO = ref(null)

  const staffDTO = ref([])
  const staffLoadingDTO = ref(false)
  const staffErrorDTO = ref(null)
  const staffLastUpdatedDTO = ref(null)

  const committeesDTO = ref([])
  const committeesLoadingDTO = ref(false)
  const committeesErrorDTO = ref(null)
  const committeesLastUpdatedDTO = ref(null)

  // Repository instances
  const studentRepository = new StudentRepository()
  const parentRepository = new ParentRepository()
  const staffRepository = new StaffRepository()
  const committeeRepository = new CommitteeRepository()

  // ===== EXISTING GETTERS (unchanged) =====
  const isDataStale = computed(() => {
    if (!lastUpdated.value) {
      return true
    }
    return Date.now() - lastUpdated.value > CACHE_DURATION
  })

  const hasData = computed(() => {
    return classes.value.length > 0
      || committees.value.length > 0
  })

  const dataStats = computed(() => ({
    classes: classes.value.length,
    committees: committees.value.length,
    lastUpdated: lastUpdated.value,
    isStale: isDataStale.value,
  }))

  // ===== NEW DTO GETTERS =====
  const isStudentsDTOStale = computed(() => {
    if (!studentsLastUpdatedDTO.value) {
      return true
    }
    return Date.now() - studentsLastUpdatedDTO.value > CACHE_DURATION
  })

  const hasStudentsDTO = computed(() => {
    return studentsDTO.value.length > 0
  })

  const studentsDTOStats = computed(() => ({
    count: studentsDTO.value.length,
    loading: studentsLoadingDTO.value,
    error: studentsErrorDTO.value,
    lastUpdated: studentsLastUpdatedDTO.value,
    isStale: isStudentsDTOStale.value,
    withParentContacts: studentsDTO.value.filter(s => s.hasParentContacts).length,
    withoutParentContacts: studentsDTO.value.filter(s => !s.hasParentContacts).length,
  }))

  // ===== NEW PARENT DTO GETTERS =====
  const isParentsDTOStale = computed(() => {
    if (!parentsLastUpdatedDTO.value) {
      return true
    }
    return Date.now() - parentsLastUpdatedDTO.value > CACHE_DURATION
  })

  const hasParentsDTO = computed(() => {
    return parentsDTO.value.length > 0
  })

  const parentsDTOStats = computed(() => ({
    count: parentsDTO.value.length,
    loading: parentsLoadingDTO.value,
    error: parentsErrorDTO.value,
    lastUpdated: parentsLastUpdatedDTO.value,
    isStale: isParentsDTOStale.value,
    withInterests: parentsDTO.value.filter(p => p.hasInterests).length,
    withoutInterests: parentsDTO.value.filter(p => !p.hasInterests).length,
  }))

  // ===== NEW STAFF DTO GETTERS =====
  const isStaffDTOStale = computed(() => {
    if (!staffLastUpdatedDTO.value) {
      return true
    }
    return Date.now() - staffLastUpdatedDTO.value > CACHE_DURATION
  })

  const hasStaffDTO = computed(() => {
    return staffDTO.value.length > 0
  })

  const staffDTOStats = computed(() => ({
    count: staffDTO.value.length,
    loading: staffLoadingDTO.value,
    error: staffErrorDTO.value,
    lastUpdated: staffLastUpdatedDTO.value,
    isStale: isStaffDTOStale.value,
    withCERoles: staffDTO.value.filter(s => s.hasCERole).length,
    inDirectory: staffDTO.value.filter(s => s.inDirectory).length,
  }))

  // ===== NEW COMMITTEE DTO GETTERS =====
  const isCommitteesDTOStale = computed(() => {
    if (!committeesLastUpdatedDTO.value) {
      return true
    }
    return Date.now() - committeesLastUpdatedDTO.value > CACHE_DURATION
  })

  const hasCommitteesDTO = computed(() => {
    return committeesDTO.value.length > 0
  })

  const committeesDTOStats = computed(() => ({
    count: committeesDTO.value.length,
    loading: committeesLoadingDTO.value,
    error: committeesErrorDTO.value,
    lastUpdated: committeesLastUpdatedDTO.value,
    isStale: isCommitteesDTOStale.value,
    totalMembers: committeesDTO.value.reduce((sum, c) => sum + c.memberCount, 0),
  }))

  // Actions
  const loadAllData = async (forceRefresh = false) => {
    // Skip loading if we have fresh data and not forcing refresh
    if (hasData.value && !isDataStale.value && !forceRefresh) {
      console.log('Using cached Firebase data')
      return
    }

    try {
      loading.value = true
      error.value = null

      console.log('Loading Firebase data...')

      const [classesSnapshot, committeesSnapshot] = await Promise.all([
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'committees')),
      ])

      classes.value = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      committees.value = committeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      lastUpdated.value = Date.now()

      console.log('Firebase data loaded:', {
        classes: classes.value.length,
        committees: committees.value.length,
      })
    } catch (error_) {
      console.error('Error loading Firebase data:', error_)
      error.value = error_.message || 'Failed to load data'
    } finally {
      loading.value = false
    }
  }

  const refreshData = async () => {
    await loadAllData(true)
  }

  const clearData = () => {
    classes.value = []
    committees.value = []
    lastUpdated.value = null
    error.value = null
  }

  // ===== NEW DTO ACTIONS =====
  const loadStudentsDTO = async (forceRefresh = false) => {
    // Skip loading if we have fresh data and not forcing refresh
    if (hasStudentsDTO.value && !isStudentsDTOStale.value && !forceRefresh) {
      console.log('Using cached DTO students data')
      return studentsDTO.value
    }

    try {
      studentsLoadingDTO.value = true
      studentsErrorDTO.value = null

      console.log('Loading students via DTO repository...')

      const loadedStudents = await studentRepository.getAll()
      studentsDTO.value = loadedStudents
      studentsLastUpdatedDTO.value = Date.now()

      console.log(`DTO students loaded: ${loadedStudents.length} valid students`)
      return loadedStudents
    } catch (error_) {
      console.error('Error loading DTO students:', error_)
      studentsErrorDTO.value = error_.message || 'Failed to load students'
      throw error_
    } finally {
      studentsLoadingDTO.value = false
    }
  }

  const loadActiveStudentsDTO = async () => {
    try {
      studentsLoadingDTO.value = true
      studentsErrorDTO.value = null

      console.log('Loading active students via DTO repository...')

      const activeStudents = await studentRepository.getActive()
      studentsDTO.value = activeStudents
      studentsLastUpdatedDTO.value = Date.now()

      console.log(`Active DTO students loaded: ${activeStudents.length} students`)
      return activeStudents
    } catch (error_) {
      console.error('Error loading active DTO students:', error_)
      studentsErrorDTO.value = error_.message || 'Failed to load active students'
      throw error_
    } finally {
      studentsLoadingDTO.value = false
    }
  }

  const refreshStudentsDTO = async () => {
    return await loadStudentsDTO(true)
  }

  const clearStudentsDTO = () => {
    studentsDTO.value = []
    studentsLastUpdatedDTO.value = null
    studentsErrorDTO.value = null
  }

  const searchStudentsDTO = async searchText => {
    try {
      console.log(`Searching students for: "${searchText}"`)
      return await studentRepository.search(searchText)
    } catch (error_) {
      console.error('Error searching DTO students:', error_)
      studentsErrorDTO.value = error_.message || 'Failed to search students'
      throw error_
    }
  }

  const getStudentsDTOStats = async () => {
    try {
      return await studentRepository.getStats()
    } catch (error_) {
      console.error('Error getting DTO students stats:', error_)
      throw error_
    }
  }

  // ===== NEW PARENT DTO ACTIONS =====
  const loadParentsDTO = async (forceRefresh = false) => {
    // Skip loading if we have fresh data and not forcing refresh
    if (hasParentsDTO.value && !isParentsDTOStale.value && !forceRefresh) {
      console.log('Using cached DTO parents data')
      return parentsDTO.value
    }

    try {
      parentsLoadingDTO.value = true
      parentsErrorDTO.value = null

      console.log('Loading parents via DTO repository...')

      const loadedParents = await parentRepository.getAll()
      parentsDTO.value = loadedParents
      parentsLastUpdatedDTO.value = Date.now()

      console.log(`DTO parents loaded: ${loadedParents.length} valid parents`)
      return loadedParents
    } catch (error_) {
      console.error('Error loading DTO parents:', error_)
      parentsErrorDTO.value = error_.message || 'Failed to load parents'
      throw error_
    } finally {
      parentsLoadingDTO.value = false
    }
  }

  const refreshParentsDTO = async () => {
    return await loadParentsDTO(true)
  }

  const clearParentsDTO = () => {
    parentsDTO.value = []
    parentsLastUpdatedDTO.value = null
    parentsErrorDTO.value = null
  }

  const searchParentsDTO = async searchText => {
    try {
      console.log(`Searching parents for: "${searchText}"`)
      return await parentRepository.search(searchText)
    } catch (error_) {
      console.error('Error searching DTO parents:', error_)
      parentsErrorDTO.value = error_.message || 'Failed to search parents'
      throw error_
    }
  }

  const getParentsDTOStats = async () => {
    try {
      return await parentRepository.getStats()
    } catch (error_) {
      console.error('Error getting DTO parents stats:', error_)
      throw error_
    }
  }

  // ===== NEW STAFF DTO ACTIONS =====
  const loadStaffDTO = async (forceRefresh = false) => {
    // Skip loading if we have fresh data and not forcing refresh
    if (hasStaffDTO.value && !isStaffDTOStale.value && !forceRefresh) {
      console.log('Using cached DTO staff data')
      return staffDTO.value
    }

    try {
      staffLoadingDTO.value = true
      staffErrorDTO.value = null

      console.log('Loading staff via DTO repository...')

      const loadedStaff = await staffRepository.getAll()
      staffDTO.value = loadedStaff
      staffLastUpdatedDTO.value = Date.now()

      console.log(`DTO staff loaded: ${loadedStaff.length} valid staff members`)
      return loadedStaff
    } catch (error_) {
      console.error('Error loading DTO staff:', error_)
      staffErrorDTO.value = error_.message || 'Failed to load staff'
      throw error_
    } finally {
      staffLoadingDTO.value = false
    }
  }

  const refreshStaffDTO = async () => {
    return await loadStaffDTO(true)
  }

  const clearStaffDTO = () => {
    staffDTO.value = []
    staffLastUpdatedDTO.value = null
    staffErrorDTO.value = null
  }

  const searchStaffDTO = async searchText => {
    try {
      console.log(`Searching staff for: "${searchText}"`)
      return await staffRepository.search(searchText)
    } catch (error_) {
      console.error('Error searching DTO staff:', error_)
      staffErrorDTO.value = error_.message || 'Failed to search staff'
      throw error_
    }
  }

  const getStaffDTOStats = async () => {
    try {
      return await staffRepository.getStats()
    } catch (error_) {
      console.error('Error getting DTO staff stats:', error_)
      throw error_
    }
  }

  // ===== NEW COMMITTEE DTO ACTIONS =====
  const loadCommitteesDTO = async (forceRefresh = false) => {
    // Skip loading if we have fresh data and not forcing refresh
    if (hasCommitteesDTO.value && !isCommitteesDTOStale.value && !forceRefresh) {
      console.log('Using cached DTO committees data')
      return committeesDTO.value
    }

    try {
      committeesLoadingDTO.value = true
      committeesErrorDTO.value = null

      console.log('Loading committees via DTO repository...')

      const loadedCommittees = await committeeRepository.getAll()
      committeesDTO.value = loadedCommittees
      committeesLastUpdatedDTO.value = Date.now()

      console.log(`DTO committees loaded: ${loadedCommittees.length} valid committees`)
      return loadedCommittees
    } catch (error_) {
      console.error('Error loading DTO committees:', error_)
      committeesErrorDTO.value = error_.message || 'Failed to load committees'
      throw error_
    } finally {
      committeesLoadingDTO.value = false
    }
  }

  const refreshCommitteesDTO = async () => {
    return await loadCommitteesDTO(true)
  }

  const clearCommitteesDTO = () => {
    committeesDTO.value = []
    committeesLastUpdatedDTO.value = null
    committeesErrorDTO.value = null
  }

  const searchCommitteesDTO = async searchText => {
    try {
      console.log(`Searching committees for: "${searchText}"`)
      return await committeeRepository.search(searchText)
    } catch (error_) {
      console.error('Error searching DTO committees:', error_)
      committeesErrorDTO.value = error_.message || 'Failed to search committees'
      throw error_
    }
  }

  const getCommitteesDTOStats = async () => {
    try {
      return await committeeRepository.getStats()
    } catch (error_) {
      console.error('Error getting DTO committees stats:', error_)
      throw error_
    }
  }

  // ===== UNIFIED DTO LOADING =====
  /**
   * Load all DTO data at once (parents, students, staff, committees, classes)
   * This should be called once during app initialization
   */
  const loadAllDTOData = async (forceRefresh = false) => {
    console.log('Loading all DTO data...')

    try {
      // Load all DTOs in parallel
      await Promise.all([
        loadParentsDTO(forceRefresh),
        loadStudentsDTO(forceRefresh),
        loadStaffDTO(forceRefresh),
        loadCommitteesDTO(forceRefresh),
        loadAllData(forceRefresh), // Legacy: classes and committees
      ])

      console.log('All DTO data loaded successfully')
    } catch (error_) {
      console.error('Error loading all DTO data:', error_)
      throw error_
    }
  }

  /**
   * Check if all DTO data is loaded and fresh
   */
  const hasAllDTOData = computed(() => {
    return hasParentsDTO.value
      && hasStudentsDTO.value
      && hasStaffDTO.value
      && hasCommitteesDTO.value
      && hasData.value
  })

  /**
   * Check if any DTO data is stale
   */
  const isAnyDTODataStale = computed(() => {
    return isParentsDTOStale.value
      || isStudentsDTOStale.value
      || isStaffDTOStale.value
      || isCommitteesDTOStale.value
      || isDataStale.value
  })

  /**
   * Check if any DTO is currently loading
   */
  const isAnyDTOLoading = computed(() => {
    return parentsLoadingDTO.value
      || studentsLoadingDTO.value
      || staffLoadingDTO.value
      || committeesLoadingDTO.value
      || loading.value
  })

  return {
    // ===== LEGACY API (classes and committees only) =====
    classes,
    committees,
    loading,
    error,
    lastUpdated,

    // Getters
    isDataStale,
    hasData,
    dataStats,

    // Actions
    loadAllData,
    refreshData,
    clearData,

    // ===== DTO API =====
    // Student DTO State
    studentsDTO,
    studentsLoadingDTO,
    studentsErrorDTO,
    studentsLastUpdatedDTO,

    // Student DTO Getters
    isStudentsDTOStale,
    hasStudentsDTO,
    studentsDTOStats,

    // Student DTO Actions
    loadStudentsDTO,
    loadActiveStudentsDTO,
    refreshStudentsDTO,
    clearStudentsDTO,
    searchStudentsDTO,
    getStudentsDTOStats,

    // Parent DTO State
    parentsDTO,
    parentsLoadingDTO,
    parentsErrorDTO,
    parentsLastUpdatedDTO,

    // Parent DTO Getters
    isParentsDTOStale,
    hasParentsDTO,
    parentsDTOStats,

    // Parent DTO Actions
    loadParentsDTO,
    refreshParentsDTO,
    clearParentsDTO,
    searchParentsDTO,
    getParentsDTOStats,

    // Staff DTO State
    staffDTO,
    staffLoadingDTO,
    staffErrorDTO,
    staffLastUpdatedDTO,

    // Staff DTO Getters
    isStaffDTOStale,
    hasStaffDTO,
    staffDTOStats,

    // Staff DTO Actions
    loadStaffDTO,
    refreshStaffDTO,
    clearStaffDTO,
    searchStaffDTO,
    getStaffDTOStats,

    // Committee DTO State
    committeesDTO,
    committeesLoadingDTO,
    committeesErrorDTO,
    committeesLastUpdatedDTO,

    // Committee DTO Getters
    isCommitteesDTOStale,
    hasCommitteesDTO,
    committeesDTOStats,

    // Committee DTO Actions
    loadCommitteesDTO,
    refreshCommitteesDTO,
    clearCommitteesDTO,
    searchCommitteesDTO,
    getCommitteesDTOStats,

    // Unified DTO Loading
    loadAllDTOData,
    hasAllDTOData,
    isAnyDTODataStale,
    isAnyDTOLoading,

    // Repository access (for advanced usage)
    studentRepository,
    parentRepository,
    staffRepository,
    committeeRepository,
  }
})

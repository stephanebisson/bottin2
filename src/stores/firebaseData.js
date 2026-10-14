import { collection, getDocs } from 'firebase/firestore'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/firebase'
import { CommitteeRepository } from '@/repositories/CommitteeRepository.js'
import { ParentRepository } from '@/repositories/ParentRepository.js'
import { StaffRepository } from '@/repositories/StaffRepository.js'
import { StudentRepository } from '@/repositories/StudentRepository.js'

// Loaded data is reused for 5 minutes unless a reload is forced
const CACHE_DURATION = 5 * 60 * 1000

/**
 * A collection loaded on demand and cached: its items, loading flag and error,
 * and load(forceRefresh). Calls made while a load is running share it.
 */
function createCachedCollection (name, fetchAll) {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  let lastUpdated = null
  let inFlight = null

  const load = async (forceRefresh = false) => {
    if (!forceRefresh && lastUpdated && Date.now() - lastUpdated < CACHE_DURATION) {
      return items.value
    }
    if (inFlight) {
      return inFlight
    }

    inFlight = (async () => {
      loading.value = true
      error.value = null
      try {
        items.value = await fetchAll()
        lastUpdated = Date.now()
        return items.value
      } catch (error_) {
        console.error(`Error loading ${name}:`, error_)
        error.value = error_.message || `Failed to load ${name}`
        throw error_
      } finally {
        loading.value = false
        inFlight = null
      }
    })()
    return inFlight
  }

  return { items, loading, error, load }
}

export const useFirebaseDataStore = defineStore('firebaseData', () => {
  const studentRepository = new StudentRepository()
  const parentRepository = new ParentRepository()
  const staffRepository = new StaffRepository()
  const committeeRepository = new CommitteeRepository()

  const students = createCachedCollection('students', () => studentRepository.getAll())
  const parents = createCachedCollection('parents', () => parentRepository.getAll())
  const staff = createCachedCollection('staff', () => staffRepository.getAll())
  const committees = createCachedCollection('committees', () => committeeRepository.getAll())
  const classes = createCachedCollection('classes', async () => {
    const snapshot = await getDocs(collection(db, 'classes'))
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  })

  // The signed-in user's own parent record (null for staff-only users),
  // loaded on sign-in so pages don't need all parents to know who "me" is
  const currentParent = ref(null)
  let currentParentEmail = null

  const loadCurrentParent = async email => {
    currentParentEmail = email || null
    if (!email) {
      currentParent.value = null
      return null
    }
    try {
      currentParent.value = await parentRepository.getByEmail(email)
    } catch (error_) {
      console.error('Error loading current parent:', error_)
      currentParent.value = null
    }
    return currentParent.value
  }

  // Pull-to-refresh and the app bar refresh button
  const loadAllDTOData = async (forceRefresh = false) => {
    await Promise.all([
      parents.load(forceRefresh),
      students.load(forceRefresh),
      staff.load(forceRefresh),
      committees.load(forceRefresh),
      classes.load(forceRefresh),
      forceRefresh ? loadCurrentParent(currentParentEmail) : Promise.resolve(),
    ])
  }

  return {
    currentParent,
    loadCurrentParent,

    studentsDTO: students.items,
    studentsLoadingDTO: students.loading,
    studentsErrorDTO: students.error,
    loadStudentsDTO: students.load,

    parentsDTO: parents.items,
    parentsLoadingDTO: parents.loading,
    parentsErrorDTO: parents.error,
    loadParentsDTO: parents.load,
    searchParentsDTO: searchText => parentRepository.search(searchText),

    staffDTO: staff.items,
    staffLoadingDTO: staff.loading,
    staffErrorDTO: staff.error,
    loadStaffDTO: staff.load,
    refreshStaffDTO: () => staff.load(true),
    searchStaffDTO: searchText => staffRepository.search(searchText),

    committeesDTO: committees.items,
    committeesLoadingDTO: committees.loading,
    committeesErrorDTO: committees.error,
    loadCommitteesDTO: committees.load,
    refreshCommitteesDTO: () => committees.load(true),
    committeeRepository,

    classes: classes.items,
    classesLoading: classes.loading,
    classesError: classes.error,
    loadClasses: classes.load,

    loadAllDTOData,
  }
})

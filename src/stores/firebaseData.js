import { collection, getDocs } from 'firebase/firestore'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/firebase'

export const useFirebaseDataStore = defineStore('firebaseData', () => {
  // State
  const students = ref([])
  const parents = ref([])
  const staff = ref([])
  const classes = ref([])
  const committees = ref([])

  const loading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)

  // Cache settings (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000

  // Getters
  const isDataStale = computed(() => {
    if (!lastUpdated.value) {
      return true
    }
    return Date.now() - lastUpdated.value > CACHE_DURATION
  })

  const hasData = computed(() => {
    return students.value.length > 0
      || parents.value.length > 0
      || staff.value.length > 0
      || classes.value.length > 0
      || committees.value.length > 0
  })

  const dataStats = computed(() => ({
    students: students.value.length,
    parents: parents.value.length,
    staff: staff.value.length,
    classes: classes.value.length,
    committees: committees.value.length,
    lastUpdated: lastUpdated.value,
    isStale: isDataStale.value,
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

      const [studentsSnapshot, parentsSnapshot, staffSnapshot, classesSnapshot, committeesSnapshot] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'parents')),
        getDocs(collection(db, 'staff')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'committees')),
      ])

      students.value = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      parents.value = parentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      staff.value = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      classes.value = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      committees.value = committeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      lastUpdated.value = Date.now()

      console.log('Firebase data loaded:', {
        students: students.value.length,
        parents: parents.value.length,
        staff: staff.value.length,
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
    students.value = []
    parents.value = []
    staff.value = []
    classes.value = []
    committees.value = []
    lastUpdated.value = null
    error.value = null
  }

  return {
    // State - direct refs for reactive access
    students,
    parents,
    staff,
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
  }
})

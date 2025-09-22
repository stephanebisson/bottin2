import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getFunctionsBaseUrl } from '@/config/functions'
import { auth } from '@/firebase'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const userDisplayName = computed(() => user.value?.displayName || user.value?.email || 'User')
  const userEmail = computed(() => user.value?.email || '')

  // Actions
  const clearError = () => {
    error.value = null
  }

  // Securely validate if email exists using Firebase Functions
  const validateEmailExists = async email => {
    try {
      // Determine the correct function URL based on environment
      const baseUrl = getFunctionsBaseUrl()

      const response = await fetch(`${baseUrl}/validateEmailV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.authorized || false
    } catch (error) {
      console.error('Email validation request failed:', error)
      // Return false on network errors to prevent unauthorized access
      return false
    }
  }

  // Get user info (display name and type) from Firebase Functions
  const getUserInfo = async email => {
    try {
      const baseUrl = import.meta.env.DEV
        ? 'http://localhost:5001/bottin2-3b41d/northamerica-northeast1'
        : 'https://northamerica-northeast1-bottin2-3b41d.cloudfunctions.net'

      const response = await fetch(`${baseUrl}/validateEmailV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        authorized: data.authorized || false,
        displayName: data.displayName || '',
        userType: data.userType || '',
      }
    } catch (error) {
      console.error('User info request failed:', error)
      return {
        authorized: false,
        displayName: '',
        userType: '',
      }
    }
  }

  const setLoading = value => {
    loading.value = value
  }

  const setError = errorMessage => {
    error.value = errorMessage
    console.error('Auth Error:', errorMessage)
  }

  // Initialize auth state listener
  const initializeAuth = () => {
    return new Promise(resolve => {
      const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
        // If user exists but email is not verified, sign them out
        if (firebaseUser && !firebaseUser.emailVerified) {
          signOut(auth)
          user.value = null
        } else {
          user.value = firebaseUser
        }
        isInitialized.value = true
        unsubscribe() // Only need initial state
        resolve(firebaseUser)
      })
    })
  }

  // Register new user (only if email exists in parents or staff collections)
  const register = async (email, password) => {
    try {
      setLoading(true)
      clearError()

      // Get user info and validate authorization
      const userInfo = await getUserInfo(email)
      if (!userInfo.authorized) {
        throw new Error('UNAUTHORIZED_EMAIL')
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Set display name from database (first name)
      if (userInfo.displayName) {
        await updateProfile(userCredential.user, {
          displayName: userInfo.displayName,
        })
      }

      // Send email verification
      await sendEmailVerification(userCredential.user)

      user.value = userCredential.user
      return userCredential.user
    } catch (error_) {
      setError(getAuthErrorMessage(error_))
      throw error_
    } finally {
      setLoading(false)
    }
  }

  // Login existing user
  const login = async (email, password) => {
    try {
      setLoading(true)
      clearError()

      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        // Sign out the user immediately if email is not verified
        await signOut(auth)
        user.value = null
        throw new Error('EMAIL_NOT_VERIFIED')
      }

      user.value = userCredential.user
      return userCredential.user
    } catch (error_) {
      setError(getAuthErrorMessage(error_))
      throw error_
    } finally {
      setLoading(false)
    }
  }

  // Logout user
  const logout = async () => {
    try {
      setLoading(true)
      clearError()

      await signOut(auth)
      user.value = null
    } catch (error_) {
      setError(getAuthErrorMessage(error_))
      throw error_
    } finally {
      setLoading(false)
    }
  }

  // Send password reset email
  const resetPassword = async email => {
    try {
      setLoading(true)
      clearError()

      await sendPasswordResetEmail(auth, email)
    } catch (error_) {
      setError(getAuthErrorMessage(error_))
      throw error_
    } finally {
      setLoading(false)
    }
  }

  // Send email verification
  const sendVerificationEmail = async () => {
    try {
      setLoading(true)
      clearError()

      if (!user.value) {
        throw new Error('No user is currently signed in')
      }

      await sendEmailVerification(user.value)
      return { success: true, message: 'Verification email sent successfully' }
    } catch (error_) {
      const message = getAuthErrorMessage(error_)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  // Check if current user's email is verified
  const isEmailVerified = computed(() => user.value?.emailVerified || false)

  // Refresh current user's verification status
  const refreshUser = async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload()
        user.value = auth.currentUser
        return auth.currentUser.emailVerified
      }
      return false
    } catch (error) {
      console.error('Failed to refresh user:', error)
      throw error
    }
  }

  // Helper function to get user-friendly error messages
  const getAuthErrorMessage = error => {
    switch (error.code || error.message) {
      case 'auth/user-not-found': {
        return 'No account found with this email address.'
      }
      case 'auth/wrong-password': {
        return 'Incorrect password.'
      }
      case 'auth/email-already-in-use': {
        return 'An account with this email already exists.'
      }
      case 'auth/weak-password': {
        return 'Password should be at least 6 characters.'
      }
      case 'auth/invalid-email': {
        return 'Invalid email address.'
      }
      case 'auth/too-many-requests': {
        return 'Too many failed attempts. Please try again later.'
      }
      case 'auth/network-request-failed': {
        return 'Network error. Please check your connection.'
      }
      case 'UNAUTHORIZED_EMAIL': {
        return 'This email address is not authorized to create an account. Only registered parents and staff can create accounts.'
      }
      case 'EMAIL_NOT_VERIFIED': {
        return 'Please verify your email address before signing in. Check your inbox for a verification link.'
      }
      default: {
        return error.message || 'An unexpected error occurred.'
      }
    }
  }

  return {
    // State
    user,
    loading,
    error,
    isInitialized,

    // Getters
    isAuthenticated,
    isEmailVerified,
    userDisplayName,
    userEmail,

    // Actions
    initializeAuth,
    register,
    login,
    logout,
    resetPassword,
    sendVerificationEmail,
    refreshUser,
    validateEmailExists,
    getUserInfo,
    clearError,
    setError,
    setLoading,
  }
})

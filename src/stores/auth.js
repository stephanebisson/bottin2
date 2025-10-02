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
import { useI18n } from '@/composables/useI18n'
import { getFunctionsBaseUrl } from '@/config/functions'
import { auth } from '@/firebase'

export const useAuthStore = defineStore('auth', () => {
  // Get i18n instance for language detection
  const { locale } = useI18n()

  // State
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)
  const registrationDisabled = ref(true) // Temporarily disable registration until site launch

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const userDisplayName = computed(() => user.value?.displayName || user.value?.email || 'User')
  const userEmail = computed(() => user.value?.email || '')

  // Actions
  const clearError = () => {
    error.value = null
  }

  // Set Firebase auth language based on current UI locale
  const setFirebaseLanguage = () => {
    auth.languageCode = locale.value
    console.log(`🌐 Firebase auth language set to: ${locale.value}`)
  }

  // Email validation cache to reduce API calls
  const validationCache = new Map()
  const CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  // Service health monitoring
  const serviceHealth = ref({
    isOnline: navigator.onLine,
    firebaseReachable: true,
    lastChecked: null,
  })

  // Monitor network connectivity
  const updateOnlineStatus = () => {
    serviceHealth.value.isOnline = navigator.onLine
    console.log(serviceHealth.value.isOnline ? '🌐 Back online' : '📴 Gone offline')
  }

  // Add network event listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
  }

  // Check Firebase service health
  const checkFirebaseHealth = async () => {
    try {
      // Simple health check by making a minimal auth operation
      await auth.currentUser?.getIdToken(true)
      serviceHealth.value.firebaseReachable = true
      serviceHealth.value.lastChecked = Date.now()
      return true
    } catch (error) {
      console.warn('⚠️  Firebase health check failed:', error.message)
      serviceHealth.value.firebaseReachable = false
      serviceHealth.value.lastChecked = Date.now()
      return false
    }
  }

  // Consolidated email validation and user info function with enhanced error handling
  const validateAndGetUserInfo = async email => {
    try {
      // Check network connectivity first
      if (!serviceHealth.value.isOnline) {
        throw new Error('NO_INTERNET_CONNECTION')
      }

      // Check cache first
      const cacheKey = email.toLowerCase().trim()
      const cached = validationCache.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < CACHE_TIMEOUT) {
        console.log('Using cached email validation for:', email)
        return cached.data
      }

      // Use consistent base URL from config
      const baseUrl = getFunctionsBaseUrl()
      console.log('Validating email with:', baseUrl)

      // Use retry logic for the API call
      const result = await retryWithBackoff(async () => {
        const response = await fetch(`${baseUrl}/validateEmailV2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: cacheKey }),
        })

        if (!response.ok) {
          const errorText = await response.text()

          // Handle specific HTTP errors with helpful messages
          if (response.status === 503) {
            throw new Error('EMAIL_VALIDATION_SERVICE_UNAVAILABLE')
          } else if (response.status === 429) {
            throw new Error('TOO_MANY_REQUESTS')
          } else if (response.status >= 500) {
            throw new Error('SERVER_ERROR_VALIDATION')
          } else {
            throw new Error(`Validation failed: ${errorText}`)
          }
        }

        return await response.json()
      }, 3, 2000) // Retry up to 3 times with 2s base delay

      // Standardize response format
      const standardizedResult = {
        authorized: result.authorized || false,
        displayName: result.displayName || '',
        userType: result.userType || '',
        message: result.message || '',
      }

      // Cache successful results
      if (standardizedResult.authorized !== undefined) {
        validationCache.set(cacheKey, {
          data: standardizedResult,
          timestamp: Date.now(),
        })
      }

      // Update Firebase health status on successful API call
      serviceHealth.value.firebaseReachable = true
      serviceHealth.value.lastChecked = Date.now()

      return standardizedResult
    } catch (error) {
      console.error('Email validation request failed after retries:', error)

      // Update service health if this looks like a service issue
      if (error.message.includes('fetch') || error.message.includes('network')) {
        await checkFirebaseHealth()
      }

      // Return consistent error response with helpful context
      return {
        authorized: false,
        displayName: '',
        userType: '',
        error: error.message,
        networkIssue: !serviceHealth.value.isOnline,
        serviceIssue: !serviceHealth.value.firebaseReachable,
      }
    }
  }

  // Legacy function for backward compatibility (simple validation only)
  const validateEmailExists = async email => {
    const result = await validateAndGetUserInfo(email)
    return result.authorized
  }

  // Legacy function for backward compatibility (kept for existing components)
  const getUserInfo = async email => {
    return await validateAndGetUserInfo(email)
  }

  const setLoading = value => {
    loading.value = value
  }

  const setError = errorMessage => {
    error.value = errorMessage
    console.error('Auth Error:', errorMessage)
  }

  // Track auth state listener unsubscribe function
  let authStateUnsubscribe = null

  // Initialize auth state listener with continuous monitoring
  const initializeAuth = () => {
    return new Promise(resolve => {
      // If already listening, don't create another listener
      if (authStateUnsubscribe) {
        resolve(user.value)
        return
      }

      authStateUnsubscribe = onAuthStateChanged(auth, firebaseUser => {
        // Always set the user, regardless of verification status
        user.value = firebaseUser

        if (!isInitialized.value) {
          isInitialized.value = true
          resolve(firebaseUser)
        }

        // Log verification status changes for debugging
        if (firebaseUser) {
          console.log('Auth state changed:', {
            email: firebaseUser.email,
            verified: firebaseUser.emailVerified,
            uid: firebaseUser.uid,
          })
        } else {
          console.log('User signed out')
        }
      })
    })
  }

  // Register new user (only if email exists in parents or staff collections)
  const register = async (email, password) => {
    try {
      setLoading(true)
      clearError()

      // Check if registration is temporarily disabled
      if (registrationDisabled.value) {
        throw new Error('REGISTRATION_DISABLED')
      }

      // Get user info and validate authorization using new consolidated function
      const userInfo = await validateAndGetUserInfo(email)
      if (!userInfo.authorized) {
        if (userInfo.error) {
          console.error('Email validation failed:', userInfo.error)
        }
        throw new Error('UNAUTHORIZED_EMAIL')
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Set display name from database (first name)
      if (userInfo.displayName) {
        await updateProfile(userCredential.user, {
          displayName: userInfo.displayName,
        })
      }

      // Set language for verification email and send it
      setFirebaseLanguage()
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

      // Set user but don't sign them out if unverified
      user.value = userCredential.user

      // If email is not verified, throw error to redirect to verification page
      // but keep user signed in so they can resend verification emails
      if (!userCredential.user.emailVerified) {
        throw new Error('EMAIL_NOT_VERIFIED')
      }

      return userCredential.user
    } catch (error_) {
      // Don't sign out user for EMAIL_NOT_VERIFIED - let them stay logged in
      if (error_.message !== 'EMAIL_NOT_VERIFIED') {
        user.value = null
      }
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

      // Set language for password reset email
      setFirebaseLanguage()
      await sendPasswordResetEmail(auth, email)
    } catch (error_) {
      setError(getAuthErrorMessage(error_))
      throw error_
    } finally {
      setLoading(false)
    }
  }

  // Utility function for exponential backoff retry
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    let lastError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        console.log(`Attempt ${attempt} failed:`, error.message)

        if (attempt === maxRetries) {
          throw lastError
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Send email verification with retry logic
  const sendVerificationEmail = async () => {
    try {
      setLoading(true)
      clearError()

      if (!user.value) {
        throw new Error('No user is currently signed in')
      }

      // Set language and use retry logic for email verification
      setFirebaseLanguage()
      await retryWithBackoff(async () => {
        await sendEmailVerification(user.value)
      }, 3, 1000)

      console.log('✅ Verification email sent successfully')
      return { success: true, message: 'Verification email sent successfully' }
    } catch (error_) {
      let message = getAuthErrorMessage(error_)

      // Add specific guidance for common email sending issues
      if (error_.message?.includes('network') || error_.message?.includes('fetch')) {
        message += getAuthErrorMessage({ message: 'CHECK_INTERNET_CONNECTION' })
      } else if (error_.message?.includes('quota') || error_.message?.includes('limit')) {
        message += getAuthErrorMessage({ message: 'EMAIL_LIMIT_REACHED' })
      } else if (error_.message?.includes('invalid-user-token')) {
        message = getAuthErrorMessage({ message: 'SESSION_EXPIRED_RESEND_EMAIL' })
      }

      console.error('❌ Failed to send verification email after retries:', error_)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  // Check if current user's email is verified
  const isEmailVerified = computed(() => user.value?.emailVerified || false)

  // Refresh current user's verification status with enhanced debugging
  const refreshUser = async () => {
    try {
      if (!auth.currentUser) {
        console.warn('⚠️  No current user to refresh')
        return false
      }

      console.log('🔄 Refreshing user verification status...')
      console.log('   Current user:', {
        email: auth.currentUser.email,
        uid: auth.currentUser.uid,
        emailVerified: auth.currentUser.emailVerified,
      })

      // Force reload user data from Firebase
      await auth.currentUser.reload()

      // Force refresh the auth token (this is crucial for emulator)
      try {
        await auth.currentUser.getIdToken(true) // Force refresh token
        console.log('✅ Auth token refreshed successfully')
      } catch (tokenError) {
        console.warn('⚠️  Token refresh failed:', tokenError.message)
      }

      // Emulator-specific workaround: sometimes needs a small delay
      if (import.meta.env.DEV) {
        console.log('🔧 Emulator mode: adding small delay for sync')
        await new Promise(resolve => setTimeout(resolve, 500))

        // Try one more reload after delay
        await auth.currentUser.reload()
      }

      // Update local user state
      user.value = auth.currentUser

      const isVerified = auth.currentUser.emailVerified
      console.log('📧 Email verification status after refresh:', isVerified)

      if (isVerified) {
        console.log('🎉 Email verification detected!')
      } else {
        console.log('❌ Email still not verified after refresh')
        console.log('   This could mean:')
        console.log('   1. Email link not clicked yet')
        console.log('   2. Different browser/device was used')
        console.log('   3. Emulator sync delay')
      }

      return isVerified
    } catch (error) {
      console.error('❌ Failed to refresh user:', error)
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
      case 'REGISTRATION_DISABLED': {
        return 'Account creation is temporarily disabled until the site is officially launched. Please check back later.'
      }
      case 'EMAIL_NOT_VERIFIED': {
        return 'Please verify your email address before signing in. Check your inbox for a verification link.'
      }
      case 'NO_INTERNET_CONNECTION': {
        return 'No internet connection. Please check your network and try again.'
      }
      case 'EMAIL_VALIDATION_SERVICE_UNAVAILABLE': {
        return 'Email validation service temporarily unavailable. Please try again in a moment.'
      }
      case 'TOO_MANY_REQUESTS': {
        return 'Too many requests. Please wait a moment and try again.'
      }
      case 'SERVER_ERROR_VALIDATION': {
        return 'Server error during email validation. Please try again.'
      }
      case 'CHECK_INTERNET_CONNECTION': {
        return ' Please check your internet connection and try again.'
      }
      case 'EMAIL_LIMIT_REACHED': {
        return ' You may have reached the email sending limit. Please try again in a few hours.'
      }
      case 'SESSION_EXPIRED_RESEND_EMAIL': {
        return 'Your session has expired. Please sign in again to resend verification email.'
      }
      default: {
        return error.message || 'An unexpected error occurred.'
      }
    }
  }

  // Cleanup function to unsubscribe from auth listener
  const cleanup = () => {
    if (authStateUnsubscribe) {
      authStateUnsubscribe()
      authStateUnsubscribe = null
    }
  }

  return {
    // State
    user,
    loading,
    error,
    isInitialized,
    serviceHealth,
    registrationDisabled,

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
    validateEmailExists, // Legacy - use validateAndGetUserInfo instead
    getUserInfo, // Legacy - use validateAndGetUserInfo instead
    validateAndGetUserInfo,
    checkFirebaseHealth,
    clearError,
    setError,
    setLoading,
    cleanup,
  }
})

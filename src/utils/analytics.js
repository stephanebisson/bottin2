/**
 * Firebase Analytics utility functions
 * Provides safe wrappers that check if analytics is enabled before logging events
 */

import { analytics } from '@/firebase'

/**
 * Safely log a page view event
 * @param {string} path - The page path (e.g., '/families')
 * @param {string} title - The page title/name
 */
export async function logPageView (path, title) {
  const analyticsInstance = analytics()

  if (!analyticsInstance) {
    // Analytics is disabled (dev mode or unsupported)
    return
  }

  try {
    const { logEvent } = await import('firebase/analytics')
    logEvent(analyticsInstance, 'page_view', {
      page_path: path,
      page_title: title || path,
      page_location: window.location.href,
    })

    if (import.meta.env.DEV) {
      console.log('📊 Analytics: page_view', { path, title })
    }
  } catch (error) {
    console.warn('Failed to log page view:', error)
  }
}

/**
 * Set user context for analytics
 * @param {Object} user - User object with id, role, and emailVerified
 */
export async function setUserContext (user) {
  const analyticsInstance = analytics()

  if (!analyticsInstance || !user) {
    return
  }

  try {
    const { setUserId, setUserProperties } = await import('firebase/analytics')
    setUserId(analyticsInstance, user.uid)
    setUserProperties(analyticsInstance, {
      role: user.role || 'unknown',
      email_verified: user.emailVerified || false,
    })

    if (import.meta.env.DEV) {
      console.log('📊 Analytics: user context set', {
        uid: user.uid,
        role: user.role,
        emailVerified: user.emailVerified,
      })
    }
  } catch (error) {
    console.warn('Failed to set user context:', error)
  }
}

/**
 * Clear user context (on logout)
 */
export async function clearUserContext () {
  const analyticsInstance = analytics()

  if (!analyticsInstance) {
    return
  }

  try {
    const { setUserId } = await import('firebase/analytics')
    setUserId(analyticsInstance, null)

    if (import.meta.env.DEV) {
      console.log('📊 Analytics: user context cleared')
    }
  } catch (error) {
    console.warn('Failed to clear user context:', error)
  }
}

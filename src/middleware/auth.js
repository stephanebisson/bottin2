import { useAuthStore } from '@/stores/auth'

/**
 * Authentication middleware for route protection
 */
export const authMiddleware = {
  /**
   * Middleware to require authentication
   * Redirects to auth page if user is not authenticated
   */
  requireAuth: async (to, from, next) => {
    const authStore = useAuthStore()

    // Wait for auth initialization if not already done
    if (!authStore.isInitialized) {
      await authStore.initializeAuth()
    }

    if (authStore.isAuthenticated) {
      // Check if email is verified
      if (!authStore.isEmailVerified) {
        next('/email-verification-required?blocked=true')
        return
      }
      next() // User is authenticated and verified, proceed
    } else {
      // User is not authenticated, redirect to auth page
      next({
        path: '/auth',
        query: { redirect: to.fullPath }, // Save intended destination
      })
    }
  },

  /**
   * Middleware to redirect authenticated users away from auth pages
   * Redirects to home if user is already authenticated
   */
  redirectIfAuth: async (to, from, next) => {
    const authStore = useAuthStore()

    // Wait for auth initialization if not already done
    if (!authStore.isInitialized) {
      await authStore.initializeAuth()
    }

    if (authStore.isAuthenticated) {
      // Check if there's a redirect query parameter
      const redirectPath = to.query.redirect || '/'
      next(redirectPath) // User is authenticated, redirect to intended page or home
    } else {
      next() // User is not authenticated, proceed to auth page
    }
  },

  /**
   * Global auth initialization middleware
   * Ensures auth state is initialized before any route navigation
   */
  initializeAuth: async (to, from, next) => {
    const authStore = useAuthStore()

    // Initialize auth state if not already done
    if (!authStore.isInitialized) {
      try {
        await authStore.initializeAuth()
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      }
    }

    next()
  },
}

/**
 * Route configuration helper to add auth requirements
 */
export const routeConfig = {
  // Routes that require authentication (using paths instead of names)
  protected: [
    '/', // Home page
    '/students', // Students directory
    '/parents', // Parents directory
    '/families', // Families directory
    '/staff', // Staff directory
    '/classes', // Classes page
    '/committees', // Committees page
    '/profile', // User profile page
    '/admin', // Admin page and all admin sub-pages
  ],

  // Routes that should redirect authenticated users
  public: [
    '/auth', // Authentication page
  ],

  // Routes that are completely public (no auth required)
  open: [
    '/update', // Parent update forms (with token)
    '/update-success', // Update completion page
    '/email-verification-required', // Email verification page
  ],
}

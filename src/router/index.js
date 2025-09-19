/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

import { setupLayouts } from 'virtual:generated-layouts'
// Composables
/* eslint-disable-next-line import/no-duplicates */
import { createRouter, createWebHistory } from 'vue-router'
/* eslint-disable-next-line import/no-duplicates */
import { routes } from 'vue-router/auto-routes'
import { authMiddleware, routeConfig } from '@/middleware/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
  scrollBehavior (to, from, savedPosition) {
    // If the user used browser back/forward buttons, restore saved position
    if (savedPosition) {
      return savedPosition
    }
    // Otherwise, scroll to top
    return { top: 0 }
  },
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (localStorage.getItem('vuetify:dynamic-reload')) {
      console.error('Dynamic import error, reloading page did not fix it', err)
    } else {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    }
  } else {
    console.error(err)
  }
})

// Global navigation guards for authentication
router.beforeEach(async (to, from, next) => {
  // Always initialize auth first
  await authMiddleware.initializeAuth(to, from, () => {})

  // Check if route requires authentication
  const requiresAuth = routeConfig.protected.some(protectedPath => {
    // Exact match or admin sub-route
    return to.path === protectedPath || (protectedPath === '/admin' && to.path.startsWith('/admin'))
  })

  if (requiresAuth) {
    return authMiddleware.requireAuth(to, from, next)
  }

  // Check if route should redirect authenticated users
  if (routeConfig.public.includes(to.path)) {
    return authMiddleware.redirectIfAuth(to, from, next)
  }

  // Check if route is completely open (no auth required)
  const isOpenRoute = routeConfig.open.some(openPath => to.path.startsWith(openPath))
  if (isOpenRoute) {
    return next()
  }

  // No special auth requirements, proceed
  next()
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router

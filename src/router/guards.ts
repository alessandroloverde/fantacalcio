import type { NavigationGuard } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const requireAuth: NavigationGuard = (to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated && to.meta.requiresAuth) {
    // Redirect to login page if trying to access protected route
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
}

export const redirectIfAuthenticated: NavigationGuard = (to, from, next) => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated && to.meta.guestOnly) {
    // Redirect to dashboard if trying to access guest-only route while authenticated
    next({ name: 'dashboard' })
  } else {
    next()
  }
}

import { createRouter, createWebHistory } from 'vue-router'
import { requireAuth, redirectIfAuthenticated } from './guards'
import LoginForm from '@/components/LoginForm.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginForm,
      meta: { guestOnly: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
    // Add other routes as needed
  ],
})

// Register global guards
router.beforeEach(requireAuth)
router.beforeEach(redirectIfAuthenticated)

export default router

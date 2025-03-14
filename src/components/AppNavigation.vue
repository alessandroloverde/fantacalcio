<template>
  <header class="app-header">
    <h1>Fantacalcio</h1>
    <nav class="main-nav">
      <router-link
        to="/dashboard"
        class="nav-link"
        :class="{ active: $route.path === '/dashboard' }"
      >
        Dashboard
      </router-link>
      <router-link to="/mercato" class="nav-link" :class="{ active: $route.path === '/mercato' }">
        Mercato
      </router-link>
      <router-link to="/settings" class="nav-link" :class="{ active: $route.path === '/settings' }">
        Settings
      </router-link>
      <button @click="handleLogout" class="nav-link logout-button">Logout</button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { logout } from '@/utils/auth'

const router = useRouter()

const handleLogout = async () => {
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Error logging out:', error)
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem 0;
  border-bottom: 1px solid #eee;
}

.main-nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-link {
  color: #666;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background-color: #f5f5f5;
  color: #333;
}

.nav-link.active {
  color: #4caf50;
  background-color: #e8f5e9;
}

.logout-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #dc3545;
}

.logout-button:hover {
  background-color: #ffebee;
}
</style>

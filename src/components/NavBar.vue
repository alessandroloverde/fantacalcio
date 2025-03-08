<template>
  <nav class="navbar">
    <div class="nav-brand">Fantacalcio</div>
    <div class="nav-links">
      <template v-if="authStore.isAuthenticated">
        <router-link to="/dashboard">Dashboard</router-link>
        <a href="#" @click.prevent="handleLogout">Logout</a>
      </template>
      <template v-else>
        <router-link to="/login">Login</router-link>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { logout } from '@/utils/auth'

const authStore = useAuthStore()
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
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: bold;
  color: #4caf50;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  color: #666;
  text-decoration: none;
  font-weight: 500;
}

.nav-links a:hover {
  color: #4caf50;
}

.nav-links a.router-link-active {
  color: #4caf50;
}
</style>

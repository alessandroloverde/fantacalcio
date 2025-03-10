<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>Dashboard</h1>
      <button @click="handleLogout" class="logout-button">Logout</button>
    </header>

    <div class="user-info" v-if="authStore.user">
      <p>Welcome, {{ authStore.user.email }}</p>
    </div>

    <div class="participants-section">
      <h2>Participants</h2>
      <div v-if="loading" class="loading">Loading participants...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="participants-list">
        <router-link
          v-for="participant in participants"
          :key="participant.id"
          :to="{ name: 'participant-detail', params: { id: participant.id } }"
          :class="['participant-card', { 'current-user': isCurrentUser(participant) }]"
        >
          <div class="participant-info">
            <h3>{{ participant.name }}</h3>
            <p>{{ participant.email }}</p>
          </div>
          <div class="participant-role">
            <span :class="{ admin: participant.role }">
              {{ participant.role ? 'Admin' : 'User' }}
            </span>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { logout } from '@/utils/auth'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Participant } from '@/utils/addParticipants'

defineOptions({
  name: 'UserDashboard',
})

const authStore = useAuthStore()
const router = useRouter()
const participants = ref<(Participant & { id: string })[]>([])
const loading = ref(true)
const error = ref('')

const fetchParticipants = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'participants'))
    participants.value = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Participant & { id: string })[]
  } catch (err) {
    error.value = 'Error fetching participants'
    console.error('Error fetching participants:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchParticipants()
})

const handleLogout = async () => {
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

const isCurrentUser = (participant: Participant & { id: string }) => {
  return participant.email === authStore.user?.email
}
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.logout-button {
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.logout-button:hover {
  background-color: #c82333;
}

.user-info {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.participants-section {
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.participants-section h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #dc3545;
}

.participants-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.participant-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #eee;
  text-decoration: none;
  transition: all 0.2s ease;
}

.participant-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #4caf50;
}

.participant-info h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}

.participant-info p {
  margin: 0.5rem 0 0;
  color: #666;
  font-size: 0.9rem;
}

.participant-role span {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  background-color: #e9ecef;
  color: #666;
}

.participant-role span.admin {
  background-color: #4caf50;
  color: white;
}

.participant-card.current-user {
  border: 2px solid #2196f3;
  background-color: #f5f9ff;
}

.participant-card.current-user:hover {
  border-color: #2196f3;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
}
</style>

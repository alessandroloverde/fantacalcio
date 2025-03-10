<template>
  <div class="participant-detail">
    <div class="back-button">
      <router-link to="/dashboard" class="back-link">← Back to Dashboard</router-link>
    </div>

    <div v-if="loading" class="loading">Loading participant details...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="participant" class="participant-content">
      <header class="participant-header">
        <h1>{{ participant.name }}</h1>
        <div class="badges">
          <span :class="['role-badge', { admin: participant.role }]">
            {{ participant.role ? 'Admin' : 'User' }}
          </span>
          <span v-if="isCurrentUser" class="current-user-badge">You</span>
        </div>
      </header>

      <div class="participant-info">
        <div class="info-group">
          <label>Email</label>
          <p>{{ participant.email }}</p>
        </div>
        <!-- Add more participant details here -->
      </div>
    </div>
    <div v-else class="error">Participant not found</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Participant } from '@/utils/addParticipants'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const loading = ref(true)
const error = ref('')
const participant = ref<Participant | null>(null)

const isCurrentUser = computed(() => participant.value?.email === authStore.user?.email)

const fetchParticipant = async () => {
  const participantId = route.params.id as string
  try {
    const docRef = doc(db, 'participants', participantId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      participant.value = {
        id: docSnap.id,
        ...(docSnap.data() as Omit<Participant, 'id'>),
      } as Participant & { id: string }
    } else {
      error.value = 'Participant not found'
    }
  } catch (err) {
    error.value = 'Error fetching participant details'
    console.error('Error fetching participant:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchParticipant()
})
</script>

<style scoped>
.participant-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.back-button {
  margin-bottom: 2rem;
}

.back-link {
  color: #4caf50;
  text-decoration: none;
  font-weight: 500;
}

.back-link:hover {
  text-decoration: underline;
}

.participant-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.participant-header h1 {
  margin: 0;
  color: #333;
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
  background-color: #e9ecef;
  color: #666;
}

.role-badge.admin {
  background-color: #4caf50;
  color: white;
}

.participant-info {
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.info-group {
  margin-bottom: 1.5rem;
}

.info-group:last-child {
  margin-bottom: 0;
}

.info-group label {
  display: block;
  font-weight: 500;
  color: #666;
  margin-bottom: 0.5rem;
}

.info-group p {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
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

.badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.current-user-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
  background-color: #2196f3;
  color: white;
}
</style>

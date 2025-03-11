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
      </div>

      <div class="team-section">
        <h2>Team</h2>
        <div class="team-import">
          <input
            type="file"
            ref="fileInput"
            accept=".csv"
            @change="handleFileUpload"
            class="file-input"
          />
          <button @click="importTeam" :disabled="!selectedFile" class="import-button">
            Import Team from CSV
          </button>
        </div>

        <div v-if="importError" class="error">{{ importError }}</div>

        <div v-if="team.length > 0" class="team-list">
          <div v-for="(player, index) in team" :key="index" class="player-card">
            <div class="player-role">{{ player.role }}</div>
            <div class="player-info">
              <div class="player-name">{{ player.name }}</div>
              <div class="player-team">{{ player.team }}</div>
            </div>
            <div class="player-cost">{{ player.cost }}M</div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="error">Participant not found</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Participant } from '@/utils/addParticipants'
import type { Player } from '@/types/Player'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const loading = ref(true)
const error = ref('')
const importError = ref('')
const participant = ref<Participant | null>(null)
const team = ref<Player[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

const isCurrentUser = computed(() => participant.value?.email === authStore.user?.email)

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}

const importTeam = async () => {
  if (!selectedFile.value) return

  importError.value = ''
  const file = selectedFile.value

  try {
    const text = await file.text()
    const lines = text.split('\n')

    // Skip first two rows and process until row 26
    const teamData = lines.slice(2, 26).map((line) => {
      const [role, name, team, cost] = line.split(',').map((item) => item.trim())
      return {
        role,
        name,
        team,
        cost: parseFloat(cost) || 0,
      }
    })

    team.value = teamData.filter(
      (player) => player.role && player.name && player.team && !isNaN(player.cost),
    )

    if (participant.value?.id) {
      await setDoc(doc(db, 'participants', participant.value.id), {
        ...participant.value,
        team: team.value,
      })
    }

    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (err) {
    importError.value = 'Error importing team. Please check the CSV format.'
    console.error('Error importing team:', err)
  }
}

const fetchParticipant = async () => {
  const participantId = route.params.id as string
  try {
    const docRef = doc(db, 'participants', participantId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      participant.value = {
        id: docSnap.id,
        ...(docSnap.data() as Omit<Participant, 'id'>),
      } as Participant & { id: string }
      team.value = data.team || []
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

.team-section {
  margin-top: 2rem;
}

.team-section h2 {
  margin-bottom: 1rem;
  color: #333;
}

.team-import {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.file-input {
  flex: 1;
}

.import-button {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.import-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.team-list {
  display: grid;
  gap: 1rem;
}

.player-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #eee;
}

.player-role {
  width: 80px;
  font-weight: 500;
  color: #666;
}

.player-info {
  flex: 1;
}

.player-name {
  font-weight: 500;
  color: #333;
}

.player-team {
  font-size: 0.9rem;
  color: #666;
}

.player-cost {
  font-weight: 500;
  color: #4caf50;
}
</style>

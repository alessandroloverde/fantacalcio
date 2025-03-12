<template>
  <div class="mercato">
    <AppNavigation />

    <div class="mercato-content">
      <div v-if="isAdmin" class="import-section">
        <input
          type="file"
          ref="fileInput"
          accept=".csv"
          @change="handleFileUpload"
          class="file-input"
        />
        <button @click="importPlayers" :disabled="!selectedFile" class="import-button">
          Import Players
        </button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div class="players-section">
        <h2>Available Players</h2>
        <div class="filters">
          <select v-model="roleFilter" class="filter-select">
            <option value="">All Roles</option>
            <option v-for="role in uniqueRoles" :key="role" :value="role">{{ role }}</option>
          </select>
          <select v-model="teamFilter" class="filter-select">
            <option value="">All Teams</option>
            <option v-for="team in uniqueTeams" :key="team" :value="team">{{ team }}</option>
          </select>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search players..."
            class="search-input"
          />
        </div>

        <div class="players-list">
          <div class="player-card" v-for="player in filteredPlayers" :key="player.name">
            <div class="player-role">{{ player.role }}</div>
            <div class="player-info">
              <div class="player-name">{{ player.name }}</div>
              <div class="player-team">{{ player.team }}</div>
            </div>
            <div class="player-quotation">{{ player.quotation }}M</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { setDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Player } from '@/types/Player'
import { useAuthStore } from '@/stores/auth'
import AppNavigation from '@/components/AppNavigation.vue'

defineOptions({
  name: 'MercatoView',
})

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const error = ref('')
const players = ref<Player[]>([])
const roleFilter = ref('')
const teamFilter = ref('')
const searchQuery = ref('')

// Computed properties for filters
const uniqueRoles = computed(() => [...new Set(players.value.map((p) => p.role))].sort())
const uniqueTeams = computed(() => [...new Set(players.value.map((p) => p.team))].sort())

const filteredPlayers = computed(() => {
  return players.value
    .filter((player) => {
      const matchesRole = !roleFilter.value || player.role === roleFilter.value
      const matchesTeam = !teamFilter.value || player.team === teamFilter.value
      const matchesSearch =
        !searchQuery.value ||
        player.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        player.team.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchesRole && matchesTeam && matchesSearch
    })
    .sort((a, b) => {
      // Sort by role first, then by quotation (descending)
      if (a.role !== b.role) return a.role.localeCompare(b.role)
      return b.quotation - a.quotation
    })
})

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}

const importPlayers = async () => {
  if (!selectedFile.value || !isAdmin.value) return

  error.value = ''
  const file = selectedFile.value

  try {
    const text = await file.text()
    const lines = text.split('\n')

    // Skip header row
    const playersData = lines.slice(1).map((line) => {
      const [name, team, role, quotation] = line.split(',').map((item) => item.trim())
      return {
        name,
        team,
        role,
        quotation: parseFloat(quotation) || 0,
      }
    })

    // Filter out invalid entries
    const validPlayers = playersData.filter(
      (player) => player.name && player.team && player.role && !isNaN(player.quotation),
    )

    if (validPlayers.length === 0) {
      error.value = 'No valid player data found in the CSV file'
      return
    }

    // Update Firestore
    await setDoc(doc(db, 'mercato', 'players'), {
      players: validPlayers,
    })

    // Update local state
    players.value = validPlayers
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (err) {
    error.value = 'Error importing players. Please check the CSV format.'
    console.error('Error importing players:', err)
  }
}

// Fetch players on component mount
const fetchPlayers = async () => {
  try {
    const playersDoc = await getDoc(doc(db, 'mercato', 'players'))

    if (playersDoc.exists()) {
      const data = playersDoc.data()
      players.value = data.players || []
    }
  } catch (err) {
    error.value = 'Error fetching players'
    console.error('Error fetching players:', err)
  }
}

fetchPlayers()
</script>

<style scoped>
.mercato {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.mercato-content {
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mercato-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.mercato-header h1 {
  margin: 0;
  color: #333;
}

.import-section {
  display: flex;
  gap: 1rem;
  align-items: center;
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

.error {
  color: #dc3545;
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f8d7da;
  border-radius: 4px;
}

.players-section {
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.players-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.players-header h2 {
  margin: 0;
  color: #333;
}

.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-select,
.search-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.search-input {
  min-width: 200px;
}

.players-list {
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

.player-quotation {
  font-weight: 500;
  color: #4caf50;
}
</style>

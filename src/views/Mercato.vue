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
              <div v-if="player.currentBid" class="player-bid">
                <p>Current Bid: {{ player.currentBid.amount }}M</p>
                <p>By: {{ player.currentBid.bidderTeamName }}</p>
                <p>Expires: {{ formatDate(player.currentBid.expiresAt) }}</p>
                <p v-if="player.currentBid.replacedPlayer">
                  Replacing: {{ player.currentBid.replacedPlayer.name }}
                </p>
              </div>
            </div>
            <div class="player-quotation">{{ player.quotation }}M</div>
            <button
              v-if="authStore.participantData"
              @click="openBidModal(player)"
              class="bid-button"
            >
              Acquista
            </button>
          </div>
        </div>
      </div>
    </div>

    <BidModal
      v-if="showBidModal"
      :show="showBidModal"
      :player="selectedPlayer!"
      :current-team="currentTeam"
      :available-credits="availableCredits"
      @close="closeBidModal"
      @submit="handleBidSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  setDoc,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Player } from '@/types/Player'
import type { Bid } from '@/types/Bid'
import { useAuthStore } from '@/stores/auth'
import AppNavigation from '@/components/AppNavigation.vue'
import BidModal from '@/components/BidModal.vue'

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

const showBidModal = ref(false)
const selectedPlayer = ref<Player | null>(null)
const currentTeam = ref<Player[]>([])
const availableCredits = ref(500) // Default budget, you might want to fetch this from Firestore

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

const openBidModal = (player: Player) => {
  selectedPlayer.value = player
  showBidModal.value = true
}

const closeBidModal = () => {
  selectedPlayer.value = null
  showBidModal.value = false
}

const handleBidSubmit = async (bidData: Omit<Bid, 'playerId'>) => {
  if (!selectedPlayer.value) return

  try {
    // Create bid object without undefined values
    const bidToSave = {
      playerId: selectedPlayer.value.name,
      bidderTeamName: bidData.bidderTeamName,
      bidderParticipantId: bidData.bidderParticipantId,
      amount: bidData.amount,
      expiresAt: Timestamp.fromDate(bidData.expiresAt),
      createdAt: Timestamp.fromDate(bidData.createdAt),
    }

    // Only add replacedPlayer if it exists
    if (bidData.replacedPlayer) {
      Object.assign(bidToSave, { replacedPlayer: bidData.replacedPlayer })
    }

    // Add bid to Firestore
    await addDoc(collection(db, 'bids'), bidToSave)

    // Fetch updated bids immediately
    await fetchActiveBids()

    closeBidModal()
  } catch (err) {
    error.value = 'Error placing bid'
    console.error('Error placing bid:', err)
  }
}

const formatDate = (date: Date | { seconds: number; nanoseconds: number }) => {
  if (date instanceof Date) {
    return date.toLocaleString()
  }
  // Handle Firestore Timestamp
  return new Date(date.seconds * 1000).toLocaleString()
}

// Fetch current team on component mount
const fetchCurrentTeam = async () => {
  if (!authStore.participantData?.id) return

  try {
    const participantDoc = await getDoc(doc(db, 'participants', authStore.participantData.id))
    if (participantDoc.exists()) {
      const data = participantDoc.data()
      currentTeam.value = data.team || []
      availableCredits.value = data.availableCredits || 500
    }
  } catch (err) {
    console.error('Error fetching current team:', err)
  }
}

// Fetch active bids for players
const fetchActiveBids = async () => {
  try {
    const now = Timestamp.now()
    const bidsQuery = query(collection(db, 'bids'), where('expiresAt', '>', now))

    const bidsSnapshot = await getDocs(bidsQuery)
    const activeBids = bidsSnapshot.docs.map((doc) => ({
      ...doc.data(),
      // Convert Firestore Timestamps back to dates for the UI
      expiresAt: doc.data().expiresAt,
      createdAt: doc.data().createdAt,
    })) as Bid[]

    // Update players with their current bids
    players.value = players.value.map((player) => {
      const currentBid = activeBids.find((bid) => bid.playerId === player.name)
      return {
        ...player,
        currentBid,
      }
    })
  } catch (err) {
    console.error('Error fetching active bids:', err)
  }
}

// Update existing onMounted logic
fetchPlayers()
if (!isAdmin.value) {
  fetchCurrentTeam()
}
fetchActiveBids()
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
  gap: 1rem;
}

.player-role {
  width: 80px;
  font-weight: 500;
  color: #666;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
  min-width: 0;
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
  margin: 0 1rem;
  flex-shrink: 0;
}

.player-bid {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  padding: 0.5rem;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.player-bid p {
  margin: 0.25rem 0;
}

.bid-button {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.bid-button:hover {
  background-color: #45a049;
}
</style>

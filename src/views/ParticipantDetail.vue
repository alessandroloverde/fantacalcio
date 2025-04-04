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
          <div class="team-header-section">
            <div class="team-logo-container">
              <img
                v-if="participant.logoData"
                :src="participant.logoData"
                alt="Team Logo"
                class="team-logo"
              />
              <div v-else class="team-logo-placeholder">
                {{ participant.teamName?.[0]?.toUpperCase() || participant.name[0].toUpperCase() }}
              </div>
            </div>
            <h2>{{ participant.teamName }}</h2>
            <h3>crediti: {{ participant.credits }}</h3>
          </div>
          <div v-if="isCurrentUser || isAdmin" class="logo-upload">
            <input
              type="file"
              ref="logoInput"
              accept="image/jpeg,image/png"
              @change="handleLogoUpload"
              class="logo-file-input"
            />
            <button @click="uploadLogo" :disabled="!selectedLogo" class="upload-button">
              {{ participant.logoData ? 'Change Logo' : 'Upload Logo' }}
            </button>
            <button v-if="participant.logoData" @click="removeLogo" class="remove-button">
              Remove Logo
            </button>
          </div>
          <p v-if="logoError" class="error">{{ logoError }}</p>
          <hr />
          <label>Email</label>
          <p>{{ participant.email }}</p>
        </div>
      </div>

      <div class="team-section">
        <h2>Team</h2>

        <!-- Add auction won notification box -->
        <div v-if="showAuctionNotification" class="auction-notification">
          <div class="notification-header">
            <h3>Auction Won! 🎉</h3>
            <button class="close-button" @click="showAuctionNotification = false">&times;</button>
          </div>
          <div class="notification-content">
            <div class="player-info">
              <div class="player-name">{{ auctionPlayer?.name }}</div>
              <div class="player-details">
                <span class="player-role">{{ auctionPlayer?.role }}</span>
                <span class="player-team">{{ auctionPlayer?.team }}</span>
                <span class="player-cost">{{ auctionBidAmount }}M</span>
              </div>
            </div>
            <div class="credits-info">
              <p>Cost: {{ auctionBidAmount }}M</p>
              <p>Current Credits: {{ participant?.credits || 500 }}M</p>
              <p>Remaining Credits: {{ (participant?.credits || 500) - auctionBidAmount }}M</p>
            </div>

            <div v-if="replacementNeeded" class="replacement-section">
              <h3>Player Replacement Required</h3>
              <p class="info-text">
                Your team is at maximum capacity. Please select a player to replace or confirm your
                previous choice.
              </p>
              <p class="time-info">
                You have {{ formattedTimeLeft }} to make your choice, or your initial selection will
                be confirmed automatically.
              </p>

              <div class="form-group">
                <label for="replacementPlayer">Select Player to Replace:</label>
                <select id="replacementPlayer" v-model="selectedReplacement">
                  <option value="">Select a player</option>
                  <option
                    v-for="teamPlayer in currentTeam"
                    :key="teamPlayer.name"
                    :value="teamPlayer"
                    :selected="teamPlayer.name === initialReplacement?.name"
                  >
                    {{ teamPlayer.name }} ({{ teamPlayer.role }})
                  </option>
                </select>
              </div>

              <div v-if="initialReplacement" class="initial-choice">
                <p>Initial choice to replace: {{ initialReplacement.name }}</p>
              </div>
            </div>
            <div class="notification-actions">
              <button class="confirm-button" @click="handleAuctionConfirm">Confirm Purchase</button>
            </div>
          </div>
        </div>

        <div v-if="isAdmin" class="team-import">
          <input
            type="file"
            ref="fileInput"
            accept=".csv"
            @change="handleFileUpload"
            class="file-input"
          />
          <button @click="importTeam" :disabled="!selectedFile" class="import-button">
            Load Team from CSV
          </button>
        </div>

        <div v-if="importError" class="error">{{ importError }}</div>

        <div v-if="previewTeam.length > 0 && isAdmin" class="preview-section">
          <div class="preview-header">
            <h3>Preview Team</h3>
            <div class="preview-actions">
              <button @click="cancelImport" class="cancel-button">Cancel</button>
              <button @click="acceptTeam" class="accept-button">Accept Team</button>
            </div>
          </div>
          <div class="team-list preview-list">
            <div v-for="(player, index) in sortedPreviewTeam" :key="index" class="player-card">
              <section class="player-role">{{ player.role }}</section>
              <section class="player-info">
                <div class="player-name">{{ player.name }}</div>
                <div class="player-team">{{ player.team }}</div>
              </section>
              <section class="player-cost">{{ player.paidPrice || player.cost }}M</section>
            </div>
          </div>
        </div>

        <div v-if="team.length > 0" class="current-team-section">
          <div class="team-header">
            <h3>Current Team</h3>
            <button v-if="isAdmin" @click="showClearTeamModal = true" class="clear-button">
              Clear Team
            </button>
          </div>
          <div class="team-list">
            <section class="team-info">
              <div class="team-info--totalPlayers">
                Numero di giocatori:
                <span :class="isTeamOverloaded ? 'textWarning--inline' : ''">
                  {{ sortedTeam.length }}
                </span>
              </div>
              <div class="team-info--playersByRole">
                <span>P: {{ sortedTeam.filter((player) => player.role === 'P').length }}</span>
                <span>D: {{ sortedTeam.filter((player) => player.role === 'D').length }}</span>
                <span>C: {{ sortedTeam.filter((player) => player.role === 'C').length }}</span>
                <span>A: {{ sortedTeam.filter((player) => player.role === 'A').length }}</span>
              </div>
            </section>

            <div
              v-for="(player, index) in sortedTeam"
              :key="index"
              class="player-card"
              :class="`role-${player.role}`"
            >
              <div class="player-index">{{ index + 1 }}</div>
              <div class="player-role">{{ player.role }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.name }}</div>
                <div class="player-team">{{ player.team }}</div>
              </div>
              <div class="player-cost">{{ player.paidPrice || player.cost }}M</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="error">Participant not found</div>

    <ConfirmModal
      :show="showClearTeamModal"
      title="Clear Team"
      message="Are you sure you want to clear the entire team? This action cannot be undone."
      @confirm="clearTeam"
      @cancel="() => (showClearTeamModal = false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import type { WithFieldValue, DocumentSnapshot, SnapshotOptions } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Participant } from '@/utils/addParticipants'
import type { Player } from '@/types/Player'
import { useAuthStore } from '@/stores/auth'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useSettings } from '@/composables/useSettings'

const route = useRoute()
const authStore = useAuthStore()
const { maxTeamSize, auctionConfirmationMinutes } = useSettings()
const loading = ref(true)
const error = ref('')
const importError = ref('')
const participant = ref<Participant | null>(null)
const team = ref<Player[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const showClearTeamModal = ref(false)
const previewTeam = ref<Player[]>([])
const logoInput = ref<HTMLInputElement | null>(null)
const selectedLogo = ref<File | null>(null)
const logoError = ref('')

// Replace showAuctionCompletionModal with showAuctionNotification
const showAuctionNotification = ref(false)

// Add new refs for auction completion
const auctionPlayer = ref<Player | null>(null)
const auctionBidAmount = ref(0)
const selectedReplacement = ref<Player | null>(null)
const initialReplacement = ref<Player | null>(null)
const currentTeam = computed(() => team.value)
const timeLeft = ref<number>(0)
const timerInterval = ref<number | null>(null)

const formattedTimeLeft = computed(() => {
  const hours = Math.floor(timeLeft.value / (60 * 60 * 1000))
  const minutes = Math.floor((timeLeft.value % (60 * 60 * 1000)) / (60 * 1000))
  return `${hours}h ${minutes}m`
})

// Start timer when auction is won
const startReplacementTimer = () => {
  // Clear any existing timer
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  timerInterval.value = window.setInterval(() => {
    timeLeft.value -= 1000
    if (timeLeft.value <= 0) {
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
        timerInterval.value = null
      }
      handleAuctionConfirm()
    }
  }, 1000)
}

// Add cleanup function
const cleanupTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

// Cleanup on component unmount
onUnmounted(() => {
  cleanupTimer()
})

const isCurrentUser = computed(() => participant.value?.email === authStore.user?.email)
const isAdmin = computed(() => authStore.isAdmin)

// Add the role order map and sorted team computed property
const roleOrder: { [key: string]: number } = {
  P: 1,
  D: 2,
  C: 3,
  A: 4,
}

const sortedTeam = computed(() => {
  return [...team.value].sort((a, b) => {
    return (roleOrder[a.role] || 0) - (roleOrder[b.role] || 0)
  })
})

const sortedPreviewTeam = computed(() => {
  return [...previewTeam.value].sort((a, b) => {
    return (roleOrder[a.role] || 0) - (roleOrder[b.role] || 0)
  })
})

const replacementNeeded = computed(() => {
  return team.value.length >= maxTeamSize.value
})

const isTeamOverloaded = computed(() => sortedTeam.value.length > maxTeamSize.value)

// Create a converter for Participant type
const participantConverter = {
  toFirestore: (participant: WithFieldValue<Participant>) => {
    return participant
  },
  fromFirestore: (snapshot: DocumentSnapshot, options: SnapshotOptions) => {
    const data = snapshot.data(options)
    return {
      id: snapshot.id,
      ...data,
    } as Participant
  },
}

// Get a reference to the participants collection with the converter
const participantsCollection = collection(db, 'participants').withConverter(participantConverter)

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
    const teamData = lines.slice(2, 27).map((line) => {
      const [role, name, team, quotation] = line.split(',').map((item) => item.trim())
      return {
        role,
        name,
        team,
        quotation: parseFloat(quotation) || 0,
        paidPrice: parseFloat(quotation) || 0, // Initialize paidPrice with quotation
      }
    })

    previewTeam.value = teamData.filter(
      (player) => player.role && player.name && player.team && !isNaN(player.quotation),
    )

    if (previewTeam.value.length === 0) {
      importError.value = 'No valid team data found in the CSV file'
    }
  } catch (err) {
    importError.value = 'Error importing team. Please check the CSV format.'
    console.error('Error importing team:', err)
  }
}

const acceptTeam = async () => {
  if (participant.value?.id) {
    try {
      const participantRef = doc(participantsCollection, participant.value.id)
      await setDoc(participantRef, {
        ...participant.value,
        team: previewTeam.value,
      })
      team.value = previewTeam.value
      previewTeam.value = []
      selectedFile.value = null
      if (fileInput.value) fileInput.value.value = ''
    } catch (err) {
      importError.value = 'Error saving team to database'
      console.error('Error saving team:', err)
    }
  }
}

const cancelImport = () => {
  previewTeam.value = []
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const clearTeam = async () => {
  if (participant.value?.id) {
    try {
      const participantRef = doc(participantsCollection, participant.value.id)
      await setDoc(participantRef, {
        ...participant.value,
        team: [],
      })
      team.value = []
    } catch (err) {
      error.value = 'Error clearing team from database'
      console.error('Error clearing team:', err)
    }
  }
  showClearTeamModal.value = false
}

const handleLogoUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]

    // Check file size (500KB limit for base64)
    if (file.size > 500 * 1024) {
      logoError.value = 'Logo size must be less than 500KB'
      input.value = ''
      return
    }

    // Check file type
    if (!file.type.match(/image\/(jpeg|png)/)) {
      logoError.value = 'Logo must be a JPG or PNG file'
      input.value = ''
      return
    }

    selectedLogo.value = file
    logoError.value = ''
  }
}

const uploadLogo = async () => {
  if (!selectedLogo.value || !participant.value?.id) return

  const currentParticipant = participant.value
  if (!currentParticipant) return

  try {
    // Convert image to base64
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64String = reader.result as string
        const participantData: Participant = {
          name: currentParticipant.name,
          email: currentParticipant.email,
          role: currentParticipant.role,
          id: currentParticipant.id,
          team: currentParticipant.team,
          teamName: currentParticipant.teamName,
          logoData: base64String,
          credits: currentParticipant.credits || 500,
        }

        // Update participant document
        const participantRef = doc(participantsCollection, currentParticipant.id!)
        await setDoc(participantRef, participantData)

        // Update local state
        participant.value = participantData

        // Reset file input
        selectedLogo.value = null
        if (logoInput.value) logoInput.value.value = ''
        logoError.value = ''
      } catch (err) {
        logoError.value = 'Error saving logo'
        console.error('Error saving logo:', err)
      }
    }

    reader.onerror = () => {
      logoError.value = 'Error reading logo file'
    }

    reader.readAsDataURL(selectedLogo.value)
  } catch (err) {
    logoError.value = 'Error processing logo'
    console.error('Error processing logo:', err)
  }
}

const removeLogo = async () => {
  if (!participant.value?.id) return

  const currentParticipant = participant.value
  if (!currentParticipant) return

  try {
    // Create a new participant object without the logoData field
    const participantData: Participant = {
      name: currentParticipant.name,
      email: currentParticipant.email,
      role: currentParticipant.role,
      id: currentParticipant.id,
      team: currentParticipant.team,
      teamName: currentParticipant.teamName,
      credits: currentParticipant.credits || 500,
    }

    // Update participant document
    const participantRef = doc(participantsCollection, currentParticipant.id)
    await setDoc(participantRef, participantData)

    // Update local state
    participant.value = participantData
  } catch (err) {
    logoError.value = 'Error removing logo'
    console.error('Error removing logo:', err)
  }
}

const fetchParticipant = async () => {
  const participantId = route.params.id as string
  console.log('Fetching participant with ID:', participantId)

  try {
    // Create a document reference with the converter
    const docRef = doc(db, 'participants', participantId).withConverter(participantConverter)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      console.log('Raw participant data:', data)

      participant.value = data
      team.value = data.team || []

      // Check for expired bids that need completion
      await checkExpiredBids()

      console.log('Team data:', team.value)
      if (team.value.length > 0) {
        console.log('First player data:', team.value[0])
      }
    } else {
      error.value = 'Participant not found'
      console.log('No participant found with ID:', participantId)
    }
  } catch (err) {
    error.value = 'Error fetching participant details'
    console.error('Error fetching participant:', err)
  } finally {
    loading.value = false
  }
}

const checkExpiredBids = async () => {
  console.log('Checking expired bids...')
  const now = new Date()

  // Clean up any existing timer
  cleanupTimer()

  try {
    // Query for unprocessed bids
    const bidsRef = collection(db, 'bids')
    const q = query(
      bidsRef,
      where('bidderParticipantId', '==', route.params.id),
      where('processed', '==', false),
    )

    const querySnapshot = await getDocs(q)
    console.log('Found pending bids:', querySnapshot.docs.length)

    // Find the first unprocessed and uncompleted bid
    const uncompletedBid = querySnapshot.docs.find((doc) => !doc.data().completed)
    if (!uncompletedBid) {
      console.log('No uncompleted bids found')
      return
    }

    const bid = uncompletedBid.data()
    console.log('Processing uncompleted bid:', bid)

    // Create won player object directly from bid data
    const wonPlayer = {
      name: bid.playerId,
      team: bid.playerTeam,
      role: bid.playerRole,
      quotation: bid.playerQuotation,
      cost: bid.amount,
      paidPrice: bid.amount,
    }

    console.log('Won player:', wonPlayer)

    // Always set up notification data first
    auctionPlayer.value = wonPlayer
    auctionBidAmount.value = bid.amount
    showAuctionNotification.value = true

    // Initialize replacement if needed
    if (team.value.length >= maxTeamSize.value) {
      initialReplacement.value = bid.replacedPlayer || null
      selectedReplacement.value = initialReplacement.value
    }

    // Handle expiration time
    const confirmationTimeMs = auctionConfirmationMinutes.value * 60 * 1000
    let expiresAt: Date

    if (bid.expiresAt) {
      expiresAt = bid.expiresAt.toDate()
      const timeRemaining = expiresAt.getTime() - now.getTime()

      // If time has expired or no time was set, create a new expiration time
      if (timeRemaining <= 0) {
        expiresAt = new Date(now.getTime() + confirmationTimeMs)
        console.log('Setting new expiration time:', expiresAt)
        await updateDoc(uncompletedBid.ref, {
          expiresAt: Timestamp.fromDate(expiresAt),
        })
      }
    } else {
      // If no expiresAt, set new timer
      expiresAt = new Date(now.getTime() + confirmationTimeMs)
      console.log('Setting new expiration time:', expiresAt)
      await updateDoc(uncompletedBid.ref, {
        expiresAt: Timestamp.fromDate(expiresAt),
      })
    }

    // Set the time remaining and start the timer
    timeLeft.value = expiresAt.getTime() - now.getTime()
    console.log('Starting timer with duration:', timeLeft.value)
    startReplacementTimer()
  } catch (err) {
    console.error('Error checking bids:', err)
    if (err instanceof Error && err.message.includes('requires an index')) {
      console.log('Waiting for index to be created...')
      return
    }
    error.value = 'Error checking bids'
  }
}

// Update handleAuctionConfirm to cleanup timer
const handleAuctionConfirm = async () => {
  if (!auctionPlayer.value || !participant.value?.id) return

  // Clean up timer first
  cleanupTimer()

  try {
    const participantRef = doc(participantsCollection, participant.value.id)
    const mercatoRef = doc(db, 'mercato', 'players')

    // Create player object with bid amount
    const playerWithPrice: Player = {
      name: auctionPlayer.value.name,
      team: auctionPlayer.value.team,
      role: auctionPlayer.value.role,
      quotation: auctionPlayer.value.quotation || 0,
      paidPrice: auctionBidAmount.value,
    }

    // Get current mercato state
    const mercatoDoc = await getDoc(mercatoRef)
    if (!mercatoDoc.exists()) {
      throw new Error('Mercato document not found')
    }

    // Get the current team and handle player replacement
    const currentTeam = [...team.value]
    const bidsRef = collection(db, 'bids')
    const q = query(
      bidsRef,
      where('playerId', '==', auctionPlayer.value.name),
      where('bidderParticipantId', '==', participant.value.id),
    )
    const querySnapshot = await getDocs(q)
    // Filter completed bids in memory instead of in the query
    const relevantBids = querySnapshot.docs.filter((doc) => !doc.data().completed)
    const bid = relevantBids[0]?.data()

    // Get current mercato players
    const currentMercatoPlayers = mercatoDoc.data().players || []
    let updatedTeam
    const updatedMercatoPlayers = currentMercatoPlayers.filter(
      (p: Player) => p.name !== auctionPlayer.value?.name,
    )

    // Use selectedReplacement if available, otherwise use the bid's replacedPlayer
    const playerToReplace = selectedReplacement.value || bid?.replacedPlayer

    if (playerToReplace) {
      // Remove the replaced player from team and add the new one
      updatedTeam = currentTeam
        .filter((p: Player) => p.name !== playerToReplace.name)
        .concat([playerWithPrice])

      // Add replaced player back to mercato
      const replacedPlayer = {
        name: playerToReplace.name,
        team: playerToReplace.team,
        role: playerToReplace.role,
        quotation: playerToReplace.quotation || 0,
        currentBid: null,
      }
      updatedMercatoPlayers.push(replacedPlayer)
    } else {
      // Just add the new player
      updatedTeam = [...currentTeam, playerWithPrice]
    }

    // Update mercato
    const mercatoPlayers = updatedMercatoPlayers.map((p: Player) => ({
      name: p.name,
      team: p.team,
      role: p.role,
      quotation: Number(p.quotation) || 0,
      currentBid: null,
    }))
    await setDoc(mercatoRef, { players: mercatoPlayers })

    // Update participant
    const teamPlayers = updatedTeam.map((p) => ({
      name: p.name,
      team: p.team,
      role: p.role,
      quotation: Number(p.quotation) || 0,
      paidPrice: Number(p.paidPrice) || 0,
    }))
    await setDoc(participantRef, {
      ...participant.value,
      team: teamPlayers,
      credits: (participant.value?.credits || 500) - auctionBidAmount.value,
    })

    // Mark all related bids as completed
    await Promise.all(
      relevantBids.map((doc) =>
        setDoc(doc.ref, {
          ...doc.data(),
          processed: true,
          completed: true,
          completedAt: Timestamp.fromDate(new Date()),
          finalReplacedPlayer: playerToReplace || null,
        }),
      ),
    )

    // Update local state
    team.value = updatedTeam
    if (participant.value) {
      participant.value.credits = (participant.value.credits || 500) - auctionBidAmount.value
    }

    // Reset auction state
    showAuctionNotification.value = false
    auctionPlayer.value = null
    auctionBidAmount.value = 0
    selectedReplacement.value = null
    initialReplacement.value = null
    timeLeft.value = 0
  } catch (error) {
    console.error('Error updating team:', error)
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

.player-index {
  display: flex;
  border-radius: 50%;
  background-color: #606060;
  color: white;
  width: 2em;
  height: 2em;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.player-role {
  width: 80px;
  font-weight: 500;
  color: #666;
}

.role-P {
  background-color: #c6b8b0;
}
.role-D {
  background-color: #a4b9a5;
}
.role-C {
  background-color: #c7aac4;
}
.role-A {
  background-color: #acb9c3;
}

.player-info {
  flex: 1;
  display: flex;
  align-items: center;
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
  color: #155117;
}

.preview-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.preview-list .player-card {
  background-color: #f1f1f1;
  border: 1px solid #ddd;
}

.preview-list .player-role {
  color: #888;
}

.preview-list .player-name {
  color: #666;
}

.preview-list .player-team {
  color: #888;
}

.preview-list .player-cost {
  color: #888;
}

.preview-actions .accept-button {
  padding: 0.5rem 1rem;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.preview-actions .accept-button:hover {
  background-color: #1976d2;
}

.current-team-section {
  margin-top: 2rem;
}

h3 {
  margin-bottom: 1rem;
  color: #333;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.team-info {
  background-color: #e0dede;
  border-radius: 8px;
  box-shadow: 2px 4px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  display: flex;
  justify-content: space-between;
}
.team-info--playersByRole > span {
  margin-left: 0.5em;
}

.preview-actions {
  display: flex;
  gap: 1rem;
}

.preview-actions .cancel-button {
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.preview-actions .cancel-button:hover {
  background-color: #e9ecef;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.clear-button {
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.clear-button:hover {
  background-color: #c82333;
}

.team-logo-container {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.team-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.team-logo-placeholder {
  font-size: 2.5rem;
  font-weight: bold;
  color: #666;
}

.logo-upload {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.logo-file-input {
  flex: 1;
}

.upload-button {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.upload-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.remove-button {
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error {
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.auction-notification {
  background-color: #fff;
  border: 1px solid #4caf50;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.notification-header {
  background-color: #4caf50;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.notification-header h3 {
  margin: 0;
  color: white;
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.notification-content {
  padding: 1rem;
}

.player-name {
  font-size: 1.2rem;
  font-weight: 500;
  margin-right: 1.5em;
}

.player-details {
  display: flex;
  gap: 1rem;
  color: #666;
}

.credits-info {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.credits-info p {
  margin: 0.5rem 0;
  color: #333;
}

.notification-actions {
  display: flex;
  justify-content: flex-end;
}

.confirm-button {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.confirm-button:hover {
  background-color: #45a049;
}
</style>

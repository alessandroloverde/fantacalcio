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
            <div v-for="(player, index) in previewTeam" :key="index" class="player-card">
              <div class="player-role">{{ player.role }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.name }}</div>
                <div class="player-team">{{ player.team }}</div>
              </div>
              <div class="player-cost">{{ player.paidPrice || player.cost }}M</div>
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
            <div v-for="(player, index) in team" :key="index" class="player-card">
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
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc, setDoc, collection } from 'firebase/firestore'
import type { WithFieldValue, DocumentSnapshot, SnapshotOptions } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Participant } from '@/utils/addParticipants'
import type { Player } from '@/types/Player'
import { useAuthStore } from '@/stores/auth'
import ConfirmModal from '@/components/ConfirmModal.vue'

const route = useRoute()
const authStore = useAuthStore()
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

const isCurrentUser = computed(() => participant.value?.email === authStore.user?.email)
const isAdmin = computed(() => authStore.isAdmin)

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
</style>

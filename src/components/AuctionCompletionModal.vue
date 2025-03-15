<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>Auction Won! 🎉</h2>
        <button class="close-button" @click="closeModal">&times;</button>
      </header>

      <div class="modal-body">
        <div class="player-info">
          <h3>New Player Acquired</h3>
          <div class="player-card">
            <div class="player-role">{{ player.role }}</div>
            <div class="player-info">
              <div class="player-name">{{ player.name }}</div>
              <div class="player-team">{{ player.team }}</div>
            </div>
            <div class="player-cost">{{ bidAmount }}M</div>
          </div>
        </div>

        <div v-if="replacementNeeded" class="replacement-section">
          <h3>Player Replacement Required</h3>
          <p class="info-text">
            Your team is at maximum capacity. Please select a player to replace or confirm your
            previous choice.
          </p>
          <p class="time-info">
            You have {{ formattedTimeLeft }} to make your choice, or your initial selection will be
            confirmed automatically.
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

        <div class="credits-info">
          <p>Cost: {{ bidAmount }}M</p>
          <p>Current Credits: {{ currentCredits }}M</p>
          <p>Remaining Credits: {{ currentCredits - bidAmount }}M</p>
        </div>
      </div>

      <footer class="modal-footer">
        <button class="cancel-button" @click="closeModal" :disabled="processing">Cancel</button>
        <button class="confirm-button" @click="handleConfirm" :disabled="!canConfirm || processing">
          Confirm Selection
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Player } from '@/types/Player'

const props = defineProps<{
  show: boolean
  player: Player
  bidAmount: number
  currentTeam: Player[]
  currentCredits: number
  participantId: string
  initialReplacement?: Player
  autoConfirmTime?: Date
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'completed'): void
}>()

const selectedReplacement = ref<Player | null>(null)
const processing = ref(false)
const timeLeft = ref(0)
const timer = ref<number | null>(null)

// Set initial replacement if provided
if (props.initialReplacement) {
  selectedReplacement.value = props.initialReplacement
}

const replacementNeeded = computed(() => props.currentTeam.length >= 25)
const canConfirm = computed(
  () => !replacementNeeded.value || selectedReplacement.value || props.initialReplacement,
)

const formattedTimeLeft = computed(() => {
  const hours = Math.floor(timeLeft.value / 3600)
  const minutes = Math.floor((timeLeft.value % 3600) / 60)
  return `${hours}h ${minutes}m`
})

const updateTimeLeft = () => {
  if (props.autoConfirmTime) {
    const now = new Date()
    const diff = Math.max(0, Math.floor((props.autoConfirmTime.getTime() - now.getTime()) / 1000))
    timeLeft.value = diff

    if (diff === 0 && timer.value) {
      clearInterval(timer.value)
      handleConfirm()
    }
  }
}

const handleConfirm = async () => {
  if (processing.value) return
  processing.value = true

  try {
    const participantRef = doc(db, 'participants', props.participantId)
    const mercatoRef = doc(db, 'mercato', 'players')
    const replacementPlayer = selectedReplacement.value || props.initialReplacement

    // Create player object with bid amount
    const playerWithPrice: Player = {
      name: props.player.name,
      team: props.player.team,
      role: props.player.role,
      quotation: props.player.quotation,
      paidPrice: props.bidAmount,
    }

    // Get current mercato state
    const mercatoDoc = await getDoc(mercatoRef)
    if (!mercatoDoc.exists()) {
      throw new Error('Mercato document not found')
    }

    // Get current players and remove the won player
    const currentPlayers = mercatoDoc.data().players || []
    const updatedPlayers = currentPlayers.filter((p: Player) => p.name !== props.player.name)

    // If there's a replacement player, add it back to mercato
    if (replacementPlayer) {
      updatedPlayers.push(replacementPlayer)
    }

    // Update mercato first
    await updateDoc(mercatoRef, {
      players: updatedPlayers,
    })

    // Get current participant state
    const participantDoc = await getDoc(participantRef)
    if (!participantDoc.exists()) {
      throw new Error('Participant document not found')
    }

    // Get current team and update it
    const currentTeam = participantDoc.data().team || []
    const updatedTeam = currentTeam.filter((p: Player) => p.name !== replacementPlayer?.name)
    updatedTeam.push(playerWithPrice)

    // Update participant document
    await updateDoc(participantRef, {
      team: updatedTeam,
      credits: props.currentCredits - props.bidAmount,
    })

    emit('completed')
    closeModal()
  } catch (error) {
    console.error('Error updating team:', error)
  } finally {
    processing.value = false
  }
}

const closeModal = () => {
  if (processing.value) return
  emit('close')
}

onMounted(() => {
  if (props.autoConfirmTime) {
    updateTimeLeft()
    timer.value = setInterval(updateTimeLeft, 1000)
  }
})

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.player-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #eee;
  margin: 1rem 0;
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

.replacement-section {
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: #fff8e1;
  border-radius: 4px;
}

.time-info {
  color: #ff9800;
  font-weight: 500;
  margin: 1rem 0;
}

.credits-info {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.credits-info p {
  margin: 0.5rem 0;
  font-weight: 500;
}

.form-group {
  margin: 1rem 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.cancel-button,
.confirm-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
}

.confirm-button {
  background-color: #4caf50;
  color: white;
  border: none;
}

.confirm-button:disabled,
.cancel-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.initial-choice {
  margin: 1rem 0;
  padding: 0.5rem;
  background-color: #e3f2fd;
  border-radius: 4px;
  color: #1976d2;
}
</style>

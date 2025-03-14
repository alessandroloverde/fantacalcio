<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>Place Bid for {{ player.name }}</h2>
        <button class="close-button" @click="closeModal">&times;</button>
      </header>

      <div class="modal-body">
        <div class="bid-info">
          <p><strong>Player:</strong> {{ player.name }} ({{ player.team }}) - {{ player.role }}</p>
          <p><strong>Quotation:</strong> {{ player.quotation }}M</p>
          <p><strong>Your Credits:</strong> {{ availableCredits }}M</p>
        </div>

        <div class="bid-form">
          <div class="form-group">
            <label for="bidAmount">Bid Amount (M):</label>
            <input
              type="number"
              id="bidAmount"
              v-model="bidAmount"
              :max="availableCredits"
              min="1"
            />
            <span class="helper-text">Available Credits: {{ availableCredits }}M</span>
          </div>

          <div class="form-group" v-if="currentTeam.length > 0">
            <label for="replacedPlayer">
              Replace Player
              <span v-if="needsReplacement" class="required"
                >(Required - Team at maximum size of {{ maxTeamSize }})</span
              >
              <span v-else>(Optional)</span>
            </label>
            <select id="replacedPlayer" v-model="replacedPlayer" :required="needsReplacement">
              <option value="">Select a player to replace</option>
              <option v-for="teamPlayer in currentTeam" :key="teamPlayer.name" :value="teamPlayer">
                {{ teamPlayer.name }} ({{ teamPlayer.role }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <button class="cancel-button" @click="closeModal">Cancel</button>
        <button class="confirm-button" @click="handleSubmit" :disabled="!isValid">Place Bid</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Player } from '@/types/Player'
import type { Bid } from '@/types/Bid'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/composables/useSettings'

const props = defineProps<{
  show: boolean
  player: Player
  currentTeam: Player[]
  availableCredits: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', bid: Omit<Bid, 'playerId'>): void
}>()

const authStore = useAuthStore()
const { maxTeamSize } = useSettings()
const bidAmount = ref(1)
const replacedPlayer = ref<Player | null>(null)
const bidError = ref('')
const replacementError = ref('')

const needsReplacement = computed(() => {
  return props.currentTeam.length >= maxTeamSize.value
})

const isValid = computed(() => {
  if (bidAmount.value < 1 || bidAmount.value > props.availableCredits) return false
  if (needsReplacement.value && !replacedPlayer.value) return false
  return true
})

const closeModal = () => {
  bidAmount.value = 1
  replacedPlayer.value = null
  bidError.value = ''
  replacementError.value = ''
  emit('close')
}

const handleSubmit = () => {
  // Validate bid amount
  if (bidAmount.value < 1 || bidAmount.value > props.availableCredits) {
    bidError.value = `Bid must be between 1 and ${props.availableCredits}M`
    return
  }

  // Validate player replacement if team is full
  if (props.currentTeam.length >= maxTeamSize.value && !replacedPlayer.value) {
    replacementError.value = 'You must select a player to replace'
    return
  }

  // Calculate expiration date (24 hours from now)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  const bid: Omit<Bid, 'playerId'> = {
    bidderTeamName: authStore.participantData?.teamName || 'Unknown Team',
    bidderParticipantId: authStore.participantData?.id || '',
    amount: bidAmount.value,
    replacedPlayer: replacedPlayer.value || undefined,
    expiresAt,
    createdAt: new Date(),
  }

  emit('submit', bid)
  closeModal()
}
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

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 1rem;
}

.bid-info {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.bid-info p {
  margin: 0.5rem 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.cancel-button {
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-button {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>

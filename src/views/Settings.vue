<template>
  <div class="settings">
    <AppNavigation />

    <div class="settings-content">
      <h1>Settings</h1>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">{{ success }}</div>

      <div class="settings-section">
        <h2>Team Settings</h2>
        <div class="setting-item">
          <label for="maxTeamSize">Maximum Players per Team:</label>
          <div class="setting-control">
            <input
              type="number"
              id="maxTeamSize"
              v-model="maxTeamSize"
              :disabled="!isAdmin"
              min="22"
              max="28"
            />
            <button
              v-if="isAdmin"
              @click="saveSettings"
              class="save-button"
              :disabled="!hasChanges"
            >
              Save Changes
            </button>
          </div>
          <p class="setting-description">
            The maximum number of players that can be in a team. This affects the bidding process.
          </p>
        </div>

        <div class="setting-item">
          <label for="initialBudget">Initial Team Budget (Credits):</label>
          <div class="setting-control">
            <input
              type="number"
              id="initialBudget"
              v-model="initialBudget"
              :disabled="!isAdmin"
              min="100"
              max="1000"
              step="10"
            />
          </div>
          <p class="setting-description">
            The initial budget allocated to new teams. This is the starting amount of credits for
            player acquisitions.
          </p>
        </div>
      </div>

      <div class="settings-section">
        <h2>Auction Settings</h2>
        <div class="setting-item">
          <label for="bidExpirationMinutes">Bid Expiration Time (Minutes):</label>
          <div class="setting-control">
            <input
              type="number"
              id="bidExpirationMinutes"
              v-model="bidExpirationMinutes"
              :disabled="!isAdmin"
              min="1"
              max="4320"
            />
          </div>
          <p class="setting-description">
            The time in minutes before a bid expires. After this time, if no counterbid is made, the
            bid is successful. Minimum 1 minute, maximum 72 hours (4320 minutes).
          </p>
        </div>

        <div class="setting-item">
          <label for="counterbidExpirationMinutes">Counterbid Expiration Time (Minutes):</label>
          <div class="setting-control">
            <input
              type="number"
              id="counterbidExpirationMinutes"
              v-model="counterbidExpirationMinutes"
              :disabled="!isAdmin"
              min="1"
              max="4320"
            />
          </div>
          <p class="setting-description">
            The time in minutes before a counterbid expires. This will be used when the counterbid
            feature is implemented. Minimum 1 minute, maximum 72 hours (4320 minutes).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import AppNavigation from '@/components/AppNavigation.vue'
import type { Settings } from '@/composables/useSettings'

defineOptions({
  name: 'SettingsView',
})

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const error = ref('')
const success = ref('')
const maxTeamSize = ref(25)
const initialBudget = ref(400)
const bidExpirationMinutes = ref(1440)
const counterbidExpirationMinutes = ref(1440)

// Keep track of original values for change detection
const originalValues = ref({
  maxTeamSize: 25,
  initialBudget: 400,
  bidExpirationMinutes: 1440,
  counterbidExpirationMinutes: 1440,
})

const hasChanges = computed(() => {
  return (
    maxTeamSize.value !== originalValues.value.maxTeamSize ||
    initialBudget.value !== originalValues.value.initialBudget ||
    bidExpirationMinutes.value !== originalValues.value.bidExpirationMinutes ||
    counterbidExpirationMinutes.value !== originalValues.value.counterbidExpirationMinutes
  )
})

const fetchSettings = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'))
    if (settingsDoc.exists()) {
      const data = settingsDoc.data() as Settings
      maxTeamSize.value = data.maxTeamSize
      initialBudget.value = data.initialBudget ?? 400
      bidExpirationMinutes.value = data.bidExpirationMinutes ?? 1440
      counterbidExpirationMinutes.value = data.counterbidExpirationMinutes ?? 1440

      // Update original values
      originalValues.value = {
        maxTeamSize: data.maxTeamSize,
        initialBudget: data.initialBudget ?? 400,
        bidExpirationMinutes: data.bidExpirationMinutes ?? 1440,
        counterbidExpirationMinutes: data.counterbidExpirationMinutes ?? 1440,
      }
    } else {
      // Initialize settings if they don't exist
      const defaultSettings: Settings = {
        maxTeamSize: 25,
        initialBudget: 400,
        bidExpirationMinutes: 1440,
        counterbidExpirationMinutes: 1440,
      }
      await setDoc(doc(db, 'settings', 'general'), defaultSettings)
      originalValues.value = { ...defaultSettings }
    }
  } catch (err) {
    error.value = 'Error loading settings'
    console.error('Error loading settings:', err)
  }
}

const saveSettings = async () => {
  if (!isAdmin.value) return

  try {
    const settings: Settings = {
      maxTeamSize: maxTeamSize.value,
      initialBudget: initialBudget.value,
      bidExpirationMinutes: bidExpirationMinutes.value,
      counterbidExpirationMinutes: counterbidExpirationMinutes.value,
    }

    await setDoc(doc(db, 'settings', 'general'), settings)

    // Update original values
    originalValues.value = { ...settings }
    success.value = 'Settings saved successfully'

    // Clear success message after 3 seconds
    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err) {
    error.value = 'Error saving settings'
    console.error('Error saving settings:', err)
  }
}

// Fetch settings on component mount
fetchSettings()
</script>

<style scoped>
.settings {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.settings-content {
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  margin: 0 0 2rem;
  color: #333;
}

.settings-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.settings-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

h2 {
  color: #666;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.setting-item {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.setting-item:last-child {
  border-bottom: none;
}

label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #333;
}

.setting-control {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

input[type='number'] {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100px;
}

input[disabled] {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.save-button {
  padding: 0.5rem 1rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.save-button:hover:not(:disabled) {
  background-color: #45a049;
}

.setting-description {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
}

.error {
  color: #dc3545;
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f8d7da;
  border-radius: 4px;
}

.success {
  color: #28a745;
  margin: 1rem 0;
  padding: 1rem;
  background-color: #d4edda;
  border-radius: 4px;
}
</style>

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
              min="1"
              max="100"
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

defineOptions({
  name: 'SettingsView',
})

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const error = ref('')
const success = ref('')
const maxTeamSize = ref(25)
const originalMaxTeamSize = ref(25)

const hasChanges = computed(() => {
  return maxTeamSize.value !== originalMaxTeamSize.value
})

const fetchSettings = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'))
    if (settingsDoc.exists()) {
      const data = settingsDoc.data()
      maxTeamSize.value = data.maxTeamSize
      originalMaxTeamSize.value = data.maxTeamSize
    } else {
      // Initialize settings if they don't exist
      await setDoc(doc(db, 'settings', 'general'), {
        maxTeamSize: 25,
      })
    }
  } catch (err) {
    error.value = 'Error loading settings'
    console.error('Error loading settings:', err)
  }
}

const saveSettings = async () => {
  if (!isAdmin.value) return

  try {
    await setDoc(doc(db, 'settings', 'general'), {
      maxTeamSize: maxTeamSize.value,
    })

    originalMaxTeamSize.value = maxTeamSize.value
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

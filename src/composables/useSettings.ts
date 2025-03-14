import { ref, onMounted } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'

export function useSettings() {
  const maxTeamSize = ref(25)
  const isLoading = ref(true)
  const error = ref('')

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'))
      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        maxTeamSize.value = data.maxTeamSize
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      error.value = 'Error loading settings'
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    fetchSettings()
  })

  return {
    maxTeamSize,
    isLoading,
    error,
    fetchSettings,
  }
}

import { ref, onMounted } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'

export interface Settings {
  maxTeamSize: number
  initialBudget: number
  bidExpirationMinutes: number
  counterbidExpirationMinutes: number
  auctionConfirmationMinutes: number
}

export function useSettings() {
  const maxTeamSize = ref(25)
  const initialBudget = ref(400)
  const bidExpirationMinutes = ref(1440) // 24 hours in minutes
  const counterbidExpirationMinutes = ref(1440)
  const auctionConfirmationMinutes = ref(720) // 12 hours in minutes
  const isLoading = ref(true)
  const error = ref('')

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'))
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as Settings
        maxTeamSize.value = data.maxTeamSize
        initialBudget.value = data.initialBudget ?? 400
        bidExpirationMinutes.value = data.bidExpirationMinutes ?? 1440
        counterbidExpirationMinutes.value = data.counterbidExpirationMinutes ?? 1440
        auctionConfirmationMinutes.value = data.auctionConfirmationMinutes ?? 720
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
    initialBudget,
    bidExpirationMinutes,
    counterbidExpirationMinutes,
    auctionConfirmationMinutes,
    isLoading,
    error,
    fetchSettings,
  }
}

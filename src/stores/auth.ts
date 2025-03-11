import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from 'firebase/auth'
import { auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Participant } from '@/utils/addParticipants'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  const participantData = ref<Participant | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => participantData.value?.role === true)

  const fetchParticipantData = async (email: string) => {
    try {
      const q = query(collection(db, 'participants'), where('email', '==', email))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        participantData.value = {
          id: doc.id,
          ...(doc.data() as Omit<Participant, 'id'>),
        } as Participant & { id: string }
      }
    } catch (err) {
      console.error('Error fetching participant data:', err)
    }
  }

  // Initialize auth state listener
  onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser
    if (firebaseUser) {
      await fetchParticipantData(firebaseUser.email!)
    } else {
      participantData.value = null
    }
    loading.value = false
  })

  return {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    participantData,
  }
})

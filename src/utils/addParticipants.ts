import { db } from '@/firebase'
import { collection, addDoc } from 'firebase/firestore'

interface Participant {
  name: string
  email: string
  role: boolean
}

export const addParticipant = async (participant: Participant): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'participants'), participant)
    return docRef.id
  } catch (error) {
    console.error('Error adding participant: ', error)
    throw error
  }
}

// Export the interface so it can be reused
export type { Participant }

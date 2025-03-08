import { db } from '@/firebase'
import { collection, addDoc } from 'firebase/firestore'

export interface Participant {
  name: string
  email: string
  role: boolean
}

/**
 * Adds a new participant to the Firestore database and updates the local participants array.
 *
 * @param e - The event object, which is used to prevent the default form submission behavior.
 *
 * This function retrieves the name, email, and role values from the form, adds a new participant
 * document to the 'participants' collection in Firestore, and appends the participant to the local
 * `participants` array. It also clears the form fields upon successful addition. If an error occurs
 * during the process, it is logged to the console.
 */

export const addParticipant = async (participant: Participant): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'participants'), participant)

    return docRef.id
  } catch (error) {
    console.error('Error adding participant: ', error)

    throw error
  }
}

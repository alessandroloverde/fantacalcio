import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '@/firebase'

export interface AuthCredentials {
  email: string
  password: string
}

export const signUp = async ({ email, password }: AuthCredentials): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    return userCredential.user
  } catch (error) {
    console.error('Error signing up:', error)

    throw error
  }
}

export const login = async ({ email, password }: AuthCredentials): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    return userCredential.user
  } catch (error) {
    console.error('Error logging in:', error)

    throw error
  }
}

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Error logging out:', error)

    throw error
  }
}

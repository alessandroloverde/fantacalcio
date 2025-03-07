import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAfkHyClEZBvNPMW1M4wPzxwEPMCCFw9_c',
  authDomain: 'mercato-fantacalcio.firebaseapp.com',
  projectId: 'mercato-fantacalcio',
  storageBucket: 'mercato-fantacalcio.firebasestorage.app',
  messagingSenderId: '197131663438',
  appId: '1:197131663438:web:4e7b03046aa5a793a4eb1f',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

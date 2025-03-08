// firebase.d.ts
declare module '@/firebase' {
  import { Firestore } from 'firebase/firestore'
  import { Auth } from 'firebase/auth'

  const db: Firestore
  const auth: Auth
  export { db, auth }
}

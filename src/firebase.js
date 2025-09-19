import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

// Firebase config - you need to get this from Firebase Console
// Go to: Firebase Console > Project Settings > General > Your apps > Web app > Firebase SDK snippet
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'bottin2-3b41d.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'bottin2-3b41d',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'bottin2-3b41d.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
const db = getFirestore(app)

// Initialize Auth
const auth = getAuth(app)

// Connect to emulators in development
if (import.meta.env.DEV) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080)
  } catch (error) {
    // Emulator might already be connected or connection failed
    console.log('Firestore emulator connection:', error.message)
  }

  try {
    connectAuthEmulator(auth, 'http://localhost:9099')
  } catch (error) {
    // Emulator might already be connected or connection failed
    console.log('Auth emulator connection:', error.message)
  }
}

export { auth, db }

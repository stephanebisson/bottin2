import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

// Validate environment variables
const validateEnvironment = () => {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ]

  const missing = requiredVars.filter(varName => !import.meta.env[varName])

  if (missing.length > 0 && import.meta.env.PROD) {
    console.error('Missing required Firebase environment variables:', missing)
    console.error('Please check your .env file. See .env.example for reference.')
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`)
  } else if (missing.length > 0) {
    console.warn('⚠️  Using fallback Firebase configuration in development.')
    console.warn('   Missing environment variables:', missing)
    console.warn('   For production deployment, set these in your .env file.')
  }

  return missing.length === 0
}

// Validate environment
const hasValidEnv = validateEnvironment()

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

// Log configuration status
if (import.meta.env.DEV) {
  console.log('🔥 Firebase Config Status:', {
    environment: import.meta.env.MODE,
    hasValidEnvironment: hasValidEnv,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  })
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
const db = getFirestore(app)

// Initialize Auth
const auth = getAuth(app)

// Connect to emulators in development
if (import.meta.env.DEV) {
  // Enhanced emulator connection with better error handling
  const connectToEmulators = () => {
    const emulatorConfig = {
      firestore: { host: 'localhost', port: 8080 },
      auth: { url: 'http://localhost:9099' },
    }

    // Connect to Firestore emulator
    try {
      connectFirestoreEmulator(db, emulatorConfig.firestore.host, emulatorConfig.firestore.port)
      console.log('✅ Connected to Firestore emulator:', `${emulatorConfig.firestore.host}:${emulatorConfig.firestore.port}`)
    } catch (error) {
      if (error.message.includes('already connected')) {
        console.log('🔄 Firestore emulator already connected')
      } else {
        console.warn('⚠️  Failed to connect to Firestore emulator:', error.message)
        console.warn('   Make sure Firebase emulators are running: firebase emulators:start')
      }
    }

    // Connect to Auth emulator
    try {
      connectAuthEmulator(auth, emulatorConfig.auth.url)
      console.log('✅ Connected to Auth emulator:', emulatorConfig.auth.url)
    } catch (error) {
      if (error.message.includes('already connected')) {
        console.log('🔄 Auth emulator already connected')
      } else {
        console.warn('⚠️  Failed to connect to Auth emulator:', error.message)
        console.warn('   Make sure Firebase emulators are running: firebase emulators:start')
      }
    }
  }

  connectToEmulators()
}

export { auth, db }

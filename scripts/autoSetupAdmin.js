#!/usr/bin/env node

/**
 * Auto Admin Setup Script
 *
 * This script automatically sets up your admin account when the emulator starts.
 * It will create and grant admin privileges to your specified email.
 *
 * Configuration:
 * - Edit the ADMIN_EMAIL constant below with your email
 * - The script will automatically detect emulator mode
 * - Runs silently and only shows errors or success messages
 */

import admin from 'firebase-admin'

// 🔧 CONFIGURE YOUR ADMIN EMAIL HERE
const ADMIN_EMAIL = 'stephane.c.bisson@gmail.com' // Change this to your email
const ADMIN_PASSWORD = 'Password1' // Default password for development

// Add a delay to ensure emulator is ready
const STARTUP_DELAY = 5000 // 5 seconds

/**
 * Auto-setup admin account on emulator start
 */
async function autoSetupAdmin () {
  try {
    console.log('🔧 Auto-setting up admin account...')

    // Wait for emulator to be ready
    await new Promise(resolve => setTimeout(resolve, STARTUP_DELAY))

    // Set environment variables for emulator mode
    process.env.NODE_ENV = 'development'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

    // Initialize Firebase Admin for emulator
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: 'bottin2-3b41d',
      })
    }

    console.log('✅ Connected to Firebase emulators')

    // Check if user exists and has admin privileges
    let userExists = false
    let isAlreadyAdmin = false

    try {
      const user = await admin.auth().getUserByEmail(ADMIN_EMAIL)
      userExists = true
      isAlreadyAdmin = !!user.customClaims?.admin

      if (isAlreadyAdmin) {
        console.log(`✅ Admin account already exists and configured: ${ADMIN_EMAIL}`)
        return
      } else {
        console.log(`👤 User exists but needs admin privileges: ${ADMIN_EMAIL}`)
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`👤 User account doesn't exist, will create: ${ADMIN_EMAIL}`)
        userExists = false
      } else {
        throw error
      }
    }

    // Create user or grant admin privileges
    let user

    if (userExists) {
      user = await admin.auth().getUserByEmail(ADMIN_EMAIL)
    } else {
      console.log('👤 Creating user account with password...')

      try {
        user = await admin.auth().createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          displayName: 'Admin User',
          emailVerified: true,
        })

        console.log('✅ Created new user:', user.email)
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          // User was created between our check and now, get the existing user
          user = await admin.auth().getUserByEmail(ADMIN_EMAIL)
          console.log('✅ Found existing user:', user.email)
        } else {
          throw error
        }
      }
    }

    // Grant admin privileges
    console.log('🔐 Setting admin privileges...')

    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      adminSetAt: new Date().toISOString(),
      adminSetBy: 'AUTO_SETUP_SCRIPT',
      grantedBy: 'DEVELOPMENT_AUTO_SETUP',
    })

    console.log('🎯 Admin claims set successfully!')

    // Log the admin creation
    const db = admin.firestore()
    await db.collection('adminLogs').add({
      targetUid: user.uid,
      targetEmail: user.email,
      action: 'ADMIN_GRANTED',
      performedBy: 'AUTO_SETUP_SCRIPT',
      performedByEmail: 'auto-setup@development',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        scriptVersion: '1.0.0',
        method: 'auto-development-setup',
        userCreated: !userExists,
      },
    })

    console.log('📝 Admin grant logged to database')
    console.log(`✅ Admin account ready: ${ADMIN_EMAIL}`)
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`)
    console.log('🎉 You can now log in with these credentials')
  } catch (error) {
    console.error('❌ Failed to auto-setup admin:', error.message)

    // Don't exit with error - let emulator continue running
    console.log('⚠️  You can manually set up admin later with: npm run setup:admin')
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoSetupAdmin().then(() => {
    process.exit(0)
  }).catch(error => {
    console.error('❌ Auto-setup failed:', error)
    process.exit(0) // Don't fail the emulator startup
  })
}

export { ADMIN_EMAIL, autoSetupAdmin }

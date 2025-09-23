#!/usr/bin/env node

/**
 * Development Startup Script
 *
 * This script handles the complete development environment startup:
 * 1. Starts Firebase emulator with data import
 * 2. Waits for emulator to be ready
 * 3. Auto-creates admin account
 * 4. Starts Vite dev server
 */

import { spawn } from 'node:child_process'
import { autoSetupAdmin } from './autoSetupAdmin.js' // eslint-disable-line no-unused-vars

const EMULATOR_READY_DELAY = 8000 // Wait 8 seconds for emulator
const ADMIN_SETUP_DELAY = 3000 // Wait 3 seconds after admin setup

let emulatorProcess
let viteProcess

console.log('🚀 Starting complete development environment...')

// Cleanup function
function cleanup () {
  console.log('\n🛑 Shutting down development environment...')

  if (viteProcess) {
    viteProcess.kill()
    console.log('✅ Stopped Vite dev server')
  }

  if (emulatorProcess) {
    emulatorProcess.kill()
    console.log('✅ Stopped Firebase emulator')
  }

  process.exit(0)
}

// Handle Ctrl+C gracefully
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

async function startDevelopment () {
  try {
    // 1. Start Firebase emulator
    console.log('1️⃣  Starting Firebase emulator with data import...')
    emulatorProcess = spawn('firebase', [
      'emulators:start',
      '--import=./backups/2025-09-22-215703-emulator-backup',
    ], {
      stdio: 'inherit',
      shell: true,
    })

    emulatorProcess.on('error', error => {
      console.error('❌ Failed to start Firebase emulator:', error)
      process.exit(1)
    })

    // 2. Wait for emulator to be ready
    console.log('⏳ Waiting for emulator to initialize...')
    await new Promise(resolve => setTimeout(resolve, EMULATOR_READY_DELAY))

    // 3. Auto-setup admin
    console.log('2️⃣  Setting up admin account...')
    // await autoSetupAdmin()

    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, ADMIN_SETUP_DELAY))

    // 4. Start Vite dev server
    console.log('3️⃣  Starting Vite dev server...')
    viteProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
    })

    viteProcess.on('error', error => {
      console.error('❌ Failed to start Vite dev server:', error)
    })

    console.log('\n✅ Development environment is ready!')
    console.log('🔗 Admin account: stephane.c.bisson@gmail.com')
    console.log('🌐 App will be available at http://localhost:3000 (or next available port)')
    console.log('🔧 Firebase UI: http://localhost:4000')
    console.log('\n📝 Press Ctrl+C to stop all services')

    // Keep the script running
    process.stdin.resume()
  } catch (error) {
    console.error('❌ Failed to start development environment:', error)
    cleanup()
  }
}

startDevelopment()

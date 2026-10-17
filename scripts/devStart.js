#!/usr/bin/env node

/**
 * Development Startup Script
 *
 * This script handles the complete development environment startup:
 * 1. Starts Firebase emulator (fresh, no import)
 * 2. Waits for emulator to be ready
 * 3. Imports the most recent production backup (backups/*-production-backup.json, from npm run backup:prod)
 * 4. Auto-creates admin account
 * 5. Starts Vite dev server
 */

import { execSync, spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { autoSetupAdmin } from './autoSetupAdmin.js'

// Find a binary in PATH first, then fall back to searching all nvm node versions
function findBinary (name) {
  try {
    return execSync(`which ${name}`, { encoding: 'utf8' }).trim()
  } catch {
    const nvmDir = process.env.NVM_DIR || path.join(process.env.HOME, '.nvm')
    const versionsDir = path.join(nvmDir, 'versions', 'node')
    if (existsSync(versionsDir)) {
      for (const version of readdirSync(versionsDir).toSorted().toReversed()) {
        const candidate = path.join(versionsDir, version, 'bin', name)
        if (existsSync(candidate)) {
          return candidate
        }
      }
    }
    throw new Error(`"${name}" not found. Install it with: npm install -g firebase-tools`)
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const EMULATOR_READY_DELAY = 8000 // Wait 8 seconds for emulator
const RESTORE_DELAY = 5000 // Wait 5 seconds after restore
const ADMIN_SETUP_DELAY = 3000 // Wait 3 seconds after admin setup

// Use the most recent production backup; file names start with an ISO timestamp, so they sort by date
function findLatestProductionBackup () {
  const backupsDir = path.join(__dirname, '..', 'backups')
  const backups = existsSync(backupsDir)
    ? readdirSync(backupsDir).filter(name => name.endsWith('-production-backup.json')).toSorted()
    : []
  if (backups.length === 0) {
    console.error('❌ No production backup found in backups/. Create one with: npm run backup:prod')
    process.exit(1)
  }
  return backups.at(-1)
}

const BACKUP_FILE = findLatestProductionBackup()

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

/**
 * Run restore script to import backup data
 */
function runRestore (backupFile) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Importing backup: ${backupFile}...`)

    const projectRoot = path.join(__dirname, '..')
    const restoreScriptPath = path.join(projectRoot, 'scripts', 'restore-firestore.js')
    const backupPath = path.join(projectRoot, 'backups', backupFile)

    const restoreProcess = spawn('node', [
      restoreScriptPath,
      backupPath,
    ], {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: 'development' },
    })

    restoreProcess.on('error', error => {
      console.error('❌ Failed to run restore script:', error)
      reject(error)
    })

    restoreProcess.on('exit', code => {
      if (code === 0) {
        console.log('✅ Data imported successfully')
        resolve()
      } else {
        reject(new Error(`Restore script exited with code ${code}`))
      }
    })
  })
}

async function startDevelopment () {
  try {
    // 1. Start Firebase emulator (fresh, no import)
    console.log('1️⃣  Starting Firebase emulator...')
    const firebaseBin = findBinary('firebase')
    emulatorProcess = spawn(firebaseBin, ['emulators:start'], {
      stdio: 'inherit',
    })

    emulatorProcess.on('error', error => {
      console.error('❌ Failed to start Firebase emulator:', error)
      process.exit(1)
    })

    // 2. Wait for emulator to be ready
    console.log('⏳ Waiting for emulator to initialize...')
    await new Promise(resolve => setTimeout(resolve, EMULATOR_READY_DELAY))

    // 3. Import production backup
    console.log('2️⃣  Importing production backup...')
    await runRestore(BACKUP_FILE)

    // Wait a bit for data to settle
    await new Promise(resolve => setTimeout(resolve, RESTORE_DELAY))

    // 4. Auto-setup admin
    console.log('3️⃣  Setting up admin account...')
    await autoSetupAdmin()

    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, ADMIN_SETUP_DELAY))

    // 5. Start Vite dev server
    console.log('4️⃣  Starting Vite dev server...')
    viteProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
    })

    viteProcess.on('error', error => {
      console.error('❌ Failed to start Vite dev server:', error)
    })

    console.log('\n✅ Development environment is ready!')
    console.log(`📦 Using backup: ${BACKUP_FILE}`)
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

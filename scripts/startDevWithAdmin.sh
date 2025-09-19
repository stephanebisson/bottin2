#!/bin/bash

# Start Development Environment with Auto Admin Setup
# This script starts the Firebase emulator, sets up admin account, and starts Vite dev server

echo "🚀 Starting development environment..."

# Start Firebase emulator in background with data import
echo "📥 Starting Firebase emulator with data import..."
firebase emulators:start --import=./backups/2025-09-18-175305-emulator-backup &
FIREBASE_PID=$!

# Wait for emulator to start
echo "⏳ Waiting for emulator to initialize..."
sleep 10

# Auto-setup admin account
echo "👤 Setting up admin account..."
NODE_ENV=development node scripts/autoSetupAdmin.js

# Start Vite dev server
echo "🌐 Starting Vite dev server..."
npm run dev &
VITE_PID=$!

echo ""
echo "✅ Development environment ready!"
echo "🔗 Admin account: stephane.c.bisson@gmail.com"
echo "🌐 App: http://localhost:3000 (or next available port)"
echo "🔧 Firebase UI: http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $FIREBASE_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    echo "✅ Stopped all services"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for both processes
wait
#!/bin/bash

# Test the Vercel API functions locally
echo "🧪 Testing Vercel API functions locally..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Install vercel CLI for local testing if not installed
if ! command -v vercel &> /dev/null; then
    print_status "Installing Vercel CLI..."
    npm install -g vercel
fi

# Start local development server
print_status "Starting Vercel local development server..."
print_status "This will start both the frontend and API functions locally"

echo
echo "📋 Test checklist after server starts:"
echo "  1. Open http://localhost:3000 in browser"
echo "  2. Paste a YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
echo "  3. Select a target language"
echo "  4. Click 'Translate Video'"
echo "  5. Watch the progress and check for translations"
echo

echo "🚀 Starting Vercel dev server..."
echo "Press Ctrl+C to stop the server when done testing"
echo

cd /Users/joeyv/shpe/shpehackathon
vercel dev

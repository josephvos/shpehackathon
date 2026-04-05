#!/bin/bash

# YouTube Video Translator - Vercel Full-Stack Deployment Script
echo "🚀 Deploying YouTube Video Translator (Full-Stack) to Vercel..."

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Step 1: Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    print_error "vercel.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Step 2: Install API dependencies
print_status "Installing API dependencies..."
cd api
if ! npm install; then
    print_error "Failed to install API dependencies"
    exit 1
fi
cd ..

# Step 3: Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
if ! npm install; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Step 4: Test build
print_status "Testing frontend build process..."
if ! npm run build; then
    print_error "Frontend build failed"
    exit 1
fi
print_success "Frontend build successful!"
cd ..

# Step 5: Deploy to Vercel
print_status "Deploying full-stack application to Vercel..."
if ! vercel --prod; then
    print_error "Deployment failed"
    exit 1
fi

print_success "🎉 Full-stack deployment completed!"
echo
print_status "✨ Your app includes:"
echo "  📱 React frontend (Vite)"
echo "  🔧 Node.js serverless API functions"
echo "  🌍 YouTube transcript fetching"
echo "  🔄 Translation via LibreTranslate API"
echo
print_warning "⚠️  Important notes:"
echo "  • Translation jobs use in-memory storage (may not persist across serverless instances)"
echo "  • For production, consider using Redis or a database for job state"
echo "  • LibreTranslate.de has rate limits - consider upgrading for heavy usage"
echo
print_success "🌐 Your app should now be live on Vercel!"

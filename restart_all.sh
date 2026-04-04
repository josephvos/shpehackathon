#!/bin/bash

# YouTube Video Translator - Complete Restart Script
# This script kills all running processes and restarts the entire stack

echo "🔄 Starting complete restart of YouTube Video Translator..."

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Kill all existing processes
print_status "Step 1: Killing all existing processes..."

# Kill LibreTranslate processes
print_status "Killing LibreTranslate processes..."
pkill -f "libretranslate" && print_success "LibreTranslate processes killed" || print_warning "No LibreTranslate processes found"

# Kill Spring Boot processes (Java processes on port 8080)
print_status "Killing Spring Boot processes..."
SPRING_PIDS=$(lsof -ti :8080 2>/dev/null)
if [ ! -z "$SPRING_PIDS" ]; then
    echo $SPRING_PIDS | xargs kill -9
    print_success "Spring Boot processes killed"
else
    print_warning "No Spring Boot processes found on port 8080"
fi

# Kill Vite/npm processes
print_status "Killing Vite/npm processes..."
pkill -f "vite" && print_success "Vite processes killed" || print_warning "No Vite processes found"
pkill -f "npm.*dev" && print_success "npm dev processes killed" || print_warning "No npm dev processes found"

# Kill any remaining processes on our ports
print_status "Cleaning up remaining processes on ports 5000, 5173, 8080..."
for port in 5000 5173 8080; do
    PIDS=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$PIDS" ]; then
        echo $PIDS | xargs kill -9
        print_success "Processes on port $port killed"
    fi
done

print_success "All processes cleaned up successfully"

# Step 2: Wait for ports to be free
print_status "Step 2: Waiting for ports to be released..."
sleep 3

# Step 3: Start LibreTranslate
print_status "Step 3: Starting LibreTranslate server..."
print_status "This will take a moment to load all language models..."

# Start LibreTranslate in background
nohup libretranslate --host 127.0.0.1 --port 5000 > /tmp/libretranslate.log 2>&1 &
LIBRETRANSLATE_PID=$!

# Wait for LibreTranslate to be ready
print_status "Waiting for LibreTranslate to start..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:5000/languages > /dev/null 2>&1; then
        print_success "LibreTranslate is ready on http://127.0.0.1:5000"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "LibreTranslate failed to start within 30 seconds"
        print_error "Check logs: tail -f /tmp/libretranslate.log"
        exit 1
    fi
    sleep 1
    echo -n "."
done
echo

# Step 4: Start Spring Boot backend
print_status "Step 4: Starting Spring Boot backend..."
cd /Users/joeyv/Documents/shpehackathon/shpehackathon/backend

# Start Spring Boot in background
nohup mvn spring-boot:run > /tmp/spring-boot.log 2>&1 &
SPRING_PID=$!

# Wait for Spring Boot to be ready
print_status "Waiting for Spring Boot to start..."
for i in {1..60}; do
    if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1 || curl -s http://localhost:8080 > /dev/null 2>&1; then
        print_success "Spring Boot backend is ready on http://localhost:8080"
        break
    fi
    if [ $i -eq 60 ]; then
        print_error "Spring Boot failed to start within 60 seconds"
        print_error "Check logs: tail -f /tmp/spring-boot.log"
        exit 1
    fi
    sleep 1
    echo -n "."
done
echo

# Step 5: Start Frontend
print_status "Step 5: Starting Vite frontend..."
cd /Users/joeyv/Documents/shpehackathon/shpehackathon/frontend

# Start Vite in background
nohup npm run dev > /tmp/vite.log 2>&1 &
VITE_PID=$!

# Wait for Vite to be ready
print_status "Waiting for Vite frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_success "Vite frontend is ready on http://localhost:5173"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Vite failed to start within 30 seconds"
        print_error "Check logs: tail -f /tmp/vite.log"
        exit 1
    fi
    sleep 1
    echo -n "."
done
echo

# Step 6: Verify all services
print_status "Step 6: Verifying all services are running..."

# Check LibreTranslate
if curl -s http://127.0.0.1:5000/languages > /dev/null 2>&1; then
    print_success "✅ LibreTranslate: http://127.0.0.1:5000"
else
    print_error "❌ LibreTranslate not responding"
fi

# Check Spring Boot
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    print_success "✅ Spring Boot Backend: http://localhost:8080"
else
    print_error "❌ Spring Boot not responding"
fi

# Check Vite
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    print_success "✅ Vite Frontend: http://localhost:5173"
else
    print_error "❌ Vite not responding"
fi

echo
print_success "🚀 All services started successfully!"
echo
print_status "📊 Service URLs:"
echo "   Frontend:     http://localhost:5173"
echo "   Backend API:  http://localhost:8080"
echo "   LibreTranslate: http://127.0.0.1:5000"
echo
print_status "📝 Log files:"
echo "   LibreTranslate: tail -f /tmp/libretranslate.log"
echo "   Spring Boot:    tail -f /tmp/spring-boot.log"
echo "   Vite Frontend:  tail -f /tmp/vite.log"
echo
print_status "🛑 To stop all services, run:"
echo "   ./stop_all.sh"
echo

# Test LibreTranslate with a quick translation
print_status "🧪 Testing LibreTranslate with German translation..."
TEST_RESULT=$(curl -s -X POST http://127.0.0.1:5000/translate \
    -H "Content-Type: application/json" \
    -d '{"q":"Hello world","source":"en","target":"de"}' | grep -o '"translatedText":"[^"]*"' | sed 's/"translatedText":"\([^"]*\)"/\1/')

if [ ! -z "$TEST_RESULT" ]; then
    print_success "🌍 Translation test passed: 'Hello world' → '$TEST_RESULT'"
else
    print_warning "⚠️  Translation test failed - LibreTranslate may still be loading models"
fi

echo
print_success "🎉 YouTube Video Translator is ready to use!"

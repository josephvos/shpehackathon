#!/bin/bash

# YouTube Video Translator - Stop All Services Script
# This script stops all running services

echo "🛑 Stopping all YouTube Video Translator services..."

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

# Kill LibreTranslate processes
print_status "Stopping LibreTranslate processes..."
pkill -f "libretranslate" && print_success "LibreTranslate processes stopped" || print_warning "No LibreTranslate processes found"

# Kill Spring Boot processes (Java processes on port 8080)
print_status "Stopping Spring Boot processes..."
SPRING_PIDS=$(lsof -ti :8080 2>/dev/null)
if [ ! -z "$SPRING_PIDS" ]; then
    echo $SPRING_PIDS | xargs kill -9
    print_success "Spring Boot processes stopped"
else
    print_warning "No Spring Boot processes found on port 8080"
fi

# Kill Vite/npm processes
print_status "Stopping Vite/npm processes..."
pkill -f "vite" && print_success "Vite processes stopped" || print_warning "No Vite processes found"
pkill -f "npm.*dev" && print_success "npm dev processes stopped" || print_warning "No npm dev processes found"

# Kill any remaining processes on our ports
print_status "Cleaning up remaining processes on ports 5000, 5173, 8080..."
for port in 5000 5173 8080; do
    PIDS=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$PIDS" ]; then
        echo $PIDS | xargs kill -9
        print_success "Processes on port $port stopped"
    fi
done

# Clean up log files
print_status "Cleaning up log files..."
rm -f /tmp/libretranslate.log /tmp/spring-boot.log /tmp/vite.log
print_success "Log files cleaned up"

print_success "🛑 All services have been stopped successfully!"

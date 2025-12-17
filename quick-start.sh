#!/bin/bash

# Lookbook Quick Start Script
# This script helps you get the Lookbook app running quickly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "================================================================"
    echo -e "${BOLD}$1${NC}"
    echo "================================================================"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the Lookbook root directory"
    exit 1
fi

print_header "🚀 Lookbook Quick Start"

# Parse arguments
DB_PROFILE="${1:-segundo}"

if [ "$DB_PROFILE" != "segundo" ] && [ "$DB_PROFILE" != "local" ]; then
    print_error "Invalid database profile: $DB_PROFILE"
    echo ""
    echo "Usage: ./quick-start.sh [segundo|local]"
    echo ""
    echo "  segundo  - Use segundo production database (default)"
    echo "  local    - Use local PostgreSQL database"
    exit 1
fi

print_info "Database profile: $DB_PROFILE"

# Step 1: Check dependencies
print_header "📦 Checking Dependencies"

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi
print_success "Node.js $(node --version) is installed"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi
print_success "npm $(npm --version) is installed"

# Step 2: Install backend dependencies if needed
print_header "📦 Backend Dependencies"

cd backend

if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    npm install
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

# Step 3: Set up database connection
print_header "🗄️  Database Configuration"

print_info "Setting up $DB_PROFILE database connection..."
node setup-db-connection.js "$DB_PROFILE"

if [ $? -ne 0 ]; then
    print_error "Database setup failed. Please check the error messages above."
    exit 1
fi

cd ..

# Step 4: Install frontend dependencies if needed
print_header "📦 Frontend Dependencies"

cd frontend

if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

cd ..

# Step 5: Success message
print_header "✅ Setup Complete!"

echo -e "${GREEN}Your Lookbook environment is ready!${NC}"
echo ""
echo -e "${CYAN}To start the application:${NC}"
echo ""
echo -e "${BOLD}Option 1: Use two terminal windows${NC}"
echo -e "  Terminal 1: ${BLUE}cd backend && npm run dev${NC}"
echo -e "  Terminal 2: ${BLUE}cd frontend && npm run dev${NC}"
echo ""
echo -e "${BOLD}Option 2: Use the start script${NC}"
echo -e "  ${BLUE}./start.sh${NC}"
echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo -e "  ${BLUE}npm run db:check${NC}     (in backend/) - Test database connection"
echo -e "  ${BLUE}npm run db:segundo${NC}   (in backend/) - Switch to segundo database"
echo -e "  ${BLUE}npm run db:local${NC}     (in backend/) - Switch to local database"
echo ""


#!/bin/bash

# Quick SQLite Initialization Script
# Schema only - no data migration

set -e

echo "================================================"
echo "  SQLite Database - Quick Setup (Schema Only)"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm install better-sqlite3 bcrypt
npm install --save-dev @types/better-sqlite3 @types/bcrypt

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Initialize database
echo -e "${BLUE}Step 2: Creating database with schema...${NC}"

DB_PATH="${SQLITE_DB_PATH:-./audit_assistant.db}"
echo "Database path: $DB_PATH"

npx ts-node sqlite/init-database.ts "$DB_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Success! Database ready to use.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Import DatabaseManager in your code"
    echo "  2. Create your first user with signup()"
    echo "  3. Start building!"
    echo ""
    echo "Quick test:"
    echo "  const db = getDatabase('$DB_PATH');"
    echo "  const { data } = await db.signup('admin@firm.com', 'password', 'Admin');"
    echo ""
else
    echo -e "${RED}❌ Initialization failed${NC}"
    exit 1
fi

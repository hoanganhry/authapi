#!/bin/bash

echo "╔══════════════════════════════════════════════════╗"
echo "║   AuthAPI Deploy Script - Tự động push & setup  ║"
echo "╚══════════════════════════════════════════════════╝"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if in correct directory
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Error: server.js not found!${NC}"
    echo "Please run this script from the my-ap directory"
    exit 1
fi

# Step 1: GitHub Credentials
echo -e "\n${BLUE}═══ GITHUB SETUP ═══${NC}"
read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter your repository name (e.g., authapi-v3): " REPO_NAME
read -p "Enter your GitHub Personal Token: " GITHUB_TOKEN

# Construct remote URL
REMOTE_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

# Step 2: Initialize Git
echo -e "\n${BLUE}═══ GIT INITIALIZATION ═══${NC}"

if [ -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git already initialized${NC}"
else
    echo "🔄 Initializing git repository..."
    git init
fi

# Step 3: Configure Git
echo "🔄 Configuring git..."
git config user.email "deploy@authapi.local"
git config user.name "AuthAPI Deploy"

# Step 4: Add remote
echo "🔄 Adding remote origin..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

# Step 5: Add files
echo -e "\n${BLUE}═══ ADDING FILES ═══${NC}"
git add .
echo -e "${GREEN}✅ Files staged${NC}"

# Step 6: Commit
echo -e "\n${BLUE}═══ COMMITTING ═══${NC}"
COMMIT_MSG="AuthAPI v3.3 deployment - $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✅ Committed${NC}"

# Step 7: Push
echo -e "\n${BLUE}═══ PUSHING TO GITHUB ═══${NC}"
echo "🔄 Pushing to github.com/${GITHUB_USER}/${REPO_NAME}..."

if git push -u origin main; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
else
    # Try master branch if main doesn't work
    echo -e "${YELLOW}⚠️  Main branch failed, trying master...${NC}"
    git branch -M master
    git push -u origin master
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
fi

# Step 8: Render Instructions
echo -e "\n${BLUE}═══ NEXT STEPS: RENDER DEPLOYMENT ═══${NC}"
echo -e "${YELLOW}Follow these steps:${NC}\n"

echo "1️⃣  Go to https://render.com"
echo "2️⃣  Click 'New +' → 'Web Service'"
echo "3️⃣  Connect GitHub and select: ${REPO_NAME}"
echo ""
echo "4️⃣  Fill in these settings:"
echo "    • Name: authapi"
echo "    • Environment: Node"
echo "    • Region: Singapore (or nearest)"
echo "    • Branch: main (or master)"
echo "    • Build Command: npm install"
echo "    • Start Command: npm start"
echo "    • Plan: Free"
echo ""
echo "5️⃣  Add Environment Variables:"
cat << 'EOF'
    JWT_SECRET=please-change-jwt-secret-2025
    HMAC_SECRET=please-change-hmac-secret-2025
    ADMIN_PASSWORD=1
    PORT=10000
EOF

echo ""
echo "6️⃣  Click 'Create Web Service'"
echo "7️⃣  Wait 3-5 minutes for deployment"
echo ""

echo -e "${GREEN}✅ GitHub part DONE!${NC}"
echo -e "${YELLOW}📝 Your repository:${NC} https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo ""
echo -e "${BLUE}Once deployed, update your config with the Render URL!${NC}"
echo ""

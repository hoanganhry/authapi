@echo off
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║   AuthAPI Deploy Script - Tự động push ^& setup  ║
echo ╚══════════════════════════════════════════════════╝
echo.

REM Check if server.js exists
if not exist "server.js" (
    echo ❌ Error: server.js not found!
    echo Please run this script from the my-ap directory
    exit /b 1
)

REM Step 1: GitHub Credentials
echo ═══ GITHUB SETUP ═══
set /p GITHUB_USER="Enter your GitHub username: "
set /p REPO_NAME="Enter your repository name (e.g., authapi-v3): "
set /p GITHUB_TOKEN="Enter your GitHub Personal Token: "

REM Construct remote URL
set "REMOTE_URL=https://%GITHUB_USER%:%GITHUB_TOKEN%@github.com/%GITHUB_USER%/%REPO_NAME%.git"

REM Step 2: Initialize Git
echo.
echo ═══ GIT INITIALIZATION ═══
if exist ".git" (
    echo ⚠️  Git already initialized
) else (
    echo 🔄 Initializing git repository...
    git init
)

REM Step 3: Configure Git
echo 🔄 Configuring git...
git config user.email "deploy@authapi.local"
git config user.name "AuthAPI Deploy"

REM Step 4: Add remote
echo 🔄 Adding remote origin...
git remote remove origin 2>nul
git remote add origin "%REMOTE_URL%"

REM Step 5: Add files
echo.
echo ═══ ADDING FILES ═══
git add .
echo ✅ Files staged

REM Step 6: Commit
echo.
echo ═══ COMMITTING ═══
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
set "COMMIT_MSG=AuthAPI v3.3 deployment - %mydate% %mytime%"
git commit -m "%COMMIT_MSG%"
echo ✅ Committed

REM Step 7: Push
echo.
echo ═══ PUSHING TO GITHUB ═══
echo 🔄 Pushing to github.com/%GITHUB_USER%/%REPO_NAME%...

git push -u origin main
if not errorlevel 0 (
    echo ⚠️  Main branch failed, trying master...
    git branch -M master
    git push -u origin master
)

echo ✅ Successfully pushed to GitHub!

REM Step 8: Render Instructions
echo.
echo ═══ NEXT STEPS: RENDER DEPLOYMENT ═══
echo.
echo 1️⃣  Go to https://render.com
echo 2️⃣  Click 'New +' ^> 'Web Service'
echo 3️⃣  Connect GitHub and select: %REPO_NAME%
echo.
echo 4️⃣  Fill in these settings:
echo    - Name: authapi
echo    - Environment: Node
echo    - Region: Singapore ^(or nearest^)
echo    - Branch: main ^(or master^)
echo    - Build Command: npm install
echo    - Start Command: npm start
echo    - Plan: Free
echo.
echo 5️⃣  Add Environment Variables:
echo    JWT_SECRET=please-change-jwt-secret-2025
echo    HMAC_SECRET=please-change-hmac-secret-2025
echo    ADMIN_PASSWORD=1
echo    PORT=10000
echo.
echo 6️⃣  Click 'Create Web Service'
echo 7️⃣  Wait 3-5 minutes for deployment
echo.
echo ✅ GitHub part DONE!
echo 📝 Your repository: https://github.com/%GITHUB_USER%/%REPO_NAME%
echo.
echo 📝 Once deployed, update your config with the Render URL!
echo.
pause

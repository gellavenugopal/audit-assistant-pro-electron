@echo off
REM Build Audit Assistant Pro Windows Installer
REM This script automates the complete build process

echo ==========================================
echo  Audit Assistant Pro - Installer Builder
echo ==========================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js found
echo.

echo [2/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

echo [3/5] Rebuilding native modules for Electron...
call npm run postinstall
if %errorlevel% neq 0 (
    echo ERROR: Failed to rebuild native modules
    pause
    exit /b 1
)
echo ✓ Native modules rebuilt
echo.

echo [4/5] Building React frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)
echo ✓ Frontend built
echo.

echo [5/5] Building Windows installer...
call npm run electron:build:win
if %errorlevel% neq 0 (
    echo ERROR: Failed to build installer
    pause
    exit /b 1
)
echo ✓ Installer built successfully!
echo.

echo ==========================================
echo          BUILD COMPLETE!
echo ==========================================
echo.
echo Your installer is ready at:
echo electron-dist\Audit Assistant Pro Setup 1.0.0.exe
echo.
echo You can now:
echo 1. Test the installer locally
echo 2. Distribute the .exe file to users
echo.
echo Database will auto-initialize on first run!
echo.

pause

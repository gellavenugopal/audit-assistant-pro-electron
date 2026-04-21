@echo off
REM Quick SQLite Initialization Script (Windows)
REM Schema only - no data migration

echo ================================================
echo   SQLite Database - Quick Setup (Schema Only)
echo ================================================
echo.

REM Step 1: Install dependencies
echo Step 1: Installing dependencies...
call npm install better-sqlite3 bcrypt
call npm install --save-dev @types/better-sqlite3 @types/bcrypt

if %ERRORLEVEL% EQU 0 (
    echo [OK] Dependencies installed
) else (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
echo.

REM Step 2: Initialize database
echo Step 2: Creating database with schema...

if "%SQLITE_DB_PATH%"=="" (
    set DB_PATH=audit_assistant.db
) else (
    set DB_PATH=%SQLITE_DB_PATH%
)

echo Database path: %DB_PATH%

call npx ts-node sqlite/init-database.ts %DB_PATH%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Success! Database ready to use.
    echo.
    echo Next steps:
    echo   1. Import DatabaseManager in your code
    echo   2. Create your first user with signup()
    echo   3. Start building!
    echo.
    echo Quick test:
    echo   const db = getDatabase('%DB_PATH%');
    echo   const { data } = await db.signup('admin@firm.com', 'password', 'Admin');
    echo.
) else (
    echo [ERROR] Initialization failed
    exit /b 1
)

pause

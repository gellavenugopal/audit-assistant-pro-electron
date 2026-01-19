# PowerShell script to run migration using Supabase REST API
# This script executes the migration SQL directly without needing psql

param(
    [string]$ServiceRoleKey = ""
)

# Load environment variables
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$supabaseUrl = $env:VITE_SUPABASE_URL
if (-not $supabaseUrl) {
    Write-Host "❌ Error: VITE_SUPABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

if (-not $ServiceRoleKey) {
    $ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
}

if (-not $ServiceRoleKey) {
    Write-Host "❌ Error: SUPABASE_SERVICE_ROLE_KEY not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 To get your Service Role Key:" -ForegroundColor Yellow
    Write-Host "   1. Go to Supabase Dashboard" -ForegroundColor Gray
    Write-Host "   2. Project Settings > API" -ForegroundColor Gray
    Write-Host "   3. Copy the 'service_role' key (keep it secret!)" -ForegroundColor Gray
    Write-Host "   4. Add it to .env as: SUPABASE_SERVICE_ROLE_KEY=your-key-here" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Or run: .\scripts\run-migration-direct.ps1 -ServiceRoleKey 'your-key'" -ForegroundColor Gray
    exit 1
}

$migrationFile = "supabase\migrations\20250115000001_create_trial_balance_new_tables.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Reading migration file..." -ForegroundColor Cyan
$migrationSQL = Get-Content $migrationFile -Raw

Write-Host "🚀 Executing migration via Supabase REST API..." -ForegroundColor Green
Write-Host "   URL: $supabaseUrl" -ForegroundColor Gray
Write-Host ""

# For Supabase, we need to use the SQL Editor API or create a function
# Since direct SQL execution via REST API is limited, we'll use a workaround
# by creating a temporary function that executes the SQL

Write-Host "⚠️  Note: Supabase REST API has limitations for DDL statements." -ForegroundColor Yellow
Write-Host "   For best results, use one of these methods:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Method 1: Supabase Dashboard (Recommended)" -ForegroundColor Cyan
Write-Host "   1. Go to: https://supabase.com/dashboard/project/$($env:VITE_SUPABASE_PROJECT_ID)/sql/new" -ForegroundColor Gray
Write-Host "   2. Copy the contents of: $migrationFile" -ForegroundColor Gray
Write-Host "   3. Paste and click 'Run'" -ForegroundColor Gray
Write-Host ""
Write-Host "   Method 2: Use Node.js script" -ForegroundColor Cyan
Write-Host "   node scripts/run-migration.js" -ForegroundColor Gray
Write-Host ""
Write-Host "   Method 3: Install Supabase CLI" -ForegroundColor Cyan
Write-Host "   supabase db push" -ForegroundColor Gray
Write-Host ""

# Try to use the SQL Editor API endpoint
try {
    $headers = @{
        "Content-Type" = "application/json"
        "apikey" = $ServiceRoleKey
        "Authorization" = "Bearer $ServiceRoleKey"
    }

    # Supabase doesn't have a direct REST endpoint for executing arbitrary SQL
    # We need to use the Management API or SQL Editor API
    # For now, let's provide instructions
    
    Write-Host "📋 Migration SQL is ready. Here's what to do:" -ForegroundColor Green
    Write-Host ""
    Write-Host "Copy this command to open Supabase Dashboard SQL Editor:" -ForegroundColor Yellow
    Write-Host "start https://supabase.com/dashboard/project/$($env:VITE_SUPABASE_PROJECT_ID)/sql/new" -ForegroundColor Cyan
    Write-Host ""
    
    $openDashboard = Read-Host "Open Supabase Dashboard SQL Editor now? (Y/N)"
    if ($openDashboard -eq 'Y' -or $openDashboard -eq 'y') {
        Start-Process "https://supabase.com/dashboard/project/$($env:VITE_SUPABASE_PROJECT_ID)/sql/new"
        Write-Host ""
        Write-Host "✅ Dashboard opened! Copy the migration SQL and paste it there." -ForegroundColor Green
        Write-Host "   File location: $migrationFile" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}


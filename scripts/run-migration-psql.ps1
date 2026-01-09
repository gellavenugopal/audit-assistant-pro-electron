# PowerShell script to run Trial Balance New migration using psql
# Requires: PostgreSQL client (psql) and database password

param(
    [string]$DbPassword = ""
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

$projectId = $env:VITE_SUPABASE_PROJECT_ID
$supabaseUrl = $env:VITE_SUPABASE_URL

if (-not $projectId) {
    Write-Host "❌ Error: VITE_SUPABASE_PROJECT_ID not found in .env" -ForegroundColor Red
    exit 1
}

if (-not $supabaseUrl) {
    Write-Host "❌ Error: VITE_SUPABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

# Extract project reference from URL
$projectRef = $projectId

# Database connection details
$dbHost = "$projectRef.supabase.co"
$dbPort = "5432"
$dbName = "postgres"
$dbUser = "postgres"

# Get password if not provided
if (-not $DbPassword) {
    Write-Host "`n📝 Database Password Required" -ForegroundColor Yellow
    Write-Host "   You can find it in: Supabase Dashboard > Project Settings > Database > Connection string" -ForegroundColor Gray
    $securePassword = Read-Host "Enter database password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ Error: psql (PostgreSQL client) not found in PATH" -ForegroundColor Red
    Write-Host "   Please install PostgreSQL client or use Supabase Dashboard SQL Editor" -ForegroundColor Yellow
    exit 1
}

# Migration file path
$migrationFile = "supabase\migrations\20250115000001_create_trial_balance_new_tables.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 Running Trial Balance New Migration..." -ForegroundColor Green
Write-Host "   Project: $projectRef" -ForegroundColor Gray
Write-Host "   Host: $dbHost" -ForegroundColor Gray
Write-Host "   Database: $dbName" -ForegroundColor Gray
Write-Host ""

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DbPassword

# Run migration
try {
    $result = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migrationFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Migration failed!" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error running migration: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "`n✨ All Trial Balance New tables have been created!" -ForegroundColor Green


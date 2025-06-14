# Test File Organization Script
$basePath = "c:\Users\ronni\Tools\un-dashboard\un-dashboard"
$organizedPath = "$basePath\tests\organized"

# Define file patterns and their target directories
$filePatterns = @{
    # Collaboration tests
    "collaboration" = @(
        "test-collaboration-*",
        "collaboration-*",
        "test-websocket-collaboration*",
        "test-collaborative-*",
        "test-symmetric-collaboration*",
        "final-collaboration-*",
        "debug-collaboration-*"
    )
    
    # Topology tests
    "topology" = @(
        "test-topology-*",
        "topology-*",
        "debug-topology-*",
        "quick-topology-*",
        "manual-topology-*",
        "critical-topology-*",
        "comprehensive-topology-*",
        "final-topology-*",
        "simple-topology-*",
        "create-topology-*",
        "investigate-topology-*"
    )
    
    # Authentication tests
    "auth" = @(
        "test-auth-*",
        "debug-auth-*",
        "authenticated-*",
        "browser-auth-*",
        "test-login-*",
        "debug-admin-login*",
        "test-correct-admin-*",
        "test-cross-port-auth*",
        "refresh-auth-*"
    )
    
    # Admin tests
    "admin" = @(
        "test-admin-*",
        "create-admin-*",
        "reset-admin-*",
        "check-admin-*",
        "activate-admin*",
        "unlock-admin-*",
        "fix-admin*",
        "simple-admin-*"
    )
    
    # Database tests
    "database" = @(
        "test-database-*",
        "test-db*",
        "debug-database-*",
        "investigate-mongodb-*",
        "test-mongodb-*",
        "test-duplicate-*",
        "comprehensive-mongodb-*",
        "test-remote-mongodb-*",
        "diagnose-database-*",
        "quick-db-*"
    )
    
    # Device tests
    "device" = @(
        "test-device-*",
        "debug-device-*",
        "browser-device-*",
        "test-unified-device-*",
        "end-to-end-device-*",
        "final-device-*",
        "comprehensive-device-*",
        "detailed-device-*",
        "simple-device-*",
        "check-device-*"
    )
    
    # Scan history tests
    "scan-history" = @(
        "test-scan-*",
        "test-user-specific-scan-*",
        "investigate-scan-*",
        "check-scan-*",
        "verify-scan-*"
    )
    
    # Shared scans tests
    "shared-scans" = @(
        "test-shared-scans-*",
        "verify-shared-scans-*"
    )
    
    # WebSocket tests
    "websocket" = @(
        "test-websocket-*",
        "test-simple-websocket*",
        "test-raw-ws*",
        "simple-ws-*"
    )
    
    # Integration tests
    "integration" = @(
        "final-integration-*",
        "integration-*",
        "end-to-end-*",
        "complete-*",
        "final-*",
        "test-fixes-*",
        "validate-*"
    )
    
    # Verification tests
    "verification" = @(
        "verify-*",
        "test-*-verification*",
        "final-verification-*",
        "quick-*-verify*"
    )
    
    # Debug tests
    "debug" = @(
        "debug-*",
        "investigate-*",
        "diagnose-*",
        "examine-*",
        "check-*"
    )
    
    # Manual tests
    "manual" = @(
        "manual-*",
        "step-by-step-*"
    )
    
    # Scripts and utilities
    "scripts" = @(
        "create-*",
        "insert-*",
        "simple-*",
        "quick-*",
        "immediate-*",
        "api-*"
    )
}

# HTML test files
$htmlPatterns = @(
    "*.html"
)

Write-Host "Starting test file organization..." -ForegroundColor Green

# Move files based on patterns
foreach ($category in $filePatterns.Keys) {
    $targetDir = "$organizedPath\$category"
    Write-Host "Processing $category tests..." -ForegroundColor Yellow
    
    foreach ($pattern in $filePatterns[$category]) {
        $files = Get-ChildItem -Path $basePath -Name $pattern -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            $sourcePath = "$basePath\$file"
            $destPath = "$targetDir\$file"
            
            if (Test-Path $sourcePath) {
                try {
                    Move-Item -Path $sourcePath -Destination $destPath -Force
                    Write-Host "  Moved: $file" -ForegroundColor Cyan
                } catch {
                    Write-Host "  Error moving $file : $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    }
}

# Move HTML files
Write-Host "Processing HTML test files..." -ForegroundColor Yellow
$htmlFiles = Get-ChildItem -Path $basePath -Name "*.html" -ErrorAction SilentlyContinue
foreach ($file in $htmlFiles) {
    if ($file -like "*test*" -or $file -like "*topology*" -or $file -like "*collaboration*") {
        $sourcePath = "$basePath\$file"
        $destPath = "$organizedPath\html-tests\$file"
        
        if (Test-Path $sourcePath) {
            try {
                Move-Item -Path $sourcePath -Destination $destPath -Force
                Write-Host "  Moved HTML: $file" -ForegroundColor Cyan
            } catch {
                Write-Host "  Error moving HTML $file : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

# Move PowerShell and other script files
Write-Host "Processing script files..." -ForegroundColor Yellow
$scriptFiles = Get-ChildItem -Path $basePath -Name "*.ps1", "*.mjs" -ErrorAction SilentlyContinue
foreach ($file in $scriptFiles) {
    if ($file -like "*test*" -or $file -like "*topology*" -or $file -like "*auth*") {
        $sourcePath = "$basePath\$file"
        $destPath = "$organizedPath\scripts\$file"
        
        if (Test-Path $sourcePath) {
            try {
                Move-Item -Path $sourcePath -Destination $destPath -Force
                Write-Host "  Moved Script: $file" -ForegroundColor Cyan
            } catch {
                Write-Host "  Error moving script $file : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

Write-Host "Test file organization complete!" -ForegroundColor Green
Write-Host "Files have been organized into: $organizedPath" -ForegroundColor Green

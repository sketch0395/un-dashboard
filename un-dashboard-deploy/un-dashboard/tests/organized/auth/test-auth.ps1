# PowerShell script to test admin authentication
Write-Host "Testing admin authentication..." -ForegroundColor Yellow

# Test 1: Create/update admin user
Write-Host "`n1. Creating/updating admin user..." -ForegroundColor Cyan
try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/create-admin" -Method POST -ContentType "application/json"
    Write-Host "Create admin response: $($createResponse | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Failed to create admin: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Try different login combinations
$loginAttempts = @(
    @{username="admin"; password="admin123!"},
    @{username="admin@undashboard.local"; password="admin123!"},
    @{username="admin@undashboard.com"; password="admin123!"},
    @{username="admin"; password="admin"},
    @{username="admin"; password="password"}
)

Write-Host "`n2. Testing login attempts..." -ForegroundColor Cyan
foreach ($attempt in $loginAttempts) {
    Write-Host "Trying: $($attempt.username) / $($attempt.password)" -ForegroundColor Gray
    
    try {
        $body = $attempt | ConvertTo-Json
        $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json" -SessionVariable session
        Write-Host "✅ SUCCESS! Login worked with $($attempt.username)" -ForegroundColor Green
        Write-Host "Response: $($loginResponse | ConvertTo-Json)" -ForegroundColor Green
        
        # Test profile endpoint
        Write-Host "`n3. Testing profile endpoint..." -ForegroundColor Cyan
        try {
            $profileResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/user/profile" -WebSession $session
            Write-Host "Profile status: $($profileResponse.StatusCode)" -ForegroundColor Green
            Write-Host "Profile response: $($profileResponse.Content)" -ForegroundColor Green
        } catch {
            Write-Host "Profile test failed: $_" -ForegroundColor Red
        }
        
        break
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nAuthentication test complete." -ForegroundColor Yellow

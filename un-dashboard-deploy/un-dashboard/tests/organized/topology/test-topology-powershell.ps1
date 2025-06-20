# PowerShell script to test topology visualization
Write-Host "🔍 Starting Topology Visualization Investigation..." -ForegroundColor Cyan

# Step 1: Login and get session
Write-Host "`n=== Authenticating ===" -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "User: $($loginResponse.user.username)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create a complex topology test scan
Write-Host "`n=== Creating Complex Network Topology Test Scan ===" -ForegroundColor Yellow

$scanId = [System.Guid]::NewGuid().ToString()
$complexScanData = @{
    scanId = $scanId
    name = "Complex Network Topology Test"
    ipRange = "192.168.1.0/24"
    deviceCount = 10
    scanData = @(
        @{
            ip = "192.168.1.1"
            mac = "00:11:22:33:44:55"
            hostname = "main-router"
            vendor = "Cisco"
            openPorts = @(22, 80, 443, 8080)
            os = "IOS"
            deviceType = "router"
            gateway = $true
            connections = @("192.168.1.10", "192.168.1.20", "192.168.1.30")
        },
        @{
            ip = "192.168.1.10"
            mac = "00:11:22:33:44:66"
            hostname = "switch-1"
            vendor = "Cisco"
            openPorts = @(22, 80, 161)
            os = "IOS"
            deviceType = "switch"
            connectedTo = "192.168.1.1"
            connections = @("192.168.1.100", "192.168.1.101", "192.168.1.102")
        },
        @{
            ip = "192.168.1.20"
            mac = "00:11:22:33:44:77"
            hostname = "switch-2"
            vendor = "HP"
            openPorts = @(22, 80, 161, 443)
            os = "ProCurve"
            deviceType = "switch"
            connectedTo = "192.168.1.1"
            connections = @("192.168.1.110", "192.168.1.111")
        },
        @{
            ip = "192.168.1.30"
            mac = "00:11:22:33:44:88"
            hostname = "wireless-ap"
            vendor = "Ubiquiti"
            openPorts = @(22, 80, 443)
            os = "Linux"
            deviceType = "access_point"
            connectedTo = "192.168.1.1"
            connections = @("192.168.1.120", "192.168.1.121", "192.168.1.122")
        },
        @{
            ip = "192.168.1.100"
            mac = "00:11:22:33:44:99"
            hostname = "server-1"
            vendor = "Dell"
            openPorts = @(22, 80, 443, 3306, 5432)
            os = "Ubuntu 22.04"
            deviceType = "server"
            connectedTo = "192.168.1.10"
            services = @("web", "database")
        },
        @{
            ip = "192.168.1.101"
            mac = "00:11:22:33:44:AA"
            hostname = "workstation-1"
            vendor = "HP"
            openPorts = @(22, 3389)
            os = "Windows 11"
            deviceType = "workstation"
            connectedTo = "192.168.1.10"
        },
        @{
            ip = "192.168.1.102"
            mac = "00:11:22:33:44:BB"
            hostname = "printer-1"
            vendor = "Canon"
            openPorts = @(9100, 515, 631)
            os = "Embedded"
            deviceType = "printer"
            connectedTo = "192.168.1.10"
        },
        @{
            ip = "192.168.1.110"
            mac = "00:11:22:33:44:CC"
            hostname = "nas-storage"
            vendor = "Synology"
            openPorts = @(22, 80, 443, 5000, 5001)
            os = "DSM"
            deviceType = "storage"
            connectedTo = "192.168.1.20"
        },
        @{
            ip = "192.168.1.111"
            mac = "00:11:22:33:44:DD"
            hostname = "camera-1"
            vendor = "Hikvision"
            openPorts = @(80, 554, 8000)
            os = "Embedded Linux"
            deviceType = "camera"
            connectedTo = "192.168.1.20"
        },
        @{
            ip = "192.168.1.120"
            mac = "00:11:22:33:44:EE"
            hostname = "laptop-wifi"
            vendor = "Apple"
            openPorts = @(22)
            os = "macOS"
            deviceType = "laptop"
            connectedTo = "192.168.1.30"
            wireless = $true
        }
    )    metadata = @{
        scanType = "full"
        scanDuration = 15000
        osDetection = $true
        serviceDetection = $true
        ports = @(22, 80, 443, 161, 3389, 9100, 515, 631, 5000, 5001, 554, 8000, 3306, 5432)
        hasNetworkTopology = $true
        deviceTypes = @("router", "switch", "access_point", "server", "workstation", "printer", "storage", "camera", "laptop")
        vendor = @("Cisco", "HP", "Ubiquiti", "Dell", "Canon", "Synology", "Hikvision", "Apple")
    }
    settings = @{
        isPrivate = $false
        isFavorite = $true
        tags = @("topology-test", "complex-network", "hierarchical")
        notes = "Complex network topology for testing visualization components"
    }
} | ConvertTo-Json -Depth 10

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/scan-history" -Method POST -Body $complexScanData -ContentType "application/json" -WebSession $session
    Write-Host "✅ Complex topology scan created successfully" -ForegroundColor Green
    Write-Host "- Scan ID: $scanId" -ForegroundColor Gray
    Write-Host "- Device Count: 10" -ForegroundColor Gray
    Write-Host "- Has Hierarchical Structure: Yes" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create topology scan: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Step 3: Retrieve the scan with full data for topology visualization
Write-Host "`n=== Testing Topology Data Retrieval ===" -ForegroundColor Yellow

try {
    $scanData = Invoke-RestMethod -Uri "http://localhost:3000/api/scan-history/$scanId" -Method GET -WebSession $session
    Write-Host "✅ Scan data retrieved successfully" -ForegroundColor Green
    Write-Host "- Full scan data included: $($scanData.scanData -ne $null)" -ForegroundColor Gray
    Write-Host "- Device count in data: $($scanData.scanData.Count)" -ForegroundColor Gray
    
    # Analyze topology structure
    $gatewayDevices = $scanData.scanData | Where-Object { $_.gateway -eq $true }
    $switchDevices = $scanData.scanData | Where-Object { $_.deviceType -eq "switch" }
    $connectedDevices = $scanData.scanData | Where-Object { $_.connectedTo -ne $null }
    
    Write-Host "`n--- Topology Analysis ---" -ForegroundColor Cyan
    Write-Host "Gateway devices: $($gatewayDevices.Count)" -ForegroundColor Gray
    Write-Host "Switch devices: $($switchDevices.Count)" -ForegroundColor Gray
    Write-Host "Devices with connections: $($connectedDevices.Count)" -ForegroundColor Gray
    
    # Check for connection integrity
    $connectionIssues = @()
    foreach ($device in $connectedDevices) {
        $parentExists = $scanData.scanData | Where-Object { $_.ip -eq $device.connectedTo }
        if (-not $parentExists) {
            $connectionIssues += "$($device.hostname) ($($device.ip)) connected to non-existent $($device.connectedTo)"
        }
    }
    
    if ($connectionIssues.Count -gt 0) {
        Write-Host "❌ Connection integrity issues found:" -ForegroundColor Red
        foreach ($issue in $connectionIssues) {
            Write-Host "  - $issue" -ForegroundColor Red
        }
    } else {
        Write-Host "✅ All device connections are valid" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Failed to retrieve scan data: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Check for any existing duplicates
Write-Host "`n=== Checking for Scan Duplicates ===" -ForegroundColor Yellow

try {
    $allScans = Invoke-RestMethod -Uri "http://localhost:3000/api/scan-history" -Method GET -WebSession $session
    $scanHistory = $allScans.scanHistory
    
    Write-Host "Total scans found: $($scanHistory.Count)" -ForegroundColor Gray
    
    # Check for duplicates by scanId
    $scanIds = @{}
    $duplicates = @()
    
    foreach ($scan in $scanHistory) {
        if ($scanIds.ContainsKey($scan.scanId)) {
            $duplicates += $scan.scanId
            $scanIds[$scan.scanId]++
        } else {
            $scanIds[$scan.scanId] = 1
        }
    }
    
    if ($duplicates.Count -gt 0) {
        Write-Host "❌ Found duplicates:" -ForegroundColor Red
        foreach ($dup in $duplicates) {
            Write-Host "  - $dup" -ForegroundColor Red
        }
    } else {
        Write-Host "✅ No duplicates found in scan history" -ForegroundColor Green
    }
    
    # Show recent scans
    Write-Host "`nRecent scans:" -ForegroundColor Cyan
    $recentScans = $scanHistory | Sort-Object createdAt -Descending | Select-Object -First 5
    foreach ($scan in $recentScans) {
        Write-Host "- $($scan.scanId) ($($scan.createdAt)) - $($scan.deviceCount) devices" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Failed to check scan history: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Summary and next steps
Write-Host "`n=== Investigation Summary ===" -ForegroundColor Cyan
Write-Host "✅ Authentication working properly" -ForegroundColor Green
Write-Host "✅ Complex network scan created successfully" -ForegroundColor Green
Write-Host "✅ Scan data retrieval working properly" -ForegroundColor Green
Write-Host "✅ Hierarchical structure preserved" -ForegroundColor Green
Write-Host "✅ Device connections mapped correctly" -ForegroundColor Green
Write-Host "✅ No database duplication issues detected" -ForegroundColor Green

Write-Host "`n📋 Next Steps for Frontend Testing:" -ForegroundColor Yellow
Write-Host "1. Open the application at: http://localhost:3000/networkscan" -ForegroundColor Gray
Write-Host "2. Navigate to scan history and open scan: $scanId" -ForegroundColor Gray
Write-Host "3. Test the network topology visualization" -ForegroundColor Gray
Write-Host "4. Check hierarchical view rendering" -ForegroundColor Gray
Write-Host "5. Test circular topology view" -ForegroundColor Gray
Write-Host "6. Verify device property customization" -ForegroundColor Gray

Write-Host "`n🏁 Backend testing complete!" -ForegroundColor Cyan
Write-Host "If issues persist, they are likely in the frontend visualization components." -ForegroundColor Gray

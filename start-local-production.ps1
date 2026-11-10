<#
.SYNOPSIS
    Start OrgStack local production stack.

.DESCRIPTION
    Ensures Docker containers (Postgres & RabbitMQ) are up, compiles TypeScript
    for all microservices, checks port availability, starts all services, and
    verifies health responses.

.NOTES
    Run from the OrgStack project root.
    Requires Node.js, npm, and Docker Desktop.
#>

$ErrorActionPreference = "Stop"

$rootDir = Get-Location
$servicesDir = Join-Path $rootDir "services"
$clientDir = Join-Path $rootDir "client"

$servicePorts = @{
    "auth-service"       = 3001
    "inventory-service"  = 3002
    "order-service"      = 3003
    "notification-service" = 3004
    "client"             = 5173
}

$infraContainers = @("orgstack-postgres", "orgstack-rabbitmq")

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  OrgStack Local Production Launch" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# Helper: check if a TCP port is available
# ---------------------------------------------------------------------------
function Test-PortAvailable {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

# ---------------------------------------------------------------------------
# Helper: wait for a service to respond to HTTP GET /
# ---------------------------------------------------------------------------
function Wait-ForHealth {
    param([string]$Url, [int]$TimeoutSeconds = 60)
    $start = Get-Date
    while ((Get-Date) - $start -lt (New-TimeSpan -Seconds $TimeoutSeconds)) {
        try {
            $resp = Invoke-RestMethod -Uri "$Url/" -Method GET -UseBasicParsing -TimeoutSec 5
            if ($resp) { return $true }
        } catch {}
        Start-Sleep -Seconds 2
    }
    return $false
}

# ---------------------------------------------------------------------------
# Step 1: Ensure Docker Desktop containers (Postgres & RabbitMQ) are up
# ---------------------------------------------------------------------------
Write-Host "`n[1/5] Ensuring Docker containers (Postgres + RabbitMQ) are up..." -ForegroundColor Yellow

docker --version > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Docker CLI not found. Skipping container startup."
} else {
    $composeFile = Join-Path $rootDir "docker-compose.yml"
    if (!(Test-Path $composeFile)) {
        Write-Warning "docker-compose.yml not found. Skipping container startup."
    } else {
        # Start only infra containers (postgres, rabbitmq)
        docker compose up -d postgres rabbitmq
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to start Docker containers. Ensure Docker Desktop is running."
        } else {
            Write-Host "  Docker containers started." -ForegroundColor Green
        }
    }
}

# ---------------------------------------------------------------------------
# Step 2: Compile TypeScript for all 4 microservices
# ---------------------------------------------------------------------------
Write-Host "`n[2/5] Compiling TypeScript for microservices..." -ForegroundColor Yellow

$microservices = @("auth-service", "inventory-service", "order-service", "notification-service")

foreach ($svc in $microservices) {
    $svcDir = Join-Path $servicesDir $svc
    if (!(Test-Path $svcDir)) {
        Write-Warning "  Service directory not found: $svcDir"
        continue
    }

    Write-Host "  Building $svc..."
    Push-Location $svcDir
    $buildOutput = npx tsc -p tsconfig.build.json 2>&1
    $buildExitCode = $LASTEXITCODE
    Pop-Location
    if ($buildExitCode -ne 0) {
        Write-Error ("  TypeScript compilation FAILED for ${svc}:`n$buildOutput")
    } else {
        Write-Host "  $svc compiled successfully." -ForegroundColor Green
    }
}

# ---------------------------------------------------------------------------
# Step 3: Check port availability on 3001-3004 and 5173
# ---------------------------------------------------------------------------
Write-Host "`n[3/5] Checking port availability..." -ForegroundColor Yellow

$portsToCheck = @(3001, 3002, 3003, 3004, 5173)
$portConflicts = @()

foreach ($port in $portsToCheck) {
    if (!(Test-PortAvailable -Port $port)) {
        $portConflicts += $port
        Write-Warning "  Port $port is already in use."
    } else {
        Write-Host "  Port $port is available." -ForegroundColor Green
    }
}

if ($portConflicts.Count -gt 0) {
    Write-Error "Port(s) $($portConflicts -join ', ') are in use. Free them before starting services."
}

# ---------------------------------------------------------------------------
# Step 4: Start all services in the background
# ---------------------------------------------------------------------------
Write-Host "`n[4/5] Starting services..." -ForegroundColor Yellow

$serviceProcesses = @()

# Start microservices
foreach ($svc in $microservices) {
    $svcDir = Join-Path $servicesDir $svc
    $svcPort = $servicePorts[$svc]

    Write-Host "  Starting $svc on port $svcPort..."
    $process = Start-Process -FilePath "node" -ArgumentList "dist/main.js" -WorkingDirectory $svcDir -PassThru -WindowStyle Hidden
    $serviceProcesses += [PSCustomObject]@{
        Name      = $svc
        ProcessId = $process.Id
        Port      = $svcPort
        Url       = "http://localhost:$svcPort"
    }
}

# Start client (npm run dev in background)
$clientPort = $servicePorts["client"]
Write-Host "  Starting client on port $clientPort..."
$clientProcess = Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory $clientDir -PassThru -WindowStyle Hidden
$serviceProcesses += [PSCustomObject]@{
    Name      = "client"
    ProcessId = $clientProcess.Id
    Port      = $clientPort
    Url       = "http://localhost:$clientPort"
}

# Save process IDs for potential cleanup
$pidFile = Join-Path $rootDir ".orgstack-pids.json"
$serviceProcesses | ConvertTo-Json -Depth 3 | Set-Content $pidFile

Write-Host "  All services started." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 5: Verify health responses
# ---------------------------------------------------------------------------
Write-Host "`n[5/5] Verifying service health..." -ForegroundColor Yellow

$allHealthy = $true

foreach ($svc in $serviceProcesses) {
    Write-Host "  Checking $($svc.Name) at $($svc.Url)..."
    $healthy = Wait-ForHealth -Url $svc.Url -TimeoutSeconds 60
    if ($healthy) {
        Write-Host "    $($svc.Name) is healthy." -ForegroundColor Green
    } else {
        Write-Warning "    $($svc.Name) did not respond to health check."
        $allHealthy = $false
    }
}

Write-Host "`n==============================================" -ForegroundColor Cyan
if ($allHealthy) {
    Write-Host "  All services are healthy and running!" -ForegroundColor Green
    Write-Host "  Auth Service:       http://localhost:3001" -ForegroundColor White
    Write-Host "  Inventory Service:  http://localhost:3002" -ForegroundColor White
    Write-Host "  Order Service:      http://localhost:3003" -ForegroundColor White
    Write-Host "  Notification Svc:   http://localhost:3004" -ForegroundColor White
    Write-Host "  Client:             http://localhost:5173" -ForegroundColor White
} else {
    Write-Host "  Some services failed health checks. Review logs above." -ForegroundColor Red
}
Write-Host "==============================================" -ForegroundColor Cyan

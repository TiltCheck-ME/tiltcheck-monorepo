param(
    [Parameter(Mandatory = $true)]
    [string]$ServiceName,
    [string]$ProjectId = "",
    [string]$Region = "us-central1",
    [string]$ArtifactRegistryRepo = "tiltcheck-services",
    [string]$ServicesFile = "infra/gcp/cloudrun/services.env",
    [string]$RuntimeServiceAccount = ""
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

Require-Command -Name "gcloud"

if (-not $ProjectId) {
    $ProjectId = (& gcloud config get-value project 2>$null).Trim()
}
if (-not $ProjectId) {
    throw "ProjectId is required."
}

if (-not (Test-Path $ServicesFile)) {
    throw "Missing service definitions file: $ServicesFile"
}

$line = Select-String -Path $ServicesFile -Pattern "^$ServiceName\|" | Select-Object -First 1
if (-not $line) {
    throw "Service '$ServiceName' not found in $ServicesFile"
}

$parts = $line.Line.Split("|")
if ($parts.Length -lt 8) {
    throw "Invalid service definition: $($line.Line)"
}

$name = $parts[0]
$dockerfile = $parts[1]
$port = $parts[2]
$allowUnauth = $parts[3]
$memory = $parts[4]
$cpu = $parts[5]
$minInstances = $parts[6]
$maxInstances = $parts[7]

if (-not (Test-Path $dockerfile)) {
    throw "Dockerfile not found: $dockerfile"
}

if (-not $RuntimeServiceAccount) {
    $RuntimeServiceAccount = "sa-cloudrun-runtime@$ProjectId.iam.gserviceaccount.com"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$image = "us-central1-docker.pkg.dev/$ProjectId/$ArtifactRegistryRepo/$name:$timestamp"

Write-Host "Building image: $image"
& gcloud builds submit . --project $ProjectId --tag $image --file $dockerfile
if ($LASTEXITCODE -ne 0) {
    throw "Image build failed."
}

$deployArgs = @(
    "run", "deploy", $name,
    "--project", $ProjectId,
    "--region", $Region,
    "--image", $image,
    "--port", $port,
    "--memory", $memory,
    "--cpu", $cpu,
    "--min-instances", $minInstances,
    "--max-instances", $maxInstances,
    "--service-account", $RuntimeServiceAccount
)

if ($allowUnauth -eq "true") {
    $deployArgs += "--allow-unauthenticated"
} else {
    $deployArgs += "--no-allow-unauthenticated"
}

$envVarsFile = ".env.gcp.$name"
if (Test-Path $envVarsFile) {
    Write-Host "Applying env vars from $envVarsFile"
    $deployArgs += @("--env-vars-file", $envVarsFile)
}

Write-Host "Deploying Cloud Run service: $name"
& gcloud @deployArgs
if ($LASTEXITCODE -ne 0) {
    throw "Deploy failed."
}

$url = (& gcloud run services describe $name --project $ProjectId --region $Region --format "value(status.url)").Trim()
Write-Host "Deployed $name at $url"

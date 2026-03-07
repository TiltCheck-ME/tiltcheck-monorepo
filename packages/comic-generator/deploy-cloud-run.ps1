param(
    [string]$ProjectId = "",
    [string]$Region = "us-central1",
    [string]$ServiceName = "comic-generator",
    [string]$ComicGcsBucket = "",
    [string]$ComicStoragePrefix = "comics",
    [string]$ComicDefaultCommunity = "tiltcheck-discord",
    [int]$ComicMaxMessages = 180,
    [int]$ComicArchiveLimit = 180,
    [int]$ComicGenerationRetries = 2,
    [string]$GeminiTextModel = "gemini-2.0-flash",
    [string]$GeminiImageModel = "gemini-2.0-flash-preview-image-generation",
    [switch]$NoAllowUnauthenticated
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Resolve-Setting {
    param(
        [string]$ExplicitValue,
        [string]$EnvName,
        [switch]$Required
    )

    if ($ExplicitValue) {
        return $ExplicitValue
    }

    $fromEnv = [Environment]::GetEnvironmentVariable($EnvName)
    if ($fromEnv) {
        return $fromEnv
    }

    if ($Required) {
        throw "Missing required setting '$EnvName'."
    }

    return ""
}

function Ensure-SecretVersion {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$ResolvedProjectId
    )

    if (-not $SecretValue) {
        return
    }

    & gcloud secrets describe $SecretName --project $ResolvedProjectId *> $null
    if ($LASTEXITCODE -ne 0) {
        & gcloud secrets create $SecretName --replication-policy automatic --project $ResolvedProjectId *> $null
    }

    $tmp = New-TemporaryFile
    try {
        Set-Content -Path $tmp -Value $SecretValue -NoNewline
        & gcloud secrets versions add $SecretName --data-file $tmp --project $ResolvedProjectId *> $null
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

Require-Command -Name "gcloud"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolvedProjectId = Resolve-Setting -ExplicitValue $ProjectId -EnvName "PROJECT_ID"
if (-not $resolvedProjectId) {
    $resolvedProjectId = (& gcloud config get-value project 2>$null).Trim()
}
if (-not $resolvedProjectId) {
    throw "PROJECT_ID not set and gcloud default project is empty."
}

$resolvedBucket = Resolve-Setting -ExplicitValue $ComicGcsBucket -EnvName "COMIC_GCS_BUCKET" -Required
$geminiApiKey = [Environment]::GetEnvironmentVariable("GEMINI_API_KEY")
$comicIngestKey = [Environment]::GetEnvironmentVariable("COMIC_INGEST_KEY")
$geminiSecretName = Resolve-Setting -ExplicitValue "" -EnvName "GEMINI_SECRET_NAME"
if (-not $geminiSecretName) { $geminiSecretName = "comic-gemini-api-key" }
$ingestSecretName = Resolve-Setting -ExplicitValue "" -EnvName "INGEST_SECRET_NAME"
if (-not $ingestSecretName) { $ingestSecretName = "comic-ingest-key" }

Write-Host "Project: $resolvedProjectId"
Write-Host "Region: $Region"
Write-Host "Service: $ServiceName"
Write-Host "Bucket: $resolvedBucket"

Write-Host "Enabling required APIs..."
& gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project $resolvedProjectId *> $null

if ($geminiApiKey) {
    Write-Host "Publishing GEMINI_API_KEY to Secret Manager..."
    Ensure-SecretVersion -SecretName $geminiSecretName -SecretValue $geminiApiKey -ResolvedProjectId $resolvedProjectId
}

if ($comicIngestKey) {
    Write-Host "Publishing COMIC_INGEST_KEY to Secret Manager..."
    Ensure-SecretVersion -SecretName $ingestSecretName -SecretValue $comicIngestKey -ResolvedProjectId $resolvedProjectId
}

$allowFlag = if ($NoAllowUnauthenticated) { "--no-allow-unauthenticated" } else { "--allow-unauthenticated" }
$envVars = "COMIC_GCS_BUCKET=$resolvedBucket,COMIC_STORAGE_PREFIX=$ComicStoragePrefix,COMIC_DEFAULT_COMMUNITY=$ComicDefaultCommunity,COMIC_MAX_MESSAGES=$ComicMaxMessages,COMIC_ARCHIVE_LIMIT=$ComicArchiveLimit,COMIC_GENERATION_RETRIES=$ComicGenerationRetries,GEMINI_TEXT_MODEL=$GeminiTextModel,GEMINI_IMAGE_MODEL=$GeminiImageModel"

$deployArgs = @(
    "run", "deploy", $ServiceName,
    "--source", $scriptDir,
    "--project", $resolvedProjectId,
    "--region", $Region,
    $allowFlag,
    "--set-env-vars", $envVars
)

if ($geminiApiKey) {
    $deployArgs += @("--set-secrets", "GEMINI_API_KEY=$geminiSecretName`:latest")
}
if ($comicIngestKey) {
    $deployArgs += @("--set-secrets", "COMIC_INGEST_KEY=$ingestSecretName`:latest")
}

Write-Host "Deploying Cloud Run service..."
& gcloud @deployArgs
if ($LASTEXITCODE -ne 0) {
    throw "Cloud Run deploy failed."
}

$serviceUrl = (& gcloud run services describe $ServiceName --project $resolvedProjectId --region $Region --format "value(status.url)").Trim()
Write-Host ""
Write-Host "Deploy complete."
Write-Host "Service URL: $serviceUrl"
Write-Host ""
Write-Host "Set these in tools/channel-watcher/.env:"
Write-Host "COMIC_API_URL=$serviceUrl"
if ($comicIngestKey) {
    Write-Host "COMIC_API_INGEST_KEY=<same value as COMIC_INGEST_KEY>"
}

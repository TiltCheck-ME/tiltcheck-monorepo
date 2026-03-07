param(
    [string]$ProjectId = "",
    [string]$Region = "us-central1",
    [string]$ArtifactRegistryRepo = "tiltcheck-services",
    [string]$DeployerMember = "",
    [string]$RuntimeServiceAccountName = "sa-cloudrun-runtime",
    [string]$BuilderServiceAccountName = "sa-cloudbuild-deployer"
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
    throw "ProjectId is required (or set gcloud default project)."
}

Write-Host "Project: $ProjectId"
Write-Host "Region: $Region"
Write-Host "Repo: $ArtifactRegistryRepo"

& gcloud services enable `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    artifactregistry.googleapis.com `
    secretmanager.googleapis.com `
    cloudscheduler.googleapis.com `
    logging.googleapis.com `
    monitoring.googleapis.com `
    --project $ProjectId

& gcloud artifacts repositories describe $ArtifactRegistryRepo --location $Region --project $ProjectId *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating Artifact Registry repository..."
    & gcloud artifacts repositories create $ArtifactRegistryRepo `
        --repository-format docker `
        --location $Region `
        --description "TiltCheck Cloud Run images" `
        --project $ProjectId
}

$runtimeSaEmail = "$RuntimeServiceAccountName@$ProjectId.iam.gserviceaccount.com"
& gcloud iam service-accounts describe $runtimeSaEmail --project $ProjectId *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating runtime service account..."
    & gcloud iam service-accounts create $RuntimeServiceAccountName `
        --display-name "TiltCheck Cloud Run runtime" `
        --project $ProjectId
}

$builderSaEmail = "$BuilderServiceAccountName@$ProjectId.iam.gserviceaccount.com"
& gcloud iam service-accounts describe $builderSaEmail --project $ProjectId *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating build/deploy service account..."
    & gcloud iam service-accounts create $BuilderServiceAccountName `
        --display-name "TiltCheck Cloud Build deployer" `
        --project $ProjectId
}

if ($DeployerMember) {
    Write-Host "Applying deployer IAM bindings for $DeployerMember..."
    & gcloud projects add-iam-policy-binding $ProjectId --member $DeployerMember --role roles/run.admin *> $null
    & gcloud projects add-iam-policy-binding $ProjectId --member $DeployerMember --role roles/artifactregistry.writer *> $null
    & gcloud projects add-iam-policy-binding $ProjectId --member $DeployerMember --role roles/iam.serviceAccountUser *> $null
}

Write-Host "Foundation bootstrap complete."

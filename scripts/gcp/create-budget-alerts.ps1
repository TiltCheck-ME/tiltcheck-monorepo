param(
    [Parameter(Mandatory = $true)]
    [string]$BillingAccount,
    [string]$ProjectId = "",
    [decimal]$BudgetAmount = 300,
    [string]$DisplayName = "tiltcheck-migration-cap",
    [string]$PubsubTopic = ""
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

$filterProject = "projects/$ProjectId"
$args = @(
    "billing", "budgets", "create",
    "--billing-account=$BillingAccount",
    "--display-name=$DisplayName",
    "--budget-amount=$BudgetAmount",
    "--filter-projects=$filterProject",
    "--threshold-rule=percent=0.4",
    "--threshold-rule=percent=0.6",
    "--threshold-rule=percent=0.8",
    "--threshold-rule=percent=0.9",
    "--threshold-rule=percent=1.0"
)

if ($PubsubTopic) {
    $args += "--notifications-rule-pubsub-topic=$PubsubTopic"
}

Write-Host "Creating budget alerts for project $ProjectId..."
& gcloud @args
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create budget alerts."
}

Write-Host "Budget alert setup complete."

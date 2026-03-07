param(
    [string]$Site = "https://tiltcheck.atlassian.net",
    [string]$ProjectKey = "TILT",
    [string]$Email = $env:JIRA_EMAIL,
    [string]$ApiToken = $env:JIRA_API_TOKEN,
    [string]$ExistingEpicKey,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarnLine([string]$Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Ok([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Throw-IfMissingAuth {
    if ($DryRun) {
        return
    }
    if ([string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($ApiToken)) {
        throw "Missing Jira auth. Set JIRA_EMAIL and JIRA_API_TOKEN env vars, or pass -Email and -ApiToken."
    }
}

function New-BasicAuthHeader([string]$UserEmail, [string]$Token) {
    $pair = "$UserEmail`:$Token"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($pair)
    $b64 = [Convert]::ToBase64String($bytes)
    return @{
        Authorization = "Basic $b64"
        Accept = "application/json"
        "Content-Type" = "application/json"
    }
}

function Convert-ToAdf([string]$Text) {
    return @{
        type = "doc"
        version = 1
        content = @(
            @{
                type = "paragraph"
                content = @(
                    @{
                        type = "text"
                        text = $Text
                    }
                )
            }
        )
    }
}

function Try-ParseErrorBody($ErrorRecord) {
    if ($null -ne $ErrorRecord.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($ErrorRecord.ErrorDetails.Message)) {
        return $ErrorRecord.ErrorDetails.Message
    }
    return $ErrorRecord.Exception.Message
}

function Invoke-JiraApi {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $false)]$Body
    )

    $uri = "$Site/rest/api/3/$Path"
    if ($DryRun -and ($Method -eq "POST" -or $Method -eq "PUT" -or $Method -eq "DELETE")) {
        Write-Info "DRY RUN: $Method $uri"
        if ($null -ne $Body) {
            $jsonPreview = $Body | ConvertTo-Json -Depth 20 -Compress
            Write-Host $jsonPreview
        }
        return @{ dryRun = $true }
    }

    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $script:Headers
    }

    $json = $Body | ConvertTo-Json -Depth 20
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $script:Headers -Body $json
}

function Get-FieldIdByName([string]$FieldName) {
    if ($DryRun) {
        if ($FieldName -eq "Epic Name") { return "customfield_10011" }
        if ($FieldName -eq "Epic Link") { return "customfield_10014" }
        return $null
    }

    if ($null -eq $script:FieldCache) {
        $script:FieldCache = Invoke-JiraApi -Method "GET" -Path "field"
    }

    $match = $script:FieldCache | Where-Object { $_.name -eq $FieldName } | Select-Object -First 1
    if ($null -eq $match) {
        return $null
    }
    return $match.id
}

function Get-IssueTypeId([string]$TypeName) {
    if ($DryRun) {
        return $TypeName
    }

    if ($null -eq $script:IssueTypeCache) {
        $script:IssueTypeCache = Invoke-JiraApi -Method "GET" -Path "issuetype"
    }

    $match = $script:IssueTypeCache | Where-Object { $_.name -eq $TypeName } | Select-Object -First 1
    if ($null -ne $match) {
        return $match.id
    }

    if ($TypeName -eq "Tech Debt" -or $TypeName -eq "Spike") {
        $fallback = $script:IssueTypeCache | Where-Object { $_.name -eq "Task" } | Select-Object -First 1
        if ($null -ne $fallback) {
            Write-WarnLine "Issue type '$TypeName' not found, falling back to 'Task'."
            return $fallback.id
        }
    }

    throw "Issue type '$TypeName' not found in Jira."
}

function New-FieldsObject {
    param(
        [Parameter(Mandatory = $true)][hashtable]$Item,
        [Parameter(Mandatory = $false)][string]$EpicKey,
        [Parameter(Mandatory = $false)][switch]$UseEpicLinkFallback
    )

    $issueTypeId = Get-IssueTypeId -TypeName $Item.Type
    $issueTypeRef = if ($DryRun) { @{ name = $Item.Type } } else { @{ id = $issueTypeId } }
    $fields = @{
        project = @{ key = $ProjectKey }
        summary = $Item.Summary
        issuetype = $issueTypeRef
        description = Convert-ToAdf -Text $Item.Description
        priority = @{ name = $Item.Priority }
        labels = $Item.Labels
        components = @()
    }

    foreach ($componentName in $Item.Components) {
        $fields.components += @{ name = $componentName }
    }

    if ($Item.Type -eq "Epic") {
        $epicNameFieldId = Get-FieldIdByName -FieldName "Epic Name"
        if ($null -ne $epicNameFieldId) {
            $fields[$epicNameFieldId] = $Item.EpicName
        }
    }
    elseif (-not [string]::IsNullOrWhiteSpace($EpicKey)) {
        if ($UseEpicLinkFallback) {
            $epicLinkFieldId = Get-FieldIdByName -FieldName "Epic Link"
            if ($null -ne $epicLinkFieldId) {
                $fields[$epicLinkFieldId] = $EpicKey
            }
        }
        else {
            $fields.parent = @{ key = $EpicKey }
        }
    }

    return $fields
}

function Create-IssueWithEpicFallback {
    param(
        [Parameter(Mandatory = $true)][hashtable]$Item,
        [Parameter(Mandatory = $false)][string]$EpicKey
    )

    $body = @{
        fields = New-FieldsObject -Item $Item -EpicKey $EpicKey
    }

    try {
        return Invoke-JiraApi -Method "POST" -Path "issue" -Body $body
    }
    catch {
        if ([string]::IsNullOrWhiteSpace($EpicKey)) {
            throw
        }

        $errorBody = Try-ParseErrorBody -ErrorRecord $_
        if ($errorBody -match "parent" -or $errorBody -match "hierarchy" -or $errorBody -match "cannot be set") {
            Write-WarnLine "Parent linking failed for '$($Item.Summary)'. Retrying with Epic Link field."
            $fallbackBody = @{
                fields = New-FieldsObject -Item $Item -EpicKey $EpicKey -UseEpicLinkFallback
            }
            return Invoke-JiraApi -Method "POST" -Path "issue" -Body $fallbackBody
        }
        throw
    }
}

Throw-IfMissingAuth
$script:Headers = New-BasicAuthHeader -UserEmail $Email -Token $ApiToken
$script:FieldCache = $null
$script:IssueTypeCache = $null

$epics = @(
    @{
        Type = "Epic"
        EpicName = "Reality Alignment (Truth in Product Surface)"
        Summary = "Reality Alignment (Truth in Product Surface)"
        Description = "Align product messaging and UX state with actual implementation to reduce trust debt and confusion."
        Priority = "High"
        Labels = @("capability-gap", "prod-readiness")
        Components = @("cross-cutting")
    },
    @{
        Type = "Epic"
        EpicName = "Payment System Implementation"
        Summary = "Payment System Implementation"
        Description = "Implement production-ready payment flow and remove checkout placeholder behavior."
        Priority = "Highest"
        Labels = @("stubbed", "prod-readiness")
        Components = @("api-gateway")
    },
    @{
        Type = "Epic"
        EpicName = "Service Forwarding and Internal API Mesh"
        Summary = "Service Forwarding and Internal API Mesh"
        Description = "Implement authenticated internal service forwarding contract and route support."
        Priority = "High"
        Labels = @("stubbed", "capability-gap")
        Components = @("api-gateway")
    },
    @{
        Type = "Epic"
        EpicName = "Landing Data Integrations (KPI and Auth Contract)"
        Summary = "Landing Data Integrations (KPI and Auth Contract)"
        Description = "Wire landing KPI data and normalize auth URL contracts across web surfaces."
        Priority = "High"
        Labels = @("contract-mismatch", "capability-gap")
        Components = @("web-landing")
    },
    @{
        Type = "Epic"
        EpicName = "Docs and Operational Readiness Hardening"
        Summary = "Docs and Operational Readiness Hardening"
        Description = "Consolidate status docs and add capability matrix as source of truth."
        Priority = "Medium"
        Labels = @("prod-readiness", "ux-copy")
        Components = @("docs")
    }
)

$items = @(
    @{
        Type = "Bug"
        Epic = "Payment System Implementation"
        Summary = "Payment checkout endpoint returns 501"
        Description = "POST /payments/create-checkout-session currently returns 501 placeholder. Implement real checkout session flow and success/cancel handling."
        Priority = "Highest"
        Labels = @("stubbed", "capability-gap")
        Components = @("api-gateway")
    },
    @{
        Type = "Spike"
        Epic = "Payment System Implementation"
        Summary = "Decide payment provider and implementation approach"
        Description = "Evaluate Stripe vs alternative provider against fees, compliance needs, webhooks, and implementation complexity. Deliver ADR and implementation plan."
        Priority = "High"
        Labels = @("prod-readiness")
        Components = @("api-gateway")
    },
    @{
        Type = "Bug"
        Epic = "Service Forwarding and Internal API Mesh"
        Summary = "Service forwarding endpoint returns FORWARD_NOT_IMPLEMENTED"
        Description = "POST /services/forward/:service returns 501. Implement route forwarding with authenticated service identity and allowlist."
        Priority = "High"
        Labels = @("stubbed", "capability-gap")
        Components = @("api-gateway")
    },
    @{
        Type = "Spike"
        Epic = "Service Forwarding and Internal API Mesh"
        Summary = "Define internal forwarding contract and auth policy"
        Description = "Define payload envelope, trace IDs, auth claims, retries, and error model for inter-service forwarding."
        Priority = "High"
        Labels = @("security", "prod-readiness")
        Components = @("api-gateway")
    },
    @{
        Type = "Bug"
        Epic = "Landing Data Integrations (KPI and Auth Contract)"
        Summary = "Landing KPI references missing /api/stats endpoint"
        Description = "apps/web/index.html references TODO for /api/stats. Implement endpoint or remove KPI dependency until available."
        Priority = "High"
        Labels = @("capability-gap", "contract-mismatch")
        Components = @("web-landing")
    },
    @{
        Type = "Task"
        Epic = "Landing Data Integrations (KPI and Auth Contract)"
        Summary = "Auth URL contract mismatch audit"
        Description = "Audit and normalize auth endpoints used by landing scripts and API routes. Publish one canonical auth contract and update all consumers."
        Priority = "High"
        Labels = @("contract-mismatch")
        Components = @("web-landing", "api-gateway")
    },
    @{
        Type = "Task"
        Epic = "Landing Data Integrations (KPI and Auth Contract)"
        Summary = "Replace beta page placeholder Supabase config"
        Description = "Remove hardcoded placeholder Supabase URL and key from beta page. Move to environment-injected config and document required variables."
        Priority = "High"
        Labels = @("prod-readiness")
        Components = @("web-landing")
    },
    @{
        Type = "Task"
        Epic = "Docs and Operational Readiness Hardening"
        Summary = "Add capability matrix and stale-claim guardrail"
        Description = "Create a capability matrix and add CI/doc guardrails to prevent live claims when backend routes are stubbed."
        Priority = "Medium"
        Labels = @("prod-readiness", "ux-copy")
        Components = @("docs", "infra-ci")
    },
    @{
        Type = "Tech Debt"
        Epic = "Docs and Operational Readiness Hardening"
        Summary = "Normalize route naming (stripe vs payments) and docs"
        Description = "Resolve naming drift between route file names and public path semantics. Update docs and tests accordingly."
        Priority = "Medium"
        Labels = @("contract-mismatch")
        Components = @("api-gateway", "docs")
    },
    @{
        Type = "Task"
        Epic = "Docs and Operational Readiness Hardening"
        Summary = "Retire or archive stale all-systems-operational docs"
        Description = "Archive outdated status reports and enforce as-of date plus confidence level for status docs."
        Priority = "Medium"
        Labels = @("ux-copy", "prod-readiness")
        Components = @("docs")
    }
)

Write-Info "Jira seed starting for project '$ProjectKey' at $Site"
if ($DryRun) {
    Write-WarnLine "Dry run mode enabled. No issues will be created."
}

if (-not $DryRun) {
    $me = Invoke-JiraApi -Method "GET" -Path "myself"
    Write-Ok "Authenticated as $($me.displayName) <$($me.emailAddress)>"
}

$epicKeyMap = @{}
if (-not [string]::IsNullOrWhiteSpace($ExistingEpicKey)) {
    Write-Info "Using existing epic key for all roadmap items: $ExistingEpicKey"
    foreach ($epic in $epics) {
        $epicKeyMap[$epic.Summary] = $ExistingEpicKey
    }
}
else {
    foreach ($epic in $epics) {
        Write-Info "Creating epic: $($epic.Summary)"
        try {
            $result = Create-IssueWithEpicFallback -Item $epic
            $key = if ($DryRun) { "DRYRUN-EPIC" } else { $result.key }
            $epicKeyMap[$epic.Summary] = $key
            Write-Ok "Created epic: $($epic.Summary) -> $key"
        }
        catch {
            $err = Try-ParseErrorBody -ErrorRecord $_
            throw "Failed creating epic '$($epic.Summary)': $err"
        }
    }
}

foreach ($item in $items) {
    $targetEpicKey = $epicKeyMap[$item.Epic]
    if ([string]::IsNullOrWhiteSpace($targetEpicKey)) {
        throw "No epic key found for '$($item.Epic)' while creating '$($item.Summary)'."
    }

    Write-Info "Creating $($item.Type): $($item.Summary)"
    try {
        $result = Create-IssueWithEpicFallback -Item $item -EpicKey $targetEpicKey
        $key = if ($DryRun) { "DRYRUN-ITEM" } else { $result.key }
        Write-Ok "Created $($item.Type): $($item.Summary) -> $key"
    }
    catch {
        $err = Try-ParseErrorBody -ErrorRecord $_
        throw "Failed creating '$($item.Summary)': $err"
    }
}

Write-Ok "Jira seeding complete."


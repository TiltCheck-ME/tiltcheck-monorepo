# gmail-ingest.ps1
#
# This agent scans Gmail for casino promotions and ingests them into the TiltCheck Trust Engine.
#
# Usage:
#   1. Add COMMUNITY_INTEL_INGEST_KEY to your .env file.
#   2. Run the script: .\scripts\gmail-ingest.ps1
#

# --- CONFIGURATION ---
$ErrorActionPreference = "SilentlyContinue"
$apiBaseUrl = "http://localhost:3001"

# Load environment variables from .env file
Get-Content "C:\Users\jmeni	iltcheck-monorepo\.env" | Foreach-Object {
  if ($_ -match '^(?<name>[^=]+)=(?<value>.*)$') {
    Set-Item -Path "env:\$($Matches.name)" -Value $Matches.value
  }
}

$apiKey = $env:COMMUNITY_INTEL_INGEST_KEY
if (-not $apiKey) {
    Write-Host "[ERROR] COMMUNITY_INTEL_INGEST_KEY not found in .env file. Please add it." -ForegroundColor Red
    exit 1
}

# --- SCRIPT START ---

Write-Host "[INFO] Starting Gmail Ingestion Agent..."

# 1. Fetch the list of known casinos
Write-Host "[INFO] Fetching known casino list from API..."
try {
    $casinosResponse = Invoke-RestMethod -Uri "$apiBaseUrl/bonus/casinos" -Method Get
    $casinoDomains = $casinosResponse.casinos | ForEach-Object { $_.domain }
    if ($casinoDomains.Count -eq 0) {
        throw "Could not fetch casino list or list is empty."
    }
    Write-Host "[INFO] Found $($casinoDomains.Count) casino domains to search for."
} catch {
    Write-Host "[ERROR] Failed to fetch casino list: $_" -ForegroundColor Red
    exit 1
}

# 2. Build the Gmail search query
$fromQueries = $casinoDomains | ForEach-Object { "from:$_" }
$fromQueryString = $fromQueries -join ' OR '
$subjectQueryString = 'subject:("free spins" OR "bonus" OR "promotion" OR "deposit match" OR "receipt")'
$gmailQuery = "($fromQueryString) OR ($subjectQueryString)"

Write-Host "[INFO] Using Gmail Query: $gmailQuery"

# 3. Search Gmail
Write-Host "[INFO] Searching Gmail for matching messages..."
try {
    # Use gws CLI to search for messages. We only need the IDs.
    # Searches for emails in the last 7 days.
    $messages = gws gmail users messages list --params "
    {
        'userId': 'me',
        'q': '$($gmailQuery) newer_than:7d',
        'maxResults': 25
    }
    " | ConvertFrom-Json
} catch {
    Write-Host "[ERROR] Failed to search Gmail using the gws CLI: $_" -ForegroundColor Red
    Write-Host "[HINT] Ensure you are logged into Google and the gws CLI is configured correctly."
    exit 1
}

if (-not $messages.messages) {
    Write-Host "[INFO] No new promotional emails found. Exiting."
    exit 0
}

Write-Host "[INFO] Found $($messages.messages.Count) potential emails. Processing..."

# 4. Process each email
foreach ($messageHeader in $messages.messages) {
    $messageId = $messageHeader.id
    Write-Host "[INFO] Fetching email ID: $messageId..."
    
    try {
        $email = gws gmail users messages get --params "
        {
            'userId': 'me',
            'id': '$messageId',
            'format': 'full'
        }
        " | ConvertFrom-Json

        $subject = ($email.payload.headers | Where-Object { $_.name -eq 'Subject' }).value
        $from = ($email.payload.headers | Where-Object { $_.name -from 'From' }).value
        
        # Decode the email body (it's often base64)
        $bodyData = $email.payload.parts | Where-Object { $_.mimeType -eq 'text/plain' } | Select-Object -First 1
        if($bodyData.body.data) {
            $decodedBody = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($bodyData.body.data.Replace('-', '+').Replace('_', '/')))
        } else {
            # Fallback for non-base64 bodies
            $decodedBody = $bodyData.body
        }

        if (-not $decodedBody) {
            Write-Host "[WARN] Could not find plain text body for email ID: $messageId. Skipping." -ForegroundColor Yellow
            continue
        }

        Write-Host "[INFO]   From: $from"
        Write-Host "[INFO]   Subject: $subject"

        # 5. Ingest the data into the Trust Engine
        $ingestPayload = @{
            source = "gmail-agent";
            report = "From: $from`nSubject: $subject`n`n$decodedBody";
            source_metadata = @{
                gmail_message_id = $messageId
            }
        } | ConvertTo-Json -Depth 5

        Invoke-RestMethod -Uri "$apiBaseUrl/rgaas/trust/degen-intel" -Method Post -Body $ingestPayload -ContentType "application/json" -Headers @{
            "x-community-intel-key" = $apiKey
        }

        Write-Host "[SUCCESS] Ingested data for email ID: $messageId" -ForegroundColor Green

    } catch {
        Write-Host "[ERROR] Failed to process or ingest email ID: $messageId. Reason: $_" -ForegroundColor Red
    }
}

Write-Host "[INFO] Gmail Ingestion Agent finished."

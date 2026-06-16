<#
.SYNOPSIS
  Daily LinkedIn post automation — runs from local machine at 9:30 AM.
  Reads token from local file, uses browser for screenshots, posts to LinkedIn.

.DESCRIPTION
  1. Reads LinkedIn access token from ~/.linkedin-mcp-token.json
  2. Generates post content (HN stories + theme template)
  3. Takes a browser screenshot related to today's topic
  4. Uploads image + posts to LinkedIn
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $ProjectRoot "run-daily.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Write-Log {
  param([string]$Message)
  $line = "[$Timestamp] $Message"
  Write-Host $line
  Add-Content -Path $LogFile -Value $line
}

Write-Log "=== LinkedIn Daily Post Started ==="

# --- Step 1: Read local LinkedIn token ---
$TokenPath = Join-Path $env:USERPROFILE ".linkedin-mcp-token.json"
if (-not (Test-Path $TokenPath)) {
  Write-Log "ERROR: Token file not found at $TokenPath"
  Write-Log "Run 'opencode' and use the 'authenticate' tool first"
  exit 1
}

try {
  $TokenData = Get-Content $TokenPath -Raw | ConvertFrom-Json
  $expiry = ""
  if ($TokenData.expires_at) {
    $epoch = $TokenData.expires_at / 1000
    $origin = New-Object -Type DateTime -ArgumentList 1970, 1, 1, 0, 0, 0, 0
    $expiry = $origin.AddSeconds($epoch)
    if ((Get-Date) -gt $expiry) {
      Write-Log "WARNING: LinkedIn token expired at $expiry! Run 'opencode' and re-authenticate"
      exit 1
    }
    $expiry = $expiry.ToString("yyyy-MM-dd")
  }
  $env:LINKEDIN_ACCESS_TOKEN = $TokenData.access_token
  $env:LINKEDIN_PERSON_URN = "urn:li:person:RLnMVkx9Rc"
  Write-Log "Token loaded (expires: $expiry)"
} catch {
  Write-Log "ERROR: Failed to read token: $_"
  exit 1
}

# --- Step 2: Generate post and get topic keyword ---
Write-Log "Generating post content..."
try {
  $Preview = & "node" (Join-Path $ProjectRoot "src\index.mjs") "preview" 2>&1
  $PreviewText = ($Preview | Out-String)

  # Extract topic from first HN story in preview output
  # Format: N. "Story Title" https://... (N points)
  $Topic = "opencode"
  $QuoteMatch = [regex]::Match($PreviewText, '"([^"]+)"')
  if ($QuoteMatch.Success) {
    $StoryTitle = $QuoteMatch.Groups[1].Value
    Write-Log "Found HN story: '$StoryTitle'"
    # Pick first meaningful keyword from the title
    $Words = $StoryTitle -split '\s+'
    foreach ($Word in $Words) {
      $Clean = $Word.ToLower().TrimEnd(',.;:!?')
      if ($Clean.Length -gt 3 -and $Clean -notmatch '^(with|from|that|this|what|have|been|will|about|into|over|than|them|they|your)$') {
        $Topic = $Clean
        break
      }
    }
  } else {
    Write-Log "No story title found in preview, using 'opencode'"
  }

  Write-Log "Post topic determined: '$Topic'"
} catch {
  Write-Log "WARNING: Could not parse topic, using 'opencode': $_"
  $Topic = "opencode"
}

# --- Step 3: Capture browser screenshot ---
$ScreenshotPath = Join-Path $env:TEMP "linkedin-post-image.png"
Write-Log "Capturing browser screenshot for topic: '$Topic'..."

try {
  $CaptureResult = & "py" "-3.13" (Join-Path $ProjectRoot "capture-image.py") $Topic $ScreenshotPath 2>&1
  $CaptureJson = $CaptureResult | Where-Object { $_ -match '^\{"' } | Select-Object -Last 1
  
  if ($CaptureJson) {
    $CaptureData = $CaptureJson | ConvertFrom-Json
    if ($CaptureData.status -eq "captured") {
      Write-Log "Browser screenshot captured: $( [math]::Round((Get-Item $ScreenshotPath).Length / 1KB) ) KB"
      $env:LINKEDIN_IMAGE_PATH = $ScreenshotPath
    }
  }
} catch {
  Write-Log "WARNING: Browser capture failed: $_ (will use fallback)"
}

# --- Step 4: Post to LinkedIn ---
Write-Log "Posting to LinkedIn..."
try {
  & "node" (Join-Path $ProjectRoot "src\index.mjs") "post" 2>&1 | ForEach-Object { Write-Log $_ }
  Write-Log "=== ✅ Daily post published successfully ==="
} catch {
  Write-Log "ERROR: Failed to post: $_"
  exit 1
}

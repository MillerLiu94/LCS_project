$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $projectRoot ".env"
$outputFile = Join-Path $projectRoot "api\runtime-config.js"
$outputDirectory = Split-Path -Parent $outputFile
if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

if (-not (Test-Path -LiteralPath $environmentFile)) {
  throw "Missing preview/.env. Copy .env.example to .env and configure it first."
}

$environment = @{}
foreach ($line in Get-Content -LiteralPath $environmentFile) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
    $name = $matches[1]
    $value = $matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $environment[$name] = $value
  }
}

$useApiProxy = $environment.ContainsKey("API_USE_PROXY") -and
  $environment["API_USE_PROXY"].ToLowerInvariant() -in @("1", "true", "yes")
$apiBaseUrl = if ($useApiProxy) { "/api" }
  elseif ($environment.ContainsKey("API_BASE_URL")) { $environment["API_BASE_URL"] }
  else { "/api" }
$authorAccount = if ($environment.ContainsKey("MOCK_AUTHOR_ACCOUNT")) { $environment["MOCK_AUTHOR_ACCOUNT"] } else { "test1" }
$googleMapsApiKey = if ($environment.ContainsKey("GOOGLE_MAPS_API_KEY")) { $environment["GOOGLE_MAPS_API_KEY"] } else { "" }
if ($authorAccount -notmatch '^[A-Za-z0-9]+$') {
  throw "MOCK_AUTHOR_ACCOUNT must contain only English letters and numbers."
}

$runtimeConfig = @(
  "window.CommunityConfig = Object.freeze({"
  "  apiBaseUrl: $(ConvertTo-Json -InputObject $apiBaseUrl -Compress),"
  "  mockAuthorAccount: $(ConvertTo-Json -InputObject $authorAccount -Compress),"
  "  googleMapsApiKey: $(ConvertTo-Json -InputObject $googleMapsApiKey -Compress),"
  "  allowDesktopReportPreview: false"
) -join [Environment]::NewLine
$runtimeConfig += [Environment]::NewLine + "});"
[System.IO.File]::WriteAllText($outputFile, $runtimeConfig, [System.Text.UTF8Encoding]::new($false))
Write-Output "Generated api/runtime-config.js from API_BASE_URL, MOCK_AUTHOR_ACCOUNT, and GOOGLE_MAPS_API_KEY."

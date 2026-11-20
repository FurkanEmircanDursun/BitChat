param([switch]$SkipChecks, [switch]$Offline)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$appRoot = Join-Path $projectRoot 'app'
$taskSocketDirectory = Join-Path $env:SystemDrive 'bitchat-jtmp'
New-Item -ItemType Directory -Path $taskSocketDirectory -Force | Out-Null
$priorJavaOptions = $env:JAVA_TOOL_OPTIONS
try {
    $env:JAVA_TOOL_OPTIONS = "$priorJavaOptions -Djdk.net.unixdomain.tmpdir=$taskSocketDirectory".Trim()
    Push-Location $appRoot
    try {
        if (!(Test-Path -LiteralPath 'node_modules')) {
            & npm.cmd ci
            if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
        }
        if (!$SkipChecks) {
            & npm.cmd run typecheck
            if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed' }
            & npm.cmd test -- --watch=false
            if ($LASTEXITCODE -ne 0) { throw 'Tests failed' }
            & npm.cmd run lint
            if ($LASTEXITCODE -ne 0) { throw 'Lint failed' }
        }
        Push-Location 'android'
        try {
            $taskOfflineArguments = @()
            if ($Offline) {$taskOfflineArguments = @('--offline')}
            & .\gradlew.bat :app:assembleRelease --no-daemon --console=plain --max-workers=2 @taskOfflineArguments
            if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
        } finally {Pop-Location}
        $output = Join-Path $projectRoot 'deliverables'
        New-Item -ItemType Directory -Path $output -Force | Out-Null
        Copy-Item -LiteralPath 'android\app\build\outputs\apk\release\app-release.apk' -Destination (Join-Path $output 'BitChat-1.0.0.apk')
        Get-FileHash -LiteralPath (Join-Path $output 'BitChat-1.0.0.apk') -Algorithm SHA256
    } finally {Pop-Location}
} finally {$env:JAVA_TOOL_OPTIONS = $priorJavaOptions}

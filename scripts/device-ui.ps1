param(
    [ValidateSet('Dump','Tap','Text','Back','Screenshot','Scroll')][string]$Action = 'Dump',
    [string]$Value = '',
    [string]$Serial = 'emulator-5558'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$tempDirectory = Join-Path $projectRoot 'app/build/device-test'
New-Item -ItemType Directory -Path $tempDirectory -Force | Out-Null
function Read-DeviceUi {
    for ($taskAttempt = 0; $taskAttempt -lt 3; $taskAttempt++) {
        $taskDumpOutput = & adb -s $Serial shell uiautomator dump /sdcard/bitchat-ui.xml 2>&1
        if ($LASTEXITCODE -eq 0 -and ($taskDumpOutput -join "`n") -match 'dumped to:') {
            & adb -s $Serial pull /sdcard/bitchat-ui.xml (Join-Path $tempDirectory 'ui.xml') 2>$null | Out-Null
            if ($LASTEXITCODE -ne 0) {throw 'Could not read fresh device UI'}
            [xml]$document = Get-Content -LiteralPath (Join-Path $tempDirectory 'ui.xml') -Raw
            return $document
        }
        Start-Sleep -Milliseconds 400
    }
    throw 'Device UI is unavailable; no stale snapshot was used'
}
switch ($Action) {
    'Dump' {
        $document = Read-DeviceUi
        $document.SelectNodes('//node') | Where-Object {$_.'text' -or $_.'content-desc'} | ForEach-Object {"$($_.GetAttribute('text')) | $($_.GetAttribute('content-desc')) | $($_.GetAttribute('bounds'))"}
    }
    'Tap' {
        $document = Read-DeviceUi
        $nodes = $document.SelectNodes('//node')
        $target = $nodes | Where-Object {$_.'content-desc' -eq $Value} | Select-Object -First 1
        if (!$target) {$target = $nodes | Where-Object {$_.'text' -eq $Value} | Select-Object -First 1}
        if (!$target) {throw "Control not found: $Value"}
        $bounds = [regex]::Match($target.GetAttribute('bounds'),'\[(\d+),(\d+)\]\[(\d+),(\d+)\]')
        if (!$bounds.Success) {throw 'Invalid bounds'}
        if ([int]$bounds.Groups[3].Value -le [int]$bounds.Groups[1].Value -or [int]$bounds.Groups[4].Value -le [int]$bounds.Groups[2].Value) {throw "Control is outside the visible area: $Value"}
        $x = [int]( ([int]$bounds.Groups[1].Value + [int]$bounds.Groups[3].Value)/2 )
        $y = [int]( ([int]$bounds.Groups[2].Value + [int]$bounds.Groups[4].Value)/2 )
        & adb -s $Serial shell input tap $x $y
    }
    'Text' {
        if ($Value -notmatch '^[a-zA-Z0-9 .,:/\-]+$') {throw 'ADB text fixtures must be plain ASCII'}
        & adb -s $Serial shell input text ($Value.Replace(' ','%s'))
    }
    'Back' {& adb -s $Serial shell input keyevent 4}
    'Scroll' {& adb -s $Serial shell input swipe 540 1800 540 700 350}
    'Screenshot' {
        if ($Value -notmatch '^[a-zA-Z0-9_-]+$') {throw 'Use a simple screenshot name'}
        & adb -s $Serial shell screencap -p /sdcard/bitchat-screen.png
        & adb -s $Serial pull /sdcard/bitchat-screen.png (Join-Path $projectRoot "deliverables/screenshots/$Value.png")
    }
}

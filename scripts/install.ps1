# Installs remote-sessions on Windows and starts it: irm https://antonioleiva.com/remote-sessions/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$repo = 'antoniolg/remote-sessions'
$arch = if ([Environment]::Is64BitOperatingSystem -and $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }
$dir = Join-Path $env:LOCALAPPDATA 'Programs\remote-sessions'
$zip = Join-Path $env:TEMP 'remote-sessions.zip'

Write-Host "Downloading remote-sessions (windows/$arch)..."
Invoke-WebRequest "https://github.com/$repo/releases/latest/download/remote-sessions_windows_$arch.zip" -OutFile $zip
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Expand-Archive -Force $zip $dir
Remove-Item $zip

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $dir) {
  [Environment]::SetEnvironmentVariable('Path', "$userPath;$dir", 'User')
  $env:Path = "$env:Path;$dir"
}

Write-Host "Installed in $dir"
& (Join-Path $dir 'remote-sessions.exe') setup

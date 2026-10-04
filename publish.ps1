# Publishes the planner to GitHub Pages: bumps the offline-cache version in sw.js, commits everything, pushes.
#   .\publish.ps1                      -> commit message "Update <date>"
#   .\publish.ps1 "Drag to move tasks" -> your own message
#   .\publish.ps1 -RepoUrl https://github.com/you/sprout-planner   (first run only, otherwise it asks)
param(
  [string]$Message = '',
  [string]$RepoUrl = ''
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Invoke-Git {
  & git.exe @args
  if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') failed" }
}

# ---------- one-time setup: connect this folder to the GitHub repo ----------
if (-not (Test-Path .git)) {
  if (-not $RepoUrl) { $RepoUrl = Read-Host 'GitHub repo URL (e.g. https://github.com/you/sprout-planner)' }
  $RepoUrl = $RepoUrl.Trim().TrimEnd('/')
  if ($RepoUrl -notmatch '\.git$') { $RepoUrl += '.git' }
  Invoke-Git init -b main | Out-Null
  Invoke-Git config core.autocrlf false  # keep files exactly as they are, no Windows line-ending warnings
  Invoke-Git remote add origin $RepoUrl
  Write-Host 'Connecting to GitHub (a browser window may open to sign in)...'
  Invoke-Git fetch origin main
  # Take over the repo's history without touching the files here; the next commit records what changed.
  Invoke-Git reset origin/main | Out-Null
}

if (-not (git config user.name)) { git config user.name (Read-Host 'Your name for commits') }
if (-not (git config user.email)) { git config user.email (Read-Host 'Your email for commits (your GitHub email or its noreply address)') }

# ---------- publish ----------
git add -A
if (-not (git status --porcelain)) {
  Write-Host 'Nothing changed since the last publish.'
  exit 0
}

# New cache version, so installed copies on the iPad pick up the update.
$swPath = Join-Path $PSScriptRoot 'sw.js'
$sw = [IO.File]::ReadAllText($swPath)
$sw = [regex]::Replace($sw, "const CACHE = 'sprout-v(\d+)';", { param($m) "const CACHE = 'sprout-v$([int]$m.Groups[1].Value + 1)';" })
[IO.File]::WriteAllText($swPath, $sw)
$version = [regex]::Match($sw, "sprout-v\d+").Value

if (-not $Message) { $Message = 'Update ' + (Get-Date -Format 'yyyy-MM-dd HH:mm') }
git add -A
Invoke-Git commit -q -m $Message
Invoke-Git push -u origin main

Write-Host ''
Write-Host "Published ($version). GitHub Pages will update in about a minute."
Write-Host 'On the iPad: close the app fully and reopen it (maybe twice).'

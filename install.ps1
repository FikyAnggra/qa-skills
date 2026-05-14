# qa-skills Installer for Windows (PowerShell)
# Run this script from PowerShell to install qa-explorer skill to Claude/Cowork
#
# Usage:
#   .\install.ps1
#   .\install.ps1 -SkillName qa-explorer
#   .\install.ps1 -TargetDir "C:\custom\path\skills"

param(
    [string]$SkillName = "qa-explorer",
    [string]$TargetDir = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceDir = Join-Path $ScriptDir "skills\$SkillName"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  qa-skills Installer v1.0.0" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ── Validate source ──────────────────────────────────────────────────────────
if (-not (Test-Path $SourceDir)) {
    Write-Host "  [ERROR] Skill '$SkillName' not found at: $SourceDir" -ForegroundColor Red
    exit 1
}
Write-Host "  Source  : $SourceDir" -ForegroundColor Gray

# ── Find target skills directory ─────────────────────────────────────────────
if ($TargetDir -eq "") {
    $AppData = $env:APPDATA
    $UserProfile = $env:USERPROFILE

    # Possible locations — check in order of preference
    $candidates = @(
        # Cowork / Claude Code (AppData)
        (Join-Path $AppData "Claude\local-agent-mode-sessions\skills-plugin"),
        # Claude Code standard (~/.claude/skills)
        (Join-Path $UserProfile ".claude\skills"),
        # AppData Claude skills
        (Join-Path $AppData "Claude\skills"),
        # Local project
        (Join-Path (Get-Location) ".claude\skills")
    )

    $skillsPluginBase = $null
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            # If it's the skills-plugin folder, find the actual skills dir inside
            if ($candidate -like "*skills-plugin*") {
                # Find deepest skills/ folder inside
                $found = Get-ChildItem -Path $candidate -Recurse -Filter "skills" -Directory |
                    Where-Object { Test-Path (Join-Path $_.FullName "qa-plan") -or
                                   Test-Path (Join-Path $_.FullName "docx") } |
                    Select-Object -First 1
                if ($found) {
                    $TargetDir = $found.FullName
                    break
                }
            } else {
                $TargetDir = $candidate
                break
            }
        }
    }

    if ($TargetDir -eq "") {
        # Fallback: create in ~/.claude/skills
        $TargetDir = Join-Path $UserProfile ".claude\skills"
        Write-Host "  Auto-detect failed. Using default: $TargetDir" -ForegroundColor Yellow
    }
}

$DestDir = Join-Path $TargetDir $SkillName
Write-Host "  Target  : $DestDir" -ForegroundColor Gray
Write-Host ""

# ── Check if already installed ───────────────────────────────────────────────
if (Test-Path $DestDir) {
    Write-Host "  Existing installation found. Updating..." -ForegroundColor Yellow
} else {
    Write-Host "  Installing fresh..." -ForegroundColor Gray
}

# ── Copy files ───────────────────────────────────────────────────────────────
try {
    # Create destination directories
    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $DestDir "references") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $DestDir "scripts") -Force | Out-Null

    # Copy SKILL.md
    Copy-Item -Path (Join-Path $SourceDir "SKILL.md") -Destination $DestDir -Force
    Write-Host "  [OK] SKILL.md" -ForegroundColor Green

    # Copy references/
    $refs = @("mode-predev.md", "mode-postdev.md", "output-format.md")
    foreach ($ref in $refs) {
        $src = Join-Path $SourceDir "references\$ref"
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $DestDir "references") -Force
            Write-Host "  [OK] references/$ref" -ForegroundColor Green
        }
    }

    # Copy scripts/
    $scripts = @("inventory.js", "happy-path.js", "reporter.js", "xlsx-generator.js", "package.json")
    foreach ($script in $scripts) {
        $src = Join-Path $SourceDir "scripts\$script"
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $DestDir "scripts") -Force
            Write-Host "  [OK] scripts/$script" -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "  Skill '$SkillName' installed to:" -ForegroundColor Green
    Write-Host "  $DestDir" -ForegroundColor White

} catch {
    Write-Host ""
    Write-Host "  [ERROR] Installation failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Try running as Administrator, or specify target manually:" -ForegroundColor Yellow
    Write-Host '  .\install.ps1 -TargetDir "C:\path\to\skills"' -ForegroundColor Yellow
    exit 1
}

# ── MCP Playwright check ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Checking MCP Playwright..." -ForegroundColor Cyan

$claudeSettings = @(
    (Join-Path $env:USERPROFILE ".claude\settings.json"),
    (Join-Path $env:APPDATA "Claude\settings.json")
)

$mcpFound = $false
foreach ($settingsPath in $claudeSettings) {
    if (Test-Path $settingsPath) {
        $settings = Get-Content $settingsPath | ConvertFrom-Json
        $mcpServers = $settings.mcpServers
        if ($mcpServers) {
            $playwrightKey = $mcpServers.PSObject.Properties.Name |
                Where-Object { $_ -like "*playwright*" } |
                Select-Object -First 1
            if ($playwrightKey) {
                Write-Host "  [OK] MCP Playwright ditemukan: '$playwrightKey'" -ForegroundColor Green
                $mcpFound = $true
                break
            }
        }
    }
}

if (-not $mcpFound) {
    Write-Host "  [!] MCP Playwright tidak ditemukan." -ForegroundColor Yellow
    Write-Host "      Mode 2 (browser exploration) akan menggunakan bundled scripts." -ForegroundColor Gray
    Write-Host ""
    $answer = Read-Host "  Install MCP Playwright sekarang? (y/n)"
    if ($answer -eq "y" -or $answer -eq "Y") {
        Write-Host "  Installing MCP Playwright..." -ForegroundColor Cyan
        try {
            & claude mcp add playwright npx "@playwright/mcp@latest"
            Write-Host "  [OK] MCP Playwright installed! Restart Claude Code/Cowork." -ForegroundColor Green
        } catch {
            Write-Host "  [FAIL] Auto-install gagal. Install manual:" -ForegroundColor Red
            Write-Host '  claude mcp add playwright npx "@playwright/mcp@latest"' -ForegroundColor White
        }
    } else {
        Write-Host "  Skipped. Skill akan menggunakan bundled scripts (node scripts/inventory.js)." -ForegroundColor Gray
    }
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Installation selesai!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Cara pakai (ketik ke Claude/Cowork):" -ForegroundColor White
Write-Host '  "Buat test case dari PRD ini: [paste PRD]"' -ForegroundColor Gray
Write-Host '  "Explore dan test https://app.example.com"' -ForegroundColor Gray
Write-Host '  "Generate test case format xlsx untuk fitur login"' -ForegroundColor Gray
Write-Host ""
Write-Host "  PENTING: Restart Claude Code / Cowork agar skill aktif." -ForegroundColor Yellow
Write-Host ""

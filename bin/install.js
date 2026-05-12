#!/usr/bin/env node
/**
 * qa-skills Custom Installer
 *
 * Handles:
 * 1. Detecting if MCP Playwright is already configured
 * 2. Offering to install MCP Playwright if not found
 * 3. Copying skill files to the target directory
 * 4. Showing platform-specific manual instructions for non-Claude Code environments
 *
 * Usage:
 *   node bin/install.js [options]
 *   npx qa-skills install [skill-name]
 *
 * Options:
 *   --skill <name>    Skill to install (default: qa-explorer)
 *   --target <path>   Target directory (default: ~/.claude/skills or .claude/skills)
 *   --platform <p>    Platform: claude-code|cowork|opencode|cursor (default: auto-detect)
 *   --no-mcp-prompt   Skip MCP Playwright prompt
 *   --verbose         Verbose output
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');
const readline = require('readline');

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const config = {
  skill: getArg('--skill') || args.find(a => !a.startsWith('--')) || 'qa-explorer',
  target: getArg('--target'),
  platform: getArg('--platform') || 'auto',
  noMcpPrompt: hasFlag('--no-mcp-prompt'),
  verbose: hasFlag('--verbose'),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const log = (...msg) => console.log(...msg);
const verbose = (...msg) => config.verbose && console.log('  [verbose]', ...msg);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const err = (msg) => console.error(`  ❌ ${msg}`);

function rl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(question) {
  return new Promise((resolve) => {
    const iface = rl();
    iface.question(question, (answer) => {
      iface.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─── MCP Detection ───────────────────────────────────────────────────────────

/**
 * Check if MCP Playwright is configured in Claude Code settings.
 * Checks ~/.claude/settings.json and ./.claude/settings.json
 */
function checkMcpPlaywright() {
  const settingsPaths = [
    path.join(os.homedir(), '.claude', 'settings.json'),
    path.join(process.cwd(), '.claude', 'settings.json'),
    path.join(os.homedir(), '.config', 'claude', 'settings.json'),
  ];

  for (const settingsPath of settingsPaths) {
    if (!fs.existsSync(settingsPath)) continue;

    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const mcpServers = settings?.mcpServers || {};
      const keys = Object.keys(mcpServers);

      verbose(`Checking ${settingsPath}: ${keys.length} MCP server(s)`);

      const playwrightMcp = keys.find(key =>
        key.toLowerCase().includes('playwright') ||
        (mcpServers[key]?.command || '').includes('playwright')
      );

      if (playwrightMcp) {
        return { found: true, name: playwrightMcp, path: settingsPath };
      }
    } catch (e) {
      verbose(`Error reading ${settingsPath}: ${e.message}`);
    }
  }

  return { found: false };
}

/**
 * Attempt to install MCP Playwright via `claude mcp add`
 */
async function installMcpPlaywright() {
  log('\n  📦 Installing MCP Playwright...');

  // Check if `claude` CLI is available
  const claudeCheck = spawnSync('claude', ['--version'], { stdio: 'pipe' });
  if (claudeCheck.error) {
    warn('`claude` CLI not found. Cannot auto-install MCP Playwright.');
    log('  → Install manually:');
    log('    claude mcp add playwright npx @playwright/mcp@latest');
    log('    or: npx @anthropic-ai/claude-code mcp add playwright npx @playwright/mcp@latest');
    return false;
  }

  try {
    execSync('claude mcp add playwright npx @playwright/mcp@latest', { stdio: 'inherit' });
    ok('MCP Playwright installed successfully!');
    log('  → Restart Claude Code for changes to take effect.');
    return true;
  } catch (e) {
    warn(`Auto-install failed: ${e.message}`);
    log('  → Try manually:');
    log('    claude mcp add playwright npx @playwright/mcp@latest');
    return false;
  }
}

/**
 * Prompt user about MCP Playwright installation
 */
async function promptMcpInstall() {
  if (config.noMcpPrompt) return;

  const mcpStatus = checkMcpPlaywright();

  if (mcpStatus.found) {
    ok(`MCP Playwright already configured ("${mcpStatus.name}") — skipping`);
    return;
  }

  log('\n  ℹ️  MCP Playwright tidak ditemukan di konfigurasi Claude Code.');
  log('     MCP Playwright dibutuhkan untuk Mode 2 (eksplorasi browser langsung).');
  log('     Tanpa MCP, skill akan menggunakan bundled scripts sebagai fallback.\n');

  const answer = await ask('  ? Install MCP Playwright sekarang? (y/n) → ');

  if (answer === 'y' || answer === 'yes') {
    await installMcpPlaywright();
  } else {
    log('  → Dilewati. Skill akan menggunakan bundled scripts (node scripts/inventory.js).');
    log('  → Untuk install nanti: claude mcp add playwright npx @playwright/mcp@latest');
  }
}

// ─── Platform Detection ──────────────────────────────────────────────────────

function detectPlatform() {
  if (config.platform !== 'auto') return config.platform;

  // Check for Claude Code
  const claudeCheck = spawnSync('claude', ['--version'], { stdio: 'pipe' });
  if (!claudeCheck.error) {
    verbose('Detected: Claude Code (claude CLI available)');
    return 'claude-code';
  }

  // Check for environment variables
  if (process.env.CLAUDE_COWORK) return 'cowork';
  if (process.env.OPENCODE) return 'opencode';
  if (process.env.VSCODE_PID) return 'vscode';

  return 'unknown';
}

// ─── Skill File Installer ────────────────────────────────────────────────────

/**
 * Find the source skill directory
 */
function findSkillSource(skillName) {
  const candidates = [
    path.join(__dirname, '..', 'skills', skillName),
    path.join(process.cwd(), 'skills', skillName),
    path.join(os.homedir(), '.qa-skills', 'skills', skillName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Determine target installation directory
 */
function resolveTarget(platform) {
  if (config.target) return config.target;

  const targets = {
    'claude-code': path.join(os.homedir(), '.claude', 'skills'),
    'cowork': path.join(os.homedir(), '.claude', 'skills'),
    'opencode': path.join(os.homedir(), '.opencode', 'skills'),
    'vscode': path.join(process.cwd(), '.claude', 'skills'),
    'cursor': path.join(process.cwd(), '.cursor', 'skills'),
    'unknown': path.join(process.cwd(), '.claude', 'skills'),
  };

  return targets[platform] || targets['unknown'];
}

/**
 * Recursively copy directory
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      verbose(`Copied: ${destPath}`);
    }
  }
}

/**
 * Install skill files to target directory
 */
function installSkillFiles(skillName, platform) {
  const skillSource = findSkillSource(skillName);
  if (!skillSource) {
    err(`Skill "${skillName}" not found in skills/ directory`);
    return false;
  }

  const targetDir = resolveTarget(platform);
  const targetSkillDir = path.join(targetDir, skillName);

  log(`\n  📂 Installing skill files...`);
  verbose(`Source: ${skillSource}`);
  verbose(`Target: ${targetSkillDir}`);

  try {
    // Check if already installed
    if (fs.existsSync(targetSkillDir)) {
      const answer = process.env.CI ? 'y' : null;
      // In non-interactive mode, overwrite
      log(`  ↻  Existing installation found at: ${targetSkillDir}`);
      log(`     Updating...`);
    }

    copyDir(skillSource, targetSkillDir);
    ok(`Skill "${skillName}" installed to: ${targetSkillDir}`);
    return true;
  } catch (e) {
    err(`Installation failed: ${e.message}`);
    return false;
  }
}

// ─── Post-Install Instructions ───────────────────────────────────────────────

function showInstructions(skillName, platform, mcpInstalled) {
  log('\n' + '─'.repeat(55));
  log(`\n🎉 qa-skills: ${skillName} berhasil diinstall!\n`);
  log('─'.repeat(55));

  if (platform === 'claude-code' || platform === 'cowork') {
    log('\n📌 Cara menggunakan di Claude Code / Cowork:');
    log(`   Skill otomatis aktif — cukup ketik permintaan seperti:`);
    log(`   "Buat test case dari PRD ini [paste PRD]"`);
    log(`   "Explore dan buat test case untuk https://app.example.com"`);
    log(`   "Bandingkan gap antara dua file test case ini"`);
  }

  if (platform === 'opencode') {
    log('\n📌 Cara menggunakan di OpenCode:');
    log(`   Skill tersimpan di ~/.opencode/skills/${skillName}/`);
    log(`   Gunakan dengan: /skill ${skillName}`);
    log(`   Atau tambahkan ke opencode.config.json:`);
    log(`   { "skills": ["${skillName}"] }`);
  }

  if (platform === 'vscode' || platform === 'cursor') {
    log(`\n📌 Cara menggunakan di ${platform === 'vscode' ? 'VS Code (Copilot)' : 'Cursor'}:`);
    log(`   Skill tersimpan di .claude/skills/${skillName}/`);
    log(`   Rujuk manual dokumentasi platform untuk aktivasi skill.`);
  }

  if (platform === 'unknown') {
    log('\n📌 Skill tersimpan di: .claude/skills/' + skillName + '/');
    log('   Rujuk dokumentasi platform kamu untuk cara mengaktifkan skill.');
  }

  log('\n📂 Tiga mode yang tersedia:');
  log('   Mode 1 (pre-dev)  → Berikan PRD/dokumen → test case @unverified');
  log('   Mode 2 (post-dev) → Berikan URL → eksplorasi browser → @verified');
  log('   Mode 3 (gap only) → Berikan 2 file test case → gap report');

  if (!mcpInstalled) {
    log('\n⚠️  MCP Playwright tidak terinstall.');
    log('   Mode 2 akan menggunakan bundled scripts (lebih lambat).');
    log('   Install MCP untuk performa terbaik:');
    log('   → claude mcp add playwright npx @playwright/mcp@latest');
  }

  log('\n📖 Dokumentasi: https://github.com/tim-kamu/qa-skills');
  log('🐛 Issues: https://github.com/tim-kamu/qa-skills/issues');
  log('\n' + '─'.repeat(55) + '\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('\n' + '='.repeat(55));
  log('  🧪 qa-skills Installer v1.0.0');
  log('='.repeat(55));

  const platform = detectPlatform();
  log(`\n  🖥️  Platform terdeteksi: ${platform}`);

  const skillName = config.skill;
  log(`  📦 Skill: ${skillName}`);

  // Step 1: Install skill files
  const installed = installSkillFiles(skillName, platform);
  if (!installed) {
    process.exit(1);
  }

  // Step 2: Handle MCP Playwright (only relevant for Claude Code / Cowork)
  let mcpInstalled = false;
  if (platform === 'claude-code' || platform === 'cowork' || platform === 'unknown') {
    const mcpStatus = checkMcpPlaywright();
    mcpInstalled = mcpStatus.found;
    await promptMcpInstall();

    // Re-check after potential install
    const mcpRecheck = checkMcpPlaywright();
    mcpInstalled = mcpRecheck.found;
  }

  // Step 3: Show usage instructions
  showInstructions(skillName, platform, mcpInstalled);
}

main().catch(e => {
  console.error('Installer error:', e.message);
  process.exit(1);
});

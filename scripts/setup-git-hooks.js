#!/usr/bin/env node
/**
 * Auto-install repo git hooks via core.hooksPath.
 * Runs as part of `npm install` postinstall.
 * Tolerant: silently skips if not in a git working tree (e.g. tarball install on CI).
 *
 * See ADR-014 in Writerside/topics/decision-log.md.
 */

const { execSync } = require('node:child_process');

try {
  // Probe: are we in a git context?
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
} catch {
  // Not a git checkout (npm-pack tarball, sandboxed CI scratch, etc.) — skip silently.
  process.exit(0);
}

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  console.log('✅ Git hooks path set to .githooks (force-push to master blocked locally; see ADR-014).');
} catch (err) {
  console.warn('⚠️  Could not set git core.hooksPath:', err.message);
  // Non-fatal — npm install should still succeed.
  process.exit(0);
}

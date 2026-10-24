// Player-facing version "MAJOR.MINOR.PATCH" (rules: docs/versioning.md).
// MAJOR.MINOR come from package.json; PATCH adds the number of main commits since
// the version line last changed, skipping docs-only "[skip ci]" commits.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

export function parseVersion(text) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(text).trim());
  if (!m) throw Error('package.json version must be MAJOR.MINOR.PATCH: ' + text);
  return m.slice(1).map(Number);
}
export function formatVersion([major, minor, patch], commits) {
  return major + '.' + minor + '.' + (patch + commits);
}
export function appVersion(root = process.cwd()) {
  const base = parseVersion(JSON.parse(readFileSync(root + '/package.json', 'utf8')).version);
  try {
    const since = git(['log', '-1', '--format=%H', '-G', '"version":', '--', 'package.json'], root);
    if (!since) return formatVersion(base, 0);
    const count = git(['rev-list', '--count', '--first-parent', '--fixed-strings', '--invert-grep', '--grep=[skip ci]', since + '..HEAD'], root);
    return formatVersion(base, Number(count) || 0);
  } catch { return formatVersion(base, 0); /* Shallow clones and source archives show the package version. */ }
}
if (import.meta.url === 'file://' + process.argv[1]) console.log(appVersion());

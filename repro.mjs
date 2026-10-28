// Builds the host in fresh processes and lists the output files whose names changed.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const vite = join('node_modules', 'vite', 'bin', 'vite.js');

function build(outDir, entry) {
  execFileSync(
    process.execPath,
    [vite, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'silent'],
    { env: { ...process.env, ENTRY: entry }, stdio: 'inherit' }
  );
  return readdirSync(outDir, { recursive: true })
    .filter((file) => statSync(join(outDir, file)).isFile())
    .sort();
}

// The scope key is the long number after `__mf_owner__`; short numbers are per-process counters.
function scopeKeys(outDir, files) {
  const keys = new Set();
  for (const file of files) {
    const text = file + readFileSync(join(outDir, file), 'utf8');
    for (const match of text.matchAll(/__mf_owner__(\d{6,})/g)) keys.add(match[1]);
  }
  return [...keys].join(', ');
}

function compare(label, entryA, entryB, [dirA, dirB]) {
  const a = build(dirA, entryA);
  const b = build(dirB, entryB);
  const renamed = a.filter((file) => !b.includes(file));
  console.log(`\n${label}: ${entryA} vs ${entryB}`);
  console.log(`scope key: ${scopeKeys(dirA, a)} vs ${scopeKeys(dirB, b)}`);
  console.log(`renamed: ${renamed.length} of ${a.length}`);
  for (const file of renamed) console.log(`  ${file}`);
}

compare('only filename differs', 'remoteEntry.aaaaaaaa.js', 'remoteEntry.bbbbbbbb.js', ['dist-a', 'dist-b']);
compare('control, same filename', 'remoteEntry.aaaaaaaa.js', 'remoteEntry.aaaaaaaa.js', ['dist-c', 'dist-d']);

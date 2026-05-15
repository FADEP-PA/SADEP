import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = resolve(repoRoot, 'apps', 'frontend');

const targets = [
  resolve(frontendDir, '.next'),
  resolve(frontendDir, 'tsconfig.tsbuildinfo'),
];

function assertInsideFrontend(target) {
  const relativeTarget = relative(frontendDir, target);

  if (
    relativeTarget === '' ||
    relativeTarget.startsWith('..') ||
    relativeTarget.includes(`..${sep}`)
  ) {
    throw new Error(`Refusing to remove path outside frontend workspace: ${target}`);
  }
}

for (const target of targets) {
  assertInsideFrontend(target);

  if (!existsSync(target)) {
    console.log(`Skipped missing ${relative(repoRoot, target)}`);
    continue;
  }

  await rm(target, { force: true, recursive: true });
  console.log(`Removed ${relative(repoRoot, target)}`);
}

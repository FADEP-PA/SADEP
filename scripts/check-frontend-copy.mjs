import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = resolve(repoRoot, 'apps', 'frontend');
const scanRoots = [
  resolve(frontendRoot, 'src'),
  resolve(frontendRoot, 'README.md'),
];

const scannedExtensions = new Set(['.css', '.ts', '.tsx', '.md']);
const ignoredDirectories = new Set(['.next', 'node_modules']);

const forbiddenPatterns = [
  {
    pattern: /\bAEP-PA\b|\bAEP PA\b/g,
    message: 'Use SADEP em texto frontend atual; AEP-PA deve ficar restrito a legado/historico.',
  },
  {
    pattern: /Lorem ipsum/gi,
    message: 'Remova texto lorem ipsum do frontend.',
  },
  {
    pattern: /\bTODO\b/g,
    message: 'Nao exponha marcador TODO no frontend versionado.',
  },
  {
    pattern: /em breve/gi,
    message: 'Prefira estado institucional especifico a texto generico "em breve".',
  },
  {
    pattern: /placeholder generico|placeholder gen[eé]rico/gi,
    message: 'Evite descrever telas atuais como placeholder generico.',
  },
  {
    pattern: /role-placeholder|technical-home__link-button|operations-hero__placeholder|operations-panel-placeholder|supervisor-dashboard__placeholder/g,
    message: 'Scaffold ou classe placeholder legada ainda referenciada no frontend.',
  },
  {
    pattern: /P[aá]ginas placeholder|placeholders por perfil/gi,
    message: 'A documentacao frontend deve diferenciar areas reais, demonstrativas e futuras.',
  },
];

async function collectFiles(target) {
  const entries = await readdir(target, { withFileTypes: true }).catch(async () => null);

  if (!entries) {
    return [target];
  }

  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await collectFiles(join(target, entry.name)));
      }
      continue;
    }

    if (entry.isFile() && scannedExtensions.has(extname(entry.name))) {
      files.push(join(target, entry.name));
    }
  }

  return files;
}

function getLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

const files = (await Promise.all(scanRoots.map((root) => collectFiles(root)))).flat();
const findings = [];

for (const file of files) {
  if (!scannedExtensions.has(extname(file))) {
    continue;
  }

  const content = await readFile(file, 'utf8');

  for (const { pattern, message } of forbiddenPatterns) {
    pattern.lastIndex = 0;

    for (const match of content.matchAll(pattern)) {
      findings.push({
        file: relative(repoRoot, file),
        line: getLineNumber(content, match.index ?? 0),
        text: match[0],
        message,
      });
    }
  }
}

if (findings.length > 0) {
  console.error('Frontend copy/scaffold check failed:');

  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} "${finding.text}" — ${finding.message}`,
    );
  }

  process.exit(1);
}

console.log(`Frontend copy/scaffold check passed (${files.length} files scanned).`);

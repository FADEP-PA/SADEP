import { spawnSync } from 'node:child_process';
import path from 'node:path';

type NodeProcessInfo = {
  ProcessId?: number;
  ParentProcessId?: number;
  CommandLine?: string;
};

type RiskMatch = {
  processId: number;
  commandLine: string;
  reason: string;
};

const CURRENT_PROCESS_ID = process.pid;
const BACKEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..', '..');

function main() {
  if (process.platform !== 'win32') {
    return;
  }

  const processes = listNodeProcesses();
  const currentProcessTreeIds = resolveCurrentProcessTreeIds(processes);
  const riskyProcesses = processes
    .filter((nodeProcess) => !currentProcessTreeIds.has(getProcessId(nodeProcess)))
    .map(classifyRisk)
    .filter((match): match is RiskMatch => match !== null);

  if (riskyProcesses.length === 0) {
    return;
  }

  console.error('[prisma:generate] Execucao bloqueada no Windows para evitar EPERM no Prisma Client.');
  console.error(
    '[prisma:generate] Foram detectados processos Node relacionados ao backend/Prisma que podem estar segurando o engine nativo.',
  );
  console.error('');
  console.error('Processos detectados:');

  for (const riskyProcess of riskyProcesses) {
    console.error(`- PID ${riskyProcess.processId}: ${riskyProcess.reason}`);
    console.error(`  ${riskyProcess.commandLine}`);
  }

  console.error('');
  console.error('Feche os terminais/processos de backend, testes ou comandos Prisma listados acima e rode novamente:');
  console.error('  npm run prisma:generate --workspace @sadep/backend');
  console.error('');
  console.error('Para inspecionar manualmente no PowerShell:');
  console.error('  Get-CimInstance Win32_Process -Filter "name = \'node.exe\'" | Select-Object ProcessId,CommandLine');
  console.error('');
  console.error('Este guard nao encerra processos automaticamente e nao apaga arquivos temporarios do Prisma.');

  process.exitCode = 1;
}

function listNodeProcesses(): NodeProcessInfo[] {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Get-CimInstance Win32_Process -Filter "name = \'node.exe\'" | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress',
    ],
    { encoding: 'utf-8' },
  );

  if (result.error || result.status !== 0) {
    console.warn('[prisma:generate] Nao foi possivel consultar processos Node no Windows.');
    if (result.error) {
      console.warn(`[prisma:generate] Detalhe: ${result.error.message}`);
    }
    if (result.stderr.trim()) {
      console.warn(`[prisma:generate] Detalhe: ${result.stderr.trim()}`);
    }
    return [];
  }

  const output = result.stdout.trim();

  if (!output) {
    return [];
  }

  try {
    const parsed = JSON.parse(output) as NodeProcessInfo | NodeProcessInfo[];
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.warn('[prisma:generate] Nao foi possivel interpretar a lista de processos Node no Windows.');
    if (error instanceof Error) {
      console.warn(`[prisma:generate] Detalhe: ${error.message}`);
    }
    return [];
  }
}

function resolveCurrentProcessTreeIds(processes: NodeProcessInfo[]): Set<number> {
  const ids = new Set<number>([CURRENT_PROCESS_ID]);
  const byProcessId = new Map<number, NodeProcessInfo>();

  for (const nodeProcess of processes) {
    byProcessId.set(getProcessId(nodeProcess), nodeProcess);
  }

  let current = byProcessId.get(CURRENT_PROCESS_ID);

  while (current) {
    const parentId = getParentProcessId(current);

    if (!parentId || ids.has(parentId)) {
      break;
    }

    ids.add(parentId);
    current = byProcessId.get(parentId);
  }

  return ids;
}

function classifyRisk(nodeProcess: NodeProcessInfo): RiskMatch | null {
  const processId = getProcessId(nodeProcess);
  const commandLine = nodeProcess.CommandLine?.trim();

  if (!processId || !commandLine) {
    return null;
  }

  const normalized = normalize(commandLine);
  const relatedToWorkspace = includesPath(normalized, BACKEND_ROOT) || includesPath(normalized, REPO_ROOT);

  if (matchesAny(normalized, ['src/main.ts', 'src\\main.ts'])) {
    return {
      processId,
      commandLine,
      reason: 'runtime do backend em execucao',
    };
  }

  if (matchesAny(normalized, ['src/processes/tests/run.ts', 'src\\processes\\tests\\run.ts'])) {
    return {
      processId,
      commandLine,
      reason: 'runner de testes integrados do backend em execucao',
    };
  }

  if (
    relatedToWorkspace &&
    matchesAny(normalized, ['scripts/prepare-local-sqlite.ts', 'scripts\\prepare-local-sqlite.ts'])
  ) {
    return {
      processId,
      commandLine,
      reason: 'script operacional do backend usando Prisma Client',
    };
  }

  if (relatedToWorkspace && matchesAny(normalized, ['scripts/check-database.ts', 'scripts\\check-database.ts'])) {
    return {
      processId,
      commandLine,
      reason: 'checagem de banco usando Prisma Client',
    };
  }

  if (relatedToWorkspace && matchesAny(normalized, ['prisma/seed.ts', 'prisma\\seed.ts'])) {
    return {
      processId,
      commandLine,
      reason: 'seed usando Prisma Client',
    };
  }

  if (relatedToWorkspace && matchesAny(normalized, ['jest', 'jest.config.js'])) {
    return {
      processId,
      commandLine,
      reason: 'suite de testes do backend em execucao',
    };
  }

  if (
    relatedToWorkspace &&
    matchesAny(normalized, ['prisma/build/index.js', 'node_modules/prisma/build/index.js'])
  ) {
    return {
      processId,
      commandLine,
      reason: 'comando Prisma concorrente em execucao',
    };
  }

  if (
    relatedToWorkspace &&
    matchesAny(normalized, ['@sadep/backend']) &&
    matchesAny(normalized, ['start', 'test', 'bootstrap', 'prisma'])
  ) {
    return {
      processId,
      commandLine,
      reason: 'script npm do backend potencialmente concorrente',
    };
  }

  return null;
}

function getProcessId(nodeProcess: NodeProcessInfo): number {
  return Number(nodeProcess.ProcessId ?? 0);
}

function getParentProcessId(nodeProcess: NodeProcessInfo): number {
  return Number(nodeProcess.ParentProcessId ?? 0);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\\/g, '/');
}

function includesPath(commandLine: string, absolutePath: string): boolean {
  return commandLine.includes(normalize(absolutePath));
}

function matchesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(normalize(needle)));
}

main();

import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../assets/document-templates/', import.meta.url);
const destination = new URL('../dist/apps/backend/assets/document-templates/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ['caso-2-original.pdf', 'parecer-original.docx', 'notificacao-original.docx']) {
  await copyFile(fileURLToPath(new URL(name, source)), fileURLToPath(new URL(name, destination)));
}

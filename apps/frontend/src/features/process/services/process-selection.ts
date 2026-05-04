export function getInitialTechnicalProcessId() {
  return process.env.NEXT_PUBLIC_TECHNICAL_PROCESS_ID?.trim() || '';
}

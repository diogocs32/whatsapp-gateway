// Espelha os enums Prisma (mesmos literais — compatível estruturalmente).
export const SESSION_STATUSES = [
  'STOPPED',
  'STARTING',
  'SCAN_QR_CODE',
  'PAIRING_CODE',
  'WORKING',
  'FAILED',
  'DEGRADED',
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ENGINES = ['BAILEYS', 'WWEBJS'] as const;
export type Engine = (typeof ENGINES)[number];

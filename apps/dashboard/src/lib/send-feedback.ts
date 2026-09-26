// Retorno do "Enviar" do painel (Inbox e Atendimento) — puro, testável em node.
import type { SessionStatus } from '@contracts';

// Aparelho em que o gateway NÃO consegue enviar agora (o envio voltaria 400 "Sessão não iniciada").
// DEGRADED continua enviando (é o watchdog avisando de lentidão), por isso não bloqueia.
const OFFLINE: Partial<Record<SessionStatus, string>> = {
  STOPPED: 'desligado',
  STARTING: 'ainda iniciando',
  SCAN_QR_CODE: 'esperando a leitura do QR',
  PAIRING_CODE: 'esperando o código de pareamento',
  FAILED: 'com falha',
};

// Motivo para travar a caixa de resposta (ou o ➤ do encaminhar — E25), ou null (pode enviar).
// Aparelho desconhecido → null: deixa tentar e o gateway responde.
export function deviceBlockReason(
  device: { name: string; status: SessionStatus } | null | undefined,
  action: 'responda' | 'encaminhe' = 'responda',
): string | null {
  const state = device ? OFFLINE[device.status] : undefined;
  return state
    ? `O aparelho ${device!.name} está ${state} — ${action} pelo celular ou conecte-o em Sessões.`
    : null;
}

// Erro do envio em linguagem de operador, para aparecer JUNTO da caixa de resposta. `status`
// ausente = a requisição nem chegou (rede). A intenção do envio (idempotencyKey) é reaproveitada no
// retry — tentar de novo não duplica.
export function sendErrorMessage(
  err: { status?: number; message?: string } | null | undefined,
  deviceName: string,
): string {
  const msg = (err?.message ?? '').trim();
  const status = err?.status;
  if (status === 400 && /sess[aã]o n[aã]o iniciada/i.test(msg)) {
    return `Não enviada: o aparelho ${deviceName} não está conectado a este servidor. O texto ficou no campo.`;
  }
  if (status === 423) {
    return `Não enviada: ${msg || 'o aparelho está em quarentena (guard-rail)'}. O texto ficou no campo.`;
  }
  if (status === 429) {
    return 'Não enviada: muitas requisições agora — espere um minuto e tente de novo. O texto ficou no campo.';
  }
  if (!status) {
    return 'Não enviada: sem conexão com o servidor. O texto ficou no campo — tentar de novo não duplica.';
  }
  return `Não enviada: ${msg || `erro ${status}`}. O texto ficou no campo — tentar de novo não duplica.`;
}

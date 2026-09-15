import type { TriageStatus } from '../domain/inbox.repository';

// Entrada mínima para decidir a cor do semáforo — só o que vem da consulta agregada.
export interface TriageInput {
  lastFromMe: boolean;
  lastInboundKeyId: string | null;
  lastInboundTimestamp: Date | null;
  triageKeyId: string | null;
  triageTimestamp: Date | null;
}

// Semáforo da caixa única. Função PURA — o estado vem dos dados, não de flag guardada:
//
//   1. última mensagem é MINHA           → 🟢 answered (respondi — pelo painel OU pelo celular)
//   2. amarelo ancorado na entrada ATUAL → 🟡 ignored  (marquei "não preciso responder")
//   3. resto                             → 🔴 pending  (precisa responder)
//
// A regra de ouro (dono, 15/09/2026): mensagem NOVA de entrada sempre devolve para 🔴 — estivesse
// 🟡 ou 🟢. Isso cai de graça aqui: responder muda o `lastFromMe` (2 nunca é avaliado) e uma
// entrada nova muda o `lastInboundKeyId`, que deixa de casar com a âncora do amarelo. Nenhum job
// de limpeza é necessário — a marca velha simplesmente para de valer.
export function deriveTriageStatus(input: TriageInput): TriageStatus {
  if (input.lastFromMe) return 'answered';
  if (isTriageAnchorCurrent(input)) return 'ignored';
  return 'pending';
}

// A marca amarela vale só para a mensagem de entrada que estava por último no clique. Compara pelo
// keyId (identidade exata da mensagem); sem keyId de um dos lados, cai no timestamp — a marca
// resiste enquanto não chegar entrada MAIS NOVA que ela.
function isTriageAnchorCurrent(input: TriageInput): boolean {
  if (!input.triageTimestamp) return false;
  if (input.triageKeyId && input.lastInboundKeyId) {
    return input.triageKeyId === input.lastInboundKeyId;
  }
  if (!input.lastInboundTimestamp) return true;
  return (
    input.triageTimestamp.getTime() >= input.lastInboundTimestamp.getTime()
  );
}

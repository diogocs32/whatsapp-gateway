import type { MessageUpsertType, WAMessage } from '@whiskeysockets/baileys';

// A rc14 usa append tanto para a fila offline quanto para o eco do sendMessage. A decisão
// precisa ser por mensagem: o type do lote não distingue o conteúdo de cada chave.
export const OFFLINE_UPSERT_MAX_AGE_SECONDS = 48 * 60 * 60;
const MAX_FUTURE_SECONDS = 5 * 60;

export function shouldAcceptUpsert(
  message: WAMessage,
  type: MessageUpsertType,
  nowSeconds: number,
): boolean {
  if (type !== 'notify' && type !== 'append') return false;
  const { key } = message;
  const jid = key?.remoteJid ?? '';
  if (
    !key?.id ||
    !jid ||
    jid === 'status@broadcast' ||
    jid.endsWith('@newsletter')
  ) {
    return false;
  }
  if (type === 'notify') return true;
  // append de fromMe inclui o eco de TODO envio nosso (emitOwnEvents=true). A E7 recupera
  // recebidas de terceiros; mensagens nossas digitadas offline no celular ficam para backfill.
  if (key.fromMe) return false;
  const timestamp = Number(message.messageTimestamp ?? 0);
  return (
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    timestamp >= nowSeconds - OFFLINE_UPSERT_MAX_AGE_SECONDS &&
    timestamp <= nowSeconds + MAX_FUTURE_SECONDS
  );
}

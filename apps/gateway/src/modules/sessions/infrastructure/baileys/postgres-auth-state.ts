import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
} from '@whiskeysockets/baileys';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PostgresSessionLease } from '../postgres-session-lease';

// Serializa/desserializa via BufferJSON (encoda Buffers) para guardar em jsonb.
function encode(value: unknown): any {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
}
function decode<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;
}

// Custom auth store em PostgreSQL (blueprint §8.4) — equivalente ao useMultiFileAuthState,
// mas persistindo creds em wa_sessions.creds e as Signal keys em wa_auth_keys.
export async function usePostgresAuthState(
  _prisma: PrismaService,
  sessionId: string,
  lease: PostgresSessionLease,
  authEpoch: bigint,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const row = await lease.fenced(sessionId, authEpoch, (tx) =>
    tx.waSession.findUnique({
      where: { id: sessionId },
      select: { creds: true },
    }),
  );
  const creds: AuthenticationCreds =
    row && row.creds ? decode<AuthenticationCreds>(row.creds) : initAuthCreds();

  const keys = {
    get: async (type: string, ids: string[]) => {
      const rows = await lease.fenced(sessionId, authEpoch, (tx) =>
        tx.waAuthKey.findMany({
          where: { sessionId, type, keyId: { in: ids } },
        }),
      );
      const data: Record<string, unknown> = {};
      for (const r of rows) {
        let value = decode<unknown>(r.data);
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
        }
        data[r.keyId] = value;
      }
      return data;
    },
    set: async (data: Record<string, Record<string, unknown>>) => {
      await lease.fenced(sessionId, authEpoch, async (tx) => {
        // Um único commit para todas as Signal keys do set. A transação interna da rc14 agrega
        // mutações em memória, mas chama este set uma vez no commit sem transação SQL própria.
        for (const type of Object.keys(data)) {
          for (const id of Object.keys(data[type])) {
            const value = data[type][id];
            if (value) {
              await tx.waAuthKey.upsert({
                where: { sessionId_type_keyId: { sessionId, type, keyId: id } },
                create: { sessionId, type, keyId: id, data: encode(value) },
                update: { data: encode(value) },
              });
            } else {
              await tx.waAuthKey.deleteMany({
                where: { sessionId, type, keyId: id },
              });
            }
          }
        }
      });
    },
  };

  let pending: Promise<void> = Promise.resolve();
  const saveCreds = (): Promise<void> => {
    // Captura a versão no evento e conserva a ordem de persistência. Um update anterior que falha
    // não impede o seguinte, mas o erro original continua chegando ao handler da engine.
    const snapshot = encode(creds);
    const write = pending.then(() =>
      lease.fenced(sessionId, authEpoch, async (tx) => {
        await tx.waSession.update({
          where: { id: sessionId },
          data: { creds: snapshot },
        });
      }),
    );
    pending = write.catch(() => undefined);
    return write;
  };

  return {
    state: {
      creds,
      keys: keys as unknown as AuthenticationState['keys'],
    },
    saveCreds,
  };
}

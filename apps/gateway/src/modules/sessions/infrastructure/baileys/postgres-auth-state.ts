import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
} from '@whiskeysockets/baileys';
import { PrismaService } from '../../../../infra/prisma/prisma.service';

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
  prisma: PrismaService,
  sessionId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const row = await prisma.waSession.findUnique({
    where: { id: sessionId },
    select: { creds: true },
  });
  const creds: AuthenticationCreds =
    row && row.creds ? decode<AuthenticationCreds>(row.creds) : initAuthCreds();

  const keys = {
    get: async (type: string, ids: string[]) => {
      const rows = await prisma.waAuthKey.findMany({
        where: { sessionId, type, keyId: { in: ids } },
      });
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
      const tasks: Promise<unknown>[] = [];
      for (const type of Object.keys(data)) {
        for (const id of Object.keys(data[type])) {
          const value = data[type][id];
          if (value) {
            tasks.push(
              prisma.waAuthKey.upsert({
                where: { sessionId_type_keyId: { sessionId, type, keyId: id } },
                create: { sessionId, type, keyId: id, data: encode(value) },
                update: { data: encode(value) },
              }),
            );
          } else {
            tasks.push(
              prisma.waAuthKey.deleteMany({
                where: { sessionId, type, keyId: id },
              }),
            );
          }
        }
      }
      await Promise.all(tasks);
    },
  };

  return {
    state: {
      creds,
      keys: keys as unknown as AuthenticationState['keys'],
    },
    saveCreds: async () => {
      await prisma.waSession.update({
        where: { id: sessionId },
        data: { creds: encode(creds) },
      });
    },
  };
}

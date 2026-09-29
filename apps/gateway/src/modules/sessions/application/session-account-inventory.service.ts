import { Injectable } from '@nestjs/common';
import type { SessionAccountInventoryDto } from '@whatsapp-gateway/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { Engine } from '../domain/session-status';

interface AccountPlatformRow {
  id: string;
  name: string;
  engine: Engine;
  platform: string | null;
}

// Baileys rc14 recebe creds.platform do pair-success remoto (não do browser configurado).
// isWABusinessPlatform e WAProto/PatchDebugData.Platform separam smba/smbi de android/iphone.
// https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/generics.ts
// https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/validate-connection.ts
// https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/WAProto/WAProto.proto
// PERSONAL é a inferência limitada a esses dois marcadores de app. ios/novos valores
// e ausência permanecem UNKNOWN, nunca false do helper genérico como default pessoal.
// WWEBJS guarda client.info na engine; ler o inventário não inicia Chromium/WhatsApp.
@Injectable()
export class SessionAccountInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(): Promise<SessionAccountInventoryDto> {
    // Projeta somente a plataforma: nunca carrega o JSON com chaves de autenticação.
    // Credenciais Baileys antigas não podem classificar uma sessão trocada para WWEBJS.
    const rows = await this.prisma.$queryRaw<AccountPlatformRow[]>`
      SELECT "id", "name", "engine"::text AS "engine",
             CASE WHEN "engine" = 'BAILEYS'
                        AND jsonb_typeof("creds" -> 'platform') = 'string'
                        AND length("creds" ->> 'platform') BETWEEN 1 AND 64
                  THEN "creds" ->> 'platform' ELSE NULL END AS "platform"
        FROM "wa_sessions"
       ORDER BY "createdAt", "id"`;
    const totals = { PERSONAL: 0, BUSINESS: 0, UNKNOWN: 0 };
    const sessions = rows.map(
      (row): SessionAccountInventoryDto['sessions'][number] => {
        const platform = row.engine === 'BAILEYS' ? row.platform : null;
        const accountType =
          platform === 'smba' || platform === 'smbi'
            ? 'BUSINESS'
            : platform === 'android' || platform === 'iphone'
              ? 'PERSONAL'
              : 'UNKNOWN';
        totals[accountType]++;
        return {
          sessionId: row.id,
          name: row.name,
          engine: row.engine,
          accountType,
          platform,
          source: platform ? 'baileys.creds.platform' : 'unavailable',
        };
      },
    );
    return { sessions, totals };
  }
}

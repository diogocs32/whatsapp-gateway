import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import type {
  ReactionRepository,
  SaveReactionInput,
  StoredReaction,
} from '../domain/reaction.repository';

@Injectable()
export class PrismaReactionRepository implements ReactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // UM statement atômico (como o updateStatusByKey): INSERT … ON CONFLICT no unique (sessionId,
  // targetKeyId, senderKey) com a guarda de horário DENTRO do UPDATE — duas reações concorrentes da
  // mesma pessoa não correm read-modify-write, e uma reação antiga reprocessada não sobrescreve a
  // mais nova. O chatJid não volta de telefone para @lid (o merge LID→telefone já pode ter rodado).
  // `updatedAt` vai explícito: o @updatedAt do Prisma é preenchido pelo client, não pelo banco.
  async upsert(input: SaveReactionInput): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "wa_message_reactions"
        ("id", "sessionId", "chatJid", "targetKeyId", "senderKey", "senderJid",
         "fromMe", "emoji", "timestamp", "updatedAt")
      VALUES (${newId()}, ${input.sessionId}, ${input.chatJid}, ${input.targetKeyId},
              ${input.senderKey}, ${input.senderJid}, ${input.fromMe}, ${input.emoji},
              ${input.timestamp}, now())
      ON CONFLICT ("sessionId", "targetKeyId", "senderKey") DO UPDATE SET
        "emoji"     = EXCLUDED."emoji",
        "timestamp" = EXCLUDED."timestamp",
        "fromMe"    = EXCLUDED."fromMe",
        "senderJid" = COALESCE(EXCLUDED."senderJid", "wa_message_reactions"."senderJid"),
        "chatJid"   = CASE
                        WHEN EXCLUDED."chatJid" LIKE '%@lid'
                         AND "wa_message_reactions"."chatJid" NOT LIKE '%@lid'
                        THEN "wa_message_reactions"."chatJid"
                        ELSE EXCLUDED."chatJid"
                      END,
        "updatedAt" = now()
      WHERE "wa_message_reactions"."timestamp" <= EXCLUDED."timestamp"`;
  }

  async listForMessages(
    sessionId: string,
    targetKeyIds: string[],
  ): Promise<StoredReaction[]> {
    if (!targetKeyIds.length) return [];
    return this.prisma.messageReaction.findMany({
      where: {
        sessionId,
        targetKeyId: { in: targetKeyIds },
        emoji: { not: '' },
      },
      select: {
        targetKeyId: true,
        emoji: true,
        senderJid: true,
        fromMe: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'asc' },
    });
  }
}

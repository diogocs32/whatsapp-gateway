import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../prisma/prisma.service';
import { newId } from '../../shared-kernel/ulid';

// Um registro de contato vindo de qualquer fonte. `waId` é o id canônico do Baileys (jid OU lid).
export interface ContactRecord {
  waId: string;
  jid?: string | null;
  lid?: string | null;
  phone?: string | null;
  pushName?: string | null;
  name?: string | null;
  verifiedName?: string | null;
  imgUrl?: string | null;
  status?: string | null;
  source?: string;
  data?: Record<string, unknown>;
}

// Remove chaves nulas/indefinidas — assim o update NÃO sobrescreve dados já conhecidos com null.
function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out;
}

@Injectable()
export class ContactDirectory {
  constructor(private readonly prisma: PrismaService) {}

  // Upsert por (sessionId, waId), mesclando só campos presentes (acumulativo entre fontes/reinícios).
  async record(sessionId: string, c: ContactRecord): Promise<void> {
    if (!c.waId) return;
    const phone =
      c.phone ??
      (c.jid?.includes('@s.whatsapp.net') ? c.jid.split('@')[0] : undefined);
    const set = clean({
      jid: c.jid,
      lid: c.lid,
      phone,
      pushName: c.pushName,
      name: c.name,
      verifiedName: c.verifiedName,
      imgUrl: c.imgUrl,
      status: c.status,
      source: c.source,
    });
    await this.prisma.waContact.upsert({
      where: { sessionId_waId: { sessionId, waId: c.waId } },
      create: {
        id: newId(),
        sessionId,
        waId: c.waId,
        ...set,
        data: (c.data ?? {}) as Prisma.InputJsonValue,
      },
      update: set,
    });
  }

  async recordMany(sessionId: string, list: ContactRecord[]): Promise<void> {
    for (const c of list) {
      try {
        await this.record(sessionId, c);
      } catch {
        /* não interrompe o lote por um registro problemático */
      }
    }
  }

  // Nomes conhecidos para um conjunto de chaves (waId, lid, jid ou telefone) numa única query.
  // Cada contato é indexado por TODAS as suas chaves — assim o chamador acha pelo identificador
  // que tiver em mãos (ex.: participante de grupo que só veio como @lid). Base do cruzamento
  // "membros do grupo × contatos salvos na agenda".
  async namesFor(
    sessionId: string,
    keys: string[],
  ): Promise<Map<string, { name: string | null; pushName: string | null }>> {
    const map = new Map<string, { name: string | null; pushName: string | null }>();
    const unique = [...new Set(keys.filter(Boolean))];
    if (!unique.length) return map;
    const rows = await this.prisma.waContact.findMany({
      where: {
        sessionId,
        OR: [
          { waId: { in: unique } },
          { lid: { in: unique } },
          { jid: { in: unique } },
          { phone: { in: unique } },
        ],
      },
      select: { waId: true, lid: true, jid: true, phone: true, name: true, pushName: true },
    });
    for (const r of rows) {
      const val = { name: r.name ?? null, pushName: r.pushName ?? null };
      if (!val.name && !val.pushName) continue;
      for (const k of [r.waId, r.lid, r.jid, r.phone]) {
        if (k) map.set(k, val);
      }
    }
    return map;
  }

  // Pares LID↔telefone conhecidos — usado para aquecer o cache em memória do engine no boot.
  async lidMap(
    sessionId: string,
  ): Promise<Array<{ lid: string; jid: string }>> {
    const rows = await this.prisma.waContact.findMany({
      where: { sessionId, lid: { not: null }, jid: { not: null } },
      select: { lid: true, jid: true },
    });
    return rows
      .filter((r): r is { lid: string; jid: string } => !!r.lid && !!r.jid)
      .map((r) => ({ lid: r.lid, jid: r.jid }));
  }

  list(sessionId: string, limit: number, search?: string) {
    return this.prisma.waContact.findMany({
      where: {
        sessionId,
        ...(search
          ? {
              OR: [
                { phone: { contains: search } },
                { name: { contains: search, mode: 'insensitive' } },
                { pushName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }
}

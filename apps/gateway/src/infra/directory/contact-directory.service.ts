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

  // Lote em UM statement por chunk: INSERT ... ON CONFLICT (sessionId, waId) DO UPDATE SET
  // col = COALESCE(EXCLUDED.col, atual) — mesma semântica do record() (campo novo só entra se
  // não-nulo; nunca sobrescreve dado conhecido com null). Antes era 1 upsert por contato em
  // série: o sync de agenda do Baileys e a extração de leads (centenas–milhares de registros)
  // viravam N round-trips ao Postgres. Doc: PostgreSQL 18 sql-insert (ON CONFLICT/EXCLUDED;
  // o mesmo comando não pode afetar a MESMA linha 2× → dedup por waId dentro do lote).
  async recordMany(sessionId: string, list: ContactRecord[]): Promise<void> {
    // Dedup + merge in-batch por waId (último valor não-nulo/não-vazio de cada campo vence).
    const pick = (a?: string | null, b?: string | null) =>
      a !== undefined && a !== null && a !== '' ? a : b;
    const merged = new Map<string, ContactRecord>();
    for (const c of list) {
      if (!c.waId) continue;
      const prev = merged.get(c.waId);
      merged.set(
        c.waId,
        prev
          ? {
              waId: c.waId,
              jid: pick(c.jid, prev.jid),
              lid: pick(c.lid, prev.lid),
              phone: pick(c.phone, prev.phone),
              pushName: pick(c.pushName, prev.pushName),
              name: pick(c.name, prev.name),
              verifiedName: pick(c.verifiedName, prev.verifiedName),
              imgUrl: pick(c.imgUrl, prev.imgUrl),
              status: pick(c.status, prev.status),
              source: pick(c.source, prev.source) ?? undefined,
              data: c.data ?? prev.data,
            }
          : c,
      );
    }
    const rows = [...merged.values()];
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      try {
        await this.upsertChunk(sessionId, chunk);
      } catch {
        // Fallback: chunk problemático cai no caminho antigo, registro a registro.
        for (const c of chunk) {
          try {
            await this.record(sessionId, c);
          } catch {
            /* não interrompe o lote por um registro problemático */
          }
        }
      }
    }
  }

  private async upsertChunk(
    sessionId: string,
    chunk: ContactRecord[],
  ): Promise<void> {
    const nul = (v: string | null | undefined) =>
      v === undefined || v === null || v === '' ? null : v;
    const values = chunk.map((c) => {
      const phone =
        c.phone ??
        (c.jid?.includes('@s.whatsapp.net') ? c.jid.split('@')[0] : undefined);
      return Prisma.sql`(${newId()}, ${sessionId}, ${c.waId}, ${nul(c.jid)}, ${nul(c.lid)}, ${nul(phone)}, ${nul(c.pushName)}, ${nul(c.name)}, ${nul(c.verifiedName)}, ${nul(c.imgUrl)}, ${nul(c.status)}, ${nul(c.source)}, ${JSON.stringify(c.data ?? {})}::jsonb, now())`;
    });
    // `data` (jsonb) entra só no INSERT (o update nunca o tocou — comportamento preservado).
    await this.prisma.$executeRaw`
      INSERT INTO "wa_contacts"
        ("id", "sessionId", "waId", "jid", "lid", "phone", "pushName", "name",
         "verifiedName", "imgUrl", "status", "source", "data", "updatedAt")
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("sessionId", "waId") DO UPDATE SET
        "jid"          = COALESCE(EXCLUDED."jid", "wa_contacts"."jid"),
        "lid"          = COALESCE(EXCLUDED."lid", "wa_contacts"."lid"),
        "phone"        = COALESCE(EXCLUDED."phone", "wa_contacts"."phone"),
        "pushName"     = COALESCE(EXCLUDED."pushName", "wa_contacts"."pushName"),
        "name"         = COALESCE(EXCLUDED."name", "wa_contacts"."name"),
        "verifiedName" = COALESCE(EXCLUDED."verifiedName", "wa_contacts"."verifiedName"),
        "imgUrl"       = COALESCE(EXCLUDED."imgUrl", "wa_contacts"."imgUrl"),
        "status"       = COALESCE(EXCLUDED."status", "wa_contacts"."status"),
        "source"       = COALESCE(EXCLUDED."source", "wa_contacts"."source"),
        "updatedAt"    = now()`;
  }

  // Nomes conhecidos para um conjunto de chaves (waId, lid, jid ou telefone) numa única query.
  // Cada contato é indexado por TODAS as suas chaves — assim o chamador acha pelo identificador
  // que tiver em mãos (ex.: participante de grupo que só veio como @lid). Base do cruzamento
  // "membros do grupo × contatos salvos na agenda".
  async namesFor(
    sessionId: string,
    keys: string[],
  ): Promise<Map<string, { name: string | null; pushName: string | null }>> {
    const map = new Map<
      string,
      { name: string | null; pushName: string | null }
    >();
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
      select: {
        waId: true,
        lid: true,
        jid: true,
        phone: true,
        name: true,
        pushName: true,
      },
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

  list(sessionId: string, limit: number, search?: string, offset = 0) {
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
      skip: offset,
      take: limit,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '../../../infra/prisma/prisma.service';
import { newId } from '../../../shared-kernel/ulid';
import type { UpdateSessionConfigRequest } from '@whatsapp-gateway/contracts';

// G8 — config de envio por sessão. `cap_atual` é DERIVADO (não persistido) do capBase + warmupCurve
// + estado guard-rail.
export type SessionConfigPatch = UpdateSessionConfigRequest;

export interface CapInfo {
  cap_base: number;
  cap_atual: number;
}

@Injectable()
export class SessionConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // Lê a config (cria default idempotente). sessionId deve existir (FK).
  async get(sessionId: string) {
    return this.prisma.sessionConfig.upsert({
      where: { sessionId },
      create: { id: newId(), sessionId },
      update: {},
    });
  }

  async update(sessionId: string, patch: SessionConfigPatch) {
    const { device, ...rest } = patch;
    const deviceData =
      device !== undefined ? { device: device as Prisma.InputJsonValue } : {};
    return this.prisma.sessionConfig.upsert({
      where: { sessionId },
      create: { id: newId(), sessionId, ...rest, ...deviceData },
      update: { ...rest, ...deviceData },
    });
  }

  // cap_atual derivado do estado guard-rail: quarentena/banida/pausa_manual = 0 (cold parado);
  // throttled = ~50% do base; aquecimento = trickle (1º valor da curva); ativa = cap_base.
  capFor(
    cfg: { capBase: number; warmupCurve: number[] },
    state: string,
  ): CapInfo {
    const base = cfg.capBase;
    let atual: number;
    switch (state) {
      case 'quarentena':
      case 'banida':
      case 'pausa_manual':
        atual = 0;
        break;
      case 'throttled':
        atual = Math.floor(base * 0.5);
        break;
      case 'aquecimento':
        atual = cfg.warmupCurve[0] ?? base;
        break;
      default:
        atual = base; // ativa
    }
    return { cap_base: base, cap_atual: atual };
  }
}

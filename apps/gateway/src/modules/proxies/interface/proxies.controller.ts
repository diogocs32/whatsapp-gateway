import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  BulkDeleteProxiesResult,
  ProxyListItemDto,
  ProxySuggestionResponse,
} from '@whatsapp-gateway/contracts';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { MinRole } from '../../iam/interface/roles.decorator';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { ProxyService } from '../application/proxy.service';
import { ProxyUnavailableError } from '../application/proxy-unavailable.error';
import type { Proxy, ProxyAssignment } from '../domain/proxy.entity';
import {
  bulkDeleteSchema,
  bulkImportSchema,
  createProxySchema,
  proxySuggestionQuerySchema,
  setAssignmentSchema,
} from './dto';

function toDto(p: Proxy) {
  return {
    id: p.id,
    position: p.position,
    label: p.label,
    protocol: p.protocol,
    host: p.host,
    port: p.port,
    hasAuth: !!p.username,
    source: p.source,
    country: p.country,
    exitIp: p.exitIp,
    latencyMs: p.latencyMs,
    status: p.status,
    enabled: p.enabled,
  };
}

function assignmentToDto(a: ProxyAssignment) {
  return {
    sessionId: a.sessionId,
    mode: a.mode,
    rangeStart: a.rangeStart,
    rangeEnd: a.rangeEnd,
    strategy: a.strategy,
    currentProxyId: a.currentProxyId,
  };
}

@UseGuards(ApiKeyAuthGuard, RolesGuard)
@MinRole('ADMIN')
@Controller()
export class ProxiesController {
  constructor(private readonly service: ProxyService) {}

  // E28 (P-107, D-051): cada item traz quantas sessões vivas usam o proxy e quais (ADITIVO).
  @Get('proxies')
  async list(): Promise<ProxyListItemDto[]> {
    return (await this.service.listWithUsage()).map(({ proxy, sessions }) => ({
      ...toDto(proxy),
      sessionCount: sessions.length,
      sessions: sessions.map((s) => ({ id: s.id, name: s.name })),
    }));
  }

  // Proxies LIVRES (enabled, não-DEAD, sem sessão usando) — D-008, para integradores. Desde a E28
  // o painel lista o pool com o uso (GET /proxies) e marca os ocupados em vez de escondê-los.
  // Rota estática declarada antes das rotas com :id.
  @Get('proxies/available')
  async listAvailable() {
    return (await this.service.listAvailable()).map(toDto);
  }

  // E26 (P-084, D-038): o proxy que a sessão apagada com esse nome usava — o painel sugere na
  // criação. `{suggestion: null}` quando não há memória. ADMIN (como criar/apagar sessão).
  @Get('proxies/suggestion')
  async suggestion(
    @Query('sessionName') sessionName: unknown,
  ): Promise<ProxySuggestionResponse> {
    const parsed = proxySuggestionQuerySchema.safeParse(sessionName);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'sessionName inválido',
      );
    }
    const s = await this.service.suggestionFor(parsed.data);
    return {
      suggestion: s && {
        proxy: s.proxy ? toDto(s.proxy) : null,
        fromSession: s.fromSession,
        releasedAt: s.releasedAt.toISOString(),
        available: s.available,
        reason: s.reason,
        inUseBySession: s.inUseBySession,
      },
    };
  }

  @Get('proxies/webshare/status')
  webshareStatus() {
    return { configured: this.service.webshareConfigured() };
  }

  @Post('proxies')
  async create(@Body() body: unknown) {
    const parsed = createProxySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    const proxy = await this.service.create({
      label: d.label ?? null,
      protocol: d.protocol,
      host: d.host,
      port: d.port,
      username: d.username ?? null,
      password: d.password ?? null,
    });
    return toDto(proxy);
  }

  @Post('proxies/bulk')
  async bulk(@Body() body: unknown) {
    const parsed = bulkImportSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    return this.service.bulkImport(parsed.data.text, parsed.data.protocol);
  }

  // E28 (P-107): exclui vários de uma vez (o painel marca e confirma uma vez só). 200, não 201:
  // nada é criado. Inexistentes voltam em `notFound` sem falhar o lote.
  @Post('proxies/bulk-delete')
  @HttpCode(200)
  async bulkDelete(@Body() body: unknown): Promise<BulkDeleteProxiesResult> {
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    return this.service.removeMany(parsed.data.ids);
  }

  @Post('proxies/test-all')
  testAll() {
    return this.service.testAll();
  }

  @Post('proxies/webshare/sync')
  syncWebshare() {
    return this.service.syncWebshare();
  }

  @Post('proxies/:id/test')
  async test(@Param('id') id: string) {
    try {
      return await this.service.test(id);
    } catch {
      throw new NotFoundException('Proxy não encontrado');
    }
  }

  @Post('proxies/:id/enable')
  async enable(@Param('id') id: string) {
    await this.service.setEnabled(id, true);
    return { ok: true };
  }

  @Post('proxies/:id/disable')
  async disable(@Param('id') id: string) {
    await this.service.setEnabled(id, false);
    return { ok: true };
  }

  @Delete('proxies/:id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }

  // Assignment por sessão (qual proxy/range/estratégia a sessão usa).
  @Get('sessions/:id/proxy')
  async getAssignment(@Param('id') id: string) {
    id = await this.service.resolveSessionId(id);
    const a = await this.service.getAssignment(id);
    return a
      ? assignmentToDto(a)
      : {
          sessionId: id,
          mode: 'NONE',
          rangeStart: null,
          rangeEnd: null,
          strategy: 'STICKY',
          currentProxyId: null,
        };
  }

  @Put('sessions/:id/proxy')
  async setAssignment(@Param('id') id: string, @Body() body: unknown) {
    const parsed = setAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const d = parsed.data;
    id = await this.service.resolveSessionId(id);
    const a = await this.service
      .setAssignment(id, {
        mode: d.mode,
        rangeStart: d.rangeStart ?? null,
        rangeEnd: d.rangeEnd ?? null,
        strategy: d.strategy,
        proxyId: d.proxyId ?? null,
        allowShared: d.allowSharedProxy === true,
      })
      .catch((error: unknown) => {
        if (error instanceof ProxyUnavailableError)
          throw new BadRequestException(error.message);
        throw error;
      });
    return assignmentToDto(a);
  }
}

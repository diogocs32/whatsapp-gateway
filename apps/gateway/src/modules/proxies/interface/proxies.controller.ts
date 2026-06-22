import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { MinRole } from '../../iam/interface/roles.decorator';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { ProxyService } from '../application/proxy.service';
import type { Proxy, ProxyAssignment } from '../domain/proxy.entity';
import {
  bulkImportSchema,
  createProxySchema,
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

  @Get('proxies')
  async list() {
    return (await this.service.list()).map(toDto);
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
    const a = await this.service.setAssignment(id, {
      mode: d.mode,
      rangeStart: d.rangeStart ?? null,
      rangeEnd: d.rangeEnd ?? null,
      strategy: d.strategy,
      proxyId: d.proxyId ?? null,
    });
    return assignmentToDto(a);
  }
}

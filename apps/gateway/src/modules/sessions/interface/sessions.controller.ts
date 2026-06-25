import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { newId } from '../../../shared-kernel/ulid';
import {
  GuardrailService,
  type ManualAction,
} from '../../guardrail/guardrail.service';
import { LicenseService } from '../../iam/application/license.service';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { MinRole } from '../../iam/interface/roles.decorator';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { SessionManager } from '../application/session-manager.service';
import { SessionRefPipe } from './session-ref.pipe';
import type { Session } from '../domain/session.entity';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../domain/session.repository';
import { createSessionSchema, pairingSchema } from './dto';

function toDto(s: Session) {
  return {
    id: s.id,
    name: s.name,
    engine: s.engine,
    status: s.status,
    meJid: s.meJid,
    mePushName: s.mePushName,
    phoneNumber: s.phoneNumber,
    autostart: s.autostart,
    lastError: s.lastError,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly repo: SessionRepository,
    private readonly manager: SessionManager,
    private readonly license: LicenseService,
    private readonly guardrail: GuardrailService,
  ) {}

  @Post()
  @MinRole('ADMIN')
  async create(@Body() body: unknown) {
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const { name, engine, mode, phoneNumber, autostart } = parsed.data;
    if (mode === 'pairing' && !phoneNumber) {
      throw new BadRequestException(
        'phoneNumber é obrigatório no modo pairing',
      );
    }
    if (await this.repo.findByName(name)) {
      throw new ConflictException('Já existe uma sessão com esse nome');
    }
    const maxSessions = this.license.effective().maxSessions;
    if ((await this.repo.list()).length >= maxSessions) {
      throw new ConflictException(
        `Limite de ${maxSessions} sessão(ões) atingido — instale uma licença com mais sessões.`,
      );
    }

    const created = await this.repo.create({
      id: newId(),
      name,
      engine,
      phoneNumber: phoneNumber ?? null,
      autostart,
    });
    await this.manager.start(created.id);
    const fresh = (await this.repo.findById(created.id)) ?? created;
    return toDto(fresh);
  }

  // G7: lista enriquecida com o estado guard-rail; ?state=ativa,aquecimento filtra por estado.
  @Get()
  async list(@Query('state') state?: string) {
    const sessions = await this.repo.list();
    const states = await this.guardrail.statesFor(sessions.map((s) => s.id));
    let dtos = sessions.map((s) => ({
      ...toDto(s),
      guardrailState: states.get(s.id) ?? 'ativa',
    }));
    if (state) {
      const wanted = new Set(
        state
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      );
      dtos = dtos.filter((d) => wanted.has(d.guardrailState));
    }
    return dtos;
  }

  @Get(':id')
  async get(@Param('id', SessionRefPipe) id: string) {
    return toDto(await this.ensure(id));
  }

  // G7 — saúde da sessão (estado guard-rail + reply-rate + sinais).
  @Get(':id/health')
  async health(@Param('id', SessionRefPipe) id: string) {
    return this.guardrail.health(id);
  }

  // G7 — override manual do estado guard-rail (decisão explícita do Diogo).
  @Post(':id/quarantine')
  quarantine(@Param('id', SessionRefPipe) id: string) {
    return this.override(id, 'quarantine');
  }

  @Post(':id/warmup')
  warmup(@Param('id', SessionRefPipe) id: string) {
    return this.override(id, 'warmup');
  }

  @Post(':id/activate')
  activate(@Param('id', SessionRefPipe) id: string) {
    return this.override(id, 'activate');
  }

  @Post(':id/pause')
  pause(@Param('id', SessionRefPipe) id: string) {
    return this.override(id, 'pause');
  }

  private async override(id: string, action: ManualAction) {
    const gr = await this.guardrail.setManualState(id, action);
    return { state: gr.state, reason: gr.reason };
  }

  @Post(':id/start')
  async start(@Param('id', SessionRefPipe) id: string) {
    await this.ensure(id);
    await this.manager.start(id);
    return { ok: true };
  }

  @Post(':id/stop')
  async stop(@Param('id', SessionRefPipe) id: string) {
    await this.ensure(id);
    await this.manager.stop(id);
    return { ok: true };
  }

  @Post(':id/restart')
  async restart(@Param('id', SessionRefPipe) id: string) {
    await this.ensure(id);
    await this.manager.restart(id);
    return { ok: true };
  }

  @Post(':id/logout')
  async logout(@Param('id', SessionRefPipe) id: string) {
    await this.ensure(id);
    await this.manager.logout(id);
    return { ok: true };
  }

  @Delete(':id')
  @MinRole('ADMIN')
  async remove(@Param('id', SessionRefPipe) id: string) {
    await this.ensure(id);
    await this.manager.remove(id);
    return { ok: true };
  }

  @Get(':id/qr')
  async qr(@Param('id', SessionRefPipe) id: string) {
    const s = await this.ensure(id);
    return { status: s.status, qr: this.manager.getQr(id) };
  }

  @Post(':id/pairing-code')
  async pairingCode(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    await this.ensure(id);
    const parsed = pairingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('phoneNumber inválido');
    const code = await this.manager.requestPairingCode(
      id,
      parsed.data.phoneNumber,
    );
    return { code };
  }

  private async ensure(id: string): Promise<Session> {
    const s = await this.repo.findById(id);
    if (!s) throw new NotFoundException('Sessão não encontrada');
    return s;
  }
}

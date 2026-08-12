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
  Patch,
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
import { ProxyService } from '../../proxies/application/proxy.service';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { MinRole } from '../../iam/interface/roles.decorator';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { SessionConfigService } from '../application/session-config.service';
import { SessionManager } from '../application/session-manager.service';
import { SessionRefPipe } from './session-ref.pipe';
import type { Session } from '../domain/session.entity';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../domain/session.repository';
import {
  createSessionSchema,
  pairingSchema,
  presenceSchema,
  profileNameSchema,
  profilePhotoSchema,
  profileStatusSchema,
  sessionConfigSchema,
} from './dto';

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

// G8 — DTO da config de envio da sessão (sem id/sessionId internos).
function configDto(c: {
  capBase: number;
  warmupCurve: number[];
  regiaoDdd: string | null;
  modo: string;
  janelaInicio: number;
  janelaFim: number;
  timezone: string;
  device: unknown;
}) {
  return {
    capBase: c.capBase,
    warmupCurve: c.warmupCurve,
    regiaoDdd: c.regiaoDdd,
    modo: c.modo,
    janelaInicio: c.janelaInicio,
    janelaFim: c.janelaFim,
    timezone: c.timezone,
    device: c.device ?? null,
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
    private readonly sessionConfig: SessionConfigService,
    private readonly proxies: ProxyService,
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
    const { name, engine, mode, phoneNumber, autostart, proxyId } = parsed.data;
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
    // D-008 — valida ANTES de criar (proxy inválido não deixa sessão órfã pra trás).
    if (proxyId) {
      try {
        await this.proxies.ensureAvailable(proxyId);
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
    }

    const created = await this.repo.create({
      id: newId(),
      name,
      engine,
      phoneNumber: phoneNumber ?? null,
      autostart,
    });
    // A atribuição precisa existir ANTES do start (a engine resolve o proxy na conexão).
    // assignExclusive re-valida a exclusividade; se outro create levou o proxy no meio tempo,
    // desfaz a sessão recém-criada e devolve o erro (sem sessão órfã, sem proxy duplicado).
    if (proxyId) {
      try {
        await this.proxies.assignExclusive(created.id, proxyId);
      } catch (e) {
        await this.repo.delete(created.id);
        throw new BadRequestException((e as Error).message);
      }
    }
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

  // G7 — saúde da sessão (estado guard-rail + reply-rate + sinais). G8 preenche cap_base/cap_atual.
  @Get(':id/health')
  async health(@Param('id', SessionRefPipe) id: string) {
    const h = await this.guardrail.health(id);
    const cfg = await this.sessionConfig.get(id);
    const cap = this.sessionConfig.capFor(cfg, h.state);
    return { ...h, cap_base: cap.cap_base, cap_atual: cap.cap_atual };
  }

  // G8 — config de envio da sessão (cap_atual é derivado do estado guard-rail).
  @Get(':id/config')
  async getConfig(@Param('id', SessionRefPipe) id: string) {
    const cfg = await this.sessionConfig.get(id);
    const gr = await this.guardrail.getState(id);
    return { ...configDto(cfg), ...this.sessionConfig.capFor(cfg, gr.state) };
  }

  @Patch(':id/config')
  async patchConfig(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = sessionConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const cfg = await this.sessionConfig.update(id, parsed.data);
    const gr = await this.guardrail.getState(id);
    return { ...configDto(cfg), ...this.sessionConfig.capFor(cfg, gr.state) };
  }

  // G8 — presença ("digitando…", "online", etc.) no destino.
  @Post(':id/presence')
  async presence(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = presenceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    await this.manager.sendPresence(id, parsed.data.to, parsed.data.type);
    return { ok: true };
  }

  // W8 — perfil da conta conectada: recado (status) e nome de exibição.
  @Post(':id/profile/status')
  async profileStatus(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = profileStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    try {
      await this.manager.setProfileStatus(id, parsed.data.status);
      return { ok: true };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post(':id/profile/name')
  async profileName(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = profileNameSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    try {
      await this.manager.setProfileName(id, parsed.data.name);
      return { ok: true };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  // W8b — foto de perfil por URL: o gateway baixa a imagem e a define como foto da conta.
  @Post(':id/profile/photo')
  async profilePhoto(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = profilePhotoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    let buffer: Buffer;
    let mimetype: string;
    try {
      const res = await fetch(parsed.data.url, {
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mimetype = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
      buffer = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      throw new BadRequestException(
        `não consegui baixar a imagem: ${(e as Error).message}`,
      );
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('imagem acima de 10 MB');
    }
    try {
      await this.manager.setProfilePhoto(id, buffer, mimetype);
      return { ok: true };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
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

  // Recuperação com credencial nova (ex.: sessão desconectada pelo celular): limpa as creds
  // persistidas e reinicia o socket — o QR novo chega pelo polling de GET /:id/qr. Diferente do
  // /restart, que reaproveita as credenciais existentes.
  @Post(':id/new-qr')
  async newQr(@Param('id', SessionRefPipe) id: string) {
    await this.ensure(id);
    await this.manager.newQr(id);
    return { ok: true };
  }

  @Post(':id/pairing-code')
  async pairingCode(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
  ) {
    await this.ensure(id);
    const parsed = pairingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('phoneNumber inválido');
    try {
      const code = await this.manager.requestPairingCode(
        id,
        parsed.data.phoneNumber,
      );
      return { code };
    } catch (e) {
      // Sessão não iniciada/carregada ainda não permite parear (ex.: proxy falhou ou o WhatsApp Web
      // não abriu). Devolve 409 com o motivo em vez de 500 (Internal server error) cru.
      const msg =
        (e as Error)?.message ?? 'Falha ao gerar código de pareamento';
      throw new ConflictException(
        /não conectada|not connected|Session closed|Evaluation failed|pupPage|undefined/i.test(
          msg,
        )
          ? 'A sessão não está pronta para parear. Inicie a sessão e aguarde carregar; se houver proxy com erro, corrija o proxy antes.'
          : msg,
      );
    }
  }

  private async ensure(id: string): Promise<Session> {
    const s = await this.repo.findById(id);
    if (!s) throw new NotFoundException('Sessão não encontrada');
    return s;
  }
}

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
  UseGuards,
} from '@nestjs/common';
import { newId } from '../../../shared-kernel/ulid';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
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

@UseGuards(ApiKeyAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly repo: SessionRepository,
    private readonly manager: SessionManager,
  ) {}

  @Post()
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

  @Get()
  async list() {
    const sessions = await this.repo.list();
    return sessions.map(toDto);
  }

  @Get(':id')
  async get(@Param('id', SessionRefPipe) id: string) {
    return toDto(await this.ensure(id));
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

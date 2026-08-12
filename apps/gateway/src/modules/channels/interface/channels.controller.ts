import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { UnsupportedEngineOperationError } from '../../sessions/application/engine.port';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { SessionManager } from '../../sessions/application/session-manager.service';
import { SessionRefPipe } from '../../sessions/interface/session-ref.pipe';

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
});

// Canais (newsletter) — beta: depende de suporte da conta; erros viram 400 com a msg original.
@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('sessions/:id/channels')
export class ChannelsController {
  constructor(private readonly manager: SessionManager) {}

  @Post()
  async create(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const r = createChannelSchema.safeParse(body);
    if (!r.success) {
      throw new BadRequestException(
        r.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    return this.run(() =>
      this.manager.createChannel(id, r.data.name, r.data.description),
    );
  }

  @Get(':jid')
  info(@Param('id', SessionRefPipe) id: string, @Param('jid') jid: string) {
    return this.run(() => this.manager.channelInfo(id, jid));
  }

  @Post(':jid/follow')
  async follow(
    @Param('id', SessionRefPipe) id: string,
    @Param('jid') jid: string,
  ) {
    await this.run(() => this.manager.followChannel(id, jid));
    return { ok: true };
  }

  @Post(':jid/unfollow')
  async unfollow(
    @Param('id', SessionRefPipe) id: string,
    @Param('jid') jid: string,
  ) {
    await this.run(() => this.manager.unfollowChannel(id, jid));
    return { ok: true };
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      // Canais no wwebjs caem em nope() → 501 (Not Implemented), não 400 (payload inválido).
      if (e instanceof UnsupportedEngineOperationError)
        throw new NotImplementedException((e as Error).message);
      throw new BadRequestException((e as Error).message);
    }
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../iam/interface/auth.guard';
import { SessionManager } from '../../sessions/application/session-manager.service';

const createGroupSchema = z.object({
  subject: z.string().min(1).max(100),
  participants: z.array(z.string().min(5).max(40)).min(1),
});

const participantsSchema = z.object({
  action: z.enum(['add', 'remove', 'promote', 'demote']),
  participants: z.array(z.string().min(5).max(40)).min(1),
});

const subjectSchema = z.object({ subject: z.string().min(1).max(100) });
const descriptionSchema = z.object({ description: z.string().max(2000) });

@UseGuards(JwtAuthGuard)
@Controller('sessions/:id/groups')
export class GroupsController {
  constructor(private readonly manager: SessionManager) {}

  @Get()
  list(@Param('id') id: string) {
    return this.run(() => this.manager.listGroups(id));
  }

  @Post()
  async create(@Param('id') id: string, @Body() body: unknown) {
    const d = parse(createGroupSchema, body);
    return this.run(() =>
      this.manager.createGroup(id, d.subject, d.participants),
    );
  }

  @Get(':groupId')
  info(@Param('id') id: string, @Param('groupId') groupId: string) {
    return this.run(() => this.manager.groupInfo(id, groupId));
  }

  @Post(':groupId/participants')
  async participants(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const d = parse(participantsSchema, body);
    await this.run(() =>
      this.manager.updateParticipants(id, groupId, d.action, d.participants),
    );
    return { ok: true };
  }

  @Post(':groupId/leave')
  async leave(@Param('id') id: string, @Param('groupId') groupId: string) {
    await this.run(() => this.manager.leaveGroup(id, groupId));
    return { ok: true };
  }

  @Post(':groupId/subject')
  async subject(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const d = parse(subjectSchema, body);
    await this.run(() => this.manager.setGroupSubject(id, groupId, d.subject));
    return { ok: true };
  }

  @Post(':groupId/description')
  async description(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const d = parse(descriptionSchema, body);
    await this.run(() =>
      this.manager.setGroupDescription(id, groupId, d.description),
    );
    return { ok: true };
  }

  @Get(':groupId/invite')
  async invite(@Param('id') id: string, @Param('groupId') groupId: string) {
    const code = await this.run(() =>
      this.manager.groupInviteCode(id, groupId),
    );
    return { code, url: `https://chat.whatsapp.com/${code}` };
  }

  @Post(':groupId/invite/revoke')
  async revoke(@Param('id') id: string, @Param('groupId') groupId: string) {
    const code = await this.run(() =>
      this.manager.groupRevokeInvite(id, groupId),
    );
    return { code, url: `https://chat.whatsapp.com/${code}` };
  }

  // Converte erros da engine/Baileys em 400 com a mensagem original.
  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}

function parse<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new BadRequestException(
      r.error.issues[0]?.message ?? 'Dados inválidos',
    );
  }
  return r.data;
}

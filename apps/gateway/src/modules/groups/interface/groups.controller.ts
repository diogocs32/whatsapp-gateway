import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { fetchImageByUrl } from '../../../shared-kernel/safe-fetch';
import { UnsupportedEngineOperationError } from '../../sessions/application/engine.port';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { SessionManager } from '../../sessions/application/session-manager.service';
import { SessionRefPipe } from '../../sessions/interface/session-ref.pipe';

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
// W8 — moderação da fila de entrada e configurações admin-only do grupo.
const membershipSchema = z.object({
  action: z.enum(['approve', 'reject']),
  // ausente/vazio = age sobre TODA a fila pendente (a engine aplica anti-flood entre um e outro).
  participants: z.array(z.string().min(5).max(40)).optional(),
});
const settingsSchema = z
  .object({
    announce: z.boolean().optional(), // true = só admins ENVIAM
    restrict: z.boolean().optional(), // true = só admins EDITAM a info
  })
  .refine((d) => d.announce !== undefined || d.restrict !== undefined, {
    message: 'informe announce e/ou restrict',
  });
const photoSchema = z.object({ url: z.string().url() });

@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('sessions/:id/groups')
export class GroupsController {
  constructor(private readonly manager: SessionManager) {}

  @Get()
  list(@Param('id', SessionRefPipe) id: string) {
    return this.run(() => this.manager.listGroups(id));
  }

  @Post()
  async create(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const d = parse(createGroupSchema, body);
    return this.run(() =>
      this.manager.createGroup(id, d.subject, d.participants),
    );
  }

  @Get(':groupId')
  info(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.run(() => this.manager.groupInfo(id, groupId));
  }

  // Filtro de leads: membros do grupo com número + nome (se disponível). Por padrão só os que
  // têm número (lead utilizável); ?all=true inclui os sem número resolvido (LID anônimo).
  @Get(':groupId/leads')
  async leads(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
    @Query('all') all?: string,
  ) {
    const info = await this.run(() => this.manager.groupInfo(id, groupId));
    const includeWithout = all === 'true' || all === '1';
    const withNumber = info.participants.filter((p) => p.phone);
    const rows = includeWithout ? info.participants : withNumber;
    return {
      groupId: info.id,
      subject: info.subject,
      total: info.participants.length,
      withNumber: withNumber.length,
      withoutNumber: info.participants.length - withNumber.length,
      leads: rows.map((p) => ({
        phone: p.phone,
        name: p.name,
        role: p.role,
      })),
    };
  }

  @Post(':groupId/participants')
  async participants(
    @Param('id', SessionRefPipe) id: string,
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
  async leave(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
  ) {
    await this.run(() => this.manager.leaveGroup(id, groupId));
    return { ok: true };
  }

  @Post(':groupId/subject')
  async subject(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const d = parse(subjectSchema, body);
    await this.run(() => this.manager.setGroupSubject(id, groupId, d.subject));
    return { ok: true };
  }

  @Post(':groupId/description')
  async description(
    @Param('id', SessionRefPipe) id: string,
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
  async invite(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
  ) {
    const code = await this.run(() =>
      this.manager.groupInviteCode(id, groupId),
    );
    return { code, url: `https://chat.whatsapp.com/${code}` };
  }

  @Post(':groupId/invite/revoke')
  async revoke(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
  ) {
    const code = await this.run(() =>
      this.manager.groupRevokeInvite(id, groupId),
    );
    return { code, url: `https://chat.whatsapp.com/${code}` };
  }

  // W8 — fila de entrada pendente (pedidos de participação). Requer admin.
  @Get(':groupId/membership-requests')
  membershipRequests(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.run(() => this.manager.groupMembershipRequests(id, groupId));
  }

  // W8 — aprova/rejeita pedidos (todos, se `participants` ausente). Anti-flood na engine.
  @Post(':groupId/membership-requests')
  async membership(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const d = parse(membershipSchema, body);
    await this.run(() =>
      this.manager.groupMembershipAction(id, groupId, d.action, d.participants),
    );
    return { ok: true };
  }

  // W8 — liga/desliga announce (só admins enviam) e/ou restrict (só admins editam a info).
  @Post(':groupId/settings')
  async settings(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const d = parse(settingsSchema, body);
    if (d.announce !== undefined) {
      await this.run(() =>
        this.manager.setGroupSetting(id, groupId, 'announce', d.announce!),
      );
    }
    if (d.restrict !== undefined) {
      await this.run(() =>
        this.manager.setGroupSetting(id, groupId, 'restrict', d.restrict!),
      );
    }
    return { ok: true };
  }

  // W8 — foto do grupo por URL (o gateway baixa a imagem e a define). Espelha /profile/photo.
  @Post(':groupId/photo')
  async photo(
    @Param('id', SessionRefPipe) id: string,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const d = parse(photoSchema, body);
    // P-070: política de egress + teto em fluxo (era fetch cru).
    let buffer: Buffer;
    let mimetype: string;
    try {
      ({ buffer, mimetype } = await fetchImageByUrl(d.url));
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.run(() =>
      this.manager.setGroupPhoto(id, groupId, buffer, mimetype),
    );
    return { ok: true };
  }

  // Converte erros da engine: operação não suportada → 501, o resto → 400 (mensagem original).
  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      // Operação não suportada pela engine (wwebjs: grupos de escrita) → 501, não 400: o n8n
      // distingue "engine não faz isso" de "payload inválido".
      if (e instanceof UnsupportedEngineOperationError)
        throw new NotImplementedException((e as Error).message);
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

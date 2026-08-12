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
import { ContactDirectory } from '../../../infra/directory/contact-directory.service';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { SessionManager } from '../../sessions/application/session-manager.service';
import { UnsupportedEngineOperationError } from '../../sessions/application/engine.port';
import { SessionRefPipe } from '../../sessions/interface/session-ref.pipe';

const checkSchema = z.object({
  numbers: z.array(z.string().min(5).max(40)).min(1).max(50),
});
const blockSchema = z.object({
  jid: z.string().min(5),
  action: z.enum(['block', 'unblock']),
});
// Salvar/editar contato: aceita `jid` (canônico) OU `number` (dígitos com país+DDD).
const saveContactSchema = z
  .object({
    jid: z.string().min(5).optional(),
    number: z.string().min(5).max(40).optional(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().max(100).optional(),
    syncToPhone: z.boolean().optional(),
  })
  .refine((d) => !!(d.jid ?? d.number), {
    message: 'Informe jid ou number',
  });
const removeContactSchema = z
  .object({
    jid: z.string().min(5).optional(),
    number: z.string().min(5).max(40).optional(),
  })
  .refine((d) => !!(d.jid ?? d.number), {
    message: 'Informe jid ou number',
  });

@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('sessions/:id/contacts')
export class ContactsController {
  constructor(
    private readonly manager: SessionManager,
    private readonly directory: ContactDirectory,
  ) {}

  // Diretório persistente (LID↔telefone + metadados) acumulado de todas as fontes — base p/ automações.
  @Get('directory')
  async listDirectory(
    @Param('id', SessionRefPipe) id: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = Math.min(Number(limit) || 1000, 1000);
    const skip = Math.max(Number(offset) || 0, 0);
    const rows = await this.directory.list(
      id,
      take,
      search?.trim() || undefined,
      skip,
    );
    return rows.map((r) => ({
      waId: r.waId,
      jid: r.jid,
      lid: r.lid,
      phone: r.phone,
      pushName: r.pushName,
      name: r.name,
      verifiedName: r.verifiedName,
      imgUrl: r.imgUrl,
      status: r.status,
      source: r.source,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  // Verifica se números têm WhatsApp (retorna o JID canônico — corrige 9º dígito BR).
  @Post('check')
  async check(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const r = checkSchema.safeParse(body);
    if (!r.success) {
      throw new BadRequestException(
        r.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    try {
      return await this.manager.checkNumbers(id, r.data.numbers);
    } catch (e) {
      if (e instanceof UnsupportedEngineOperationError)
        throw new NotImplementedException((e as Error).message);
      throw new BadRequestException((e as Error).message);
    }
  }

  @Get(':jid/profile-picture')
  async profilePicture(
    @Param('id', SessionRefPipe) id: string,
    @Param('jid') jid: string,
  ) {
    try {
      const url = await this.manager.profilePicture(id, jid);
      return { jid, url };
    } catch (e) {
      if (e instanceof UnsupportedEngineOperationError)
        throw new NotImplementedException((e as Error).message);
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post('block')
  async block(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const r = blockSchema.safeParse(body);
    if (!r.success) {
      throw new BadRequestException(
        r.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    try {
      await this.manager.setBlock(id, r.data.jid, r.data.action);
      return { ok: true };
    } catch (e) {
      if (e instanceof UnsupportedEngineOperationError)
        throw new NotImplementedException((e as Error).message);
      throw new BadRequestException((e as Error).message);
    }
  }

  // Salva/edita o contato na agenda da conta. syncToPhone=true propaga para a agenda do aparelho.
  @Post('save')
  async save(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const r = saveContactSchema.safeParse(body);
    if (!r.success) {
      throw new BadRequestException(
        r.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const target = r.data.jid ?? r.data.number!;
    try {
      await this.manager.saveContact(id, target, {
        firstName: r.data.firstName,
        lastName: r.data.lastName ?? null,
        syncToPhone: r.data.syncToPhone ?? false,
      });
      return { ok: true };
    } catch (e) {
      if (e instanceof UnsupportedEngineOperationError)
        throw new NotImplementedException((e as Error).message);
      throw new BadRequestException((e as Error).message);
    }
  }

  // Remove o contato da agenda da conta.
  @Post('remove')
  async remove(@Param('id', SessionRefPipe) id: string, @Body() body: unknown) {
    const r = removeContactSchema.safeParse(body);
    if (!r.success) {
      throw new BadRequestException(
        r.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const target = r.data.jid ?? r.data.number!;
    try {
      await this.manager.removeContact(id, target);
      return { ok: true };
    } catch (e) {
      if (e instanceof UnsupportedEngineOperationError)
        throw new NotImplementedException((e as Error).message);
      throw new BadRequestException((e as Error).message);
    }
  }
}

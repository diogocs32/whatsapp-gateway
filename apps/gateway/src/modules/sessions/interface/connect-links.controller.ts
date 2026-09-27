import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  ConnectLinkCreatedResponse,
  ConnectLinkCurrentResponse,
  ConnectLinkRevokeResponse,
} from '@whatsapp-gateway/contracts';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { JwtAuthGuard, type JwtPayload } from '../../iam/interface/auth.guard';
import { RolesGuard } from '../../iam/interface/roles.guard';
import {
  ConnectLinkService,
  toConnectLinkDto,
} from '../application/connect-link.service';
import {
  CONNECT_LINK_TTL_DEFAULT_MIN,
  CONNECT_LINK_TTL_MAX_MIN,
  CONNECT_LINK_TTL_MIN_MIN,
  normalizeExpectedPhone,
} from '../domain/connect-link';
import { SessionRefPipe } from './session-ref.pipe';

const createSchema = z.object({
  ttlMinutes: z
    .number()
    .int()
    .min(CONNECT_LINK_TTL_MIN_MIN)
    .max(CONNECT_LINK_TTL_MAX_MIN)
    .optional(),
  expectedPhone: z.string().max(40).nullable().optional(),
});

// E27 · P-086 · D-037 — o operador cria/consulta/revoga o link de conexão da sessão. Só login do
// painel (JWT): criar link é delegar a um anônimo o poder de pedir QR — API key/n8n fica para a
// P-093. Papéis pelo padrão do RolesGuard: GET = VIEWER+, POST/DELETE = OPERATOR+ (o mesmo do
// new-qr que o link delega).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class ConnectLinksController {
  constructor(private readonly links: ConnectLinkService) {}

  @Post(':id/connect-link')
  async create(
    @Param('id', SessionRefPipe) id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: JwtPayload },
  ): Promise<ConnectLinkCreatedResponse> {
    const parsed = createSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
      );
    }
    const expectedPhone = normalizeExpectedPhone(parsed.data.expectedPhone);
    if (expectedPhone === 'invalid') {
      throw new BadRequestException(
        'expectedPhone inválido: use DDI + DDD + número (10 a 15 dígitos)',
      );
    }
    if (expectedPhone === 'no-ddi') {
      throw new BadRequestException(
        'expectedPhone sem DDI: use 55 + DDD + número (ex.: 5511988887777)',
      );
    }
    const actor = req.user
      ? `${req.user.username} (${req.user.role})`
      : 'desconhecido';
    const { link, token } = await this.links.create(
      id,
      {
        ttlMinutes: parsed.data.ttlMinutes ?? CONNECT_LINK_TTL_DEFAULT_MIN,
        expectedPhone,
      },
      actor,
    );
    return {
      link: toConnectLinkDto(link, new Date()),
      token,
      path: `/conectar#${token}`,
    };
  }

  @Get(':id/connect-link')
  async current(
    @Param('id', SessionRefPipe) id: string,
  ): Promise<ConnectLinkCurrentResponse> {
    const link = await this.links.latest(id);
    return { link: link ? toConnectLinkDto(link, new Date()) : null };
  }

  @Delete(':id/connect-link')
  async revoke(
    @Param('id', SessionRefPipe) id: string,
  ): Promise<ConnectLinkRevokeResponse> {
    const revoked = await this.links.revoke(id, 'MANUAL');
    return { ok: true, revoked };
  }
}

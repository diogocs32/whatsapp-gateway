import {
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  PUBLIC_CONNECT_NEW_QR_RATE_LIMIT,
  PUBLIC_CONNECT_READ_RATE_LIMIT,
} from '../../../bootstrap/rate-limit';
import { ConnectLinkService } from '../application/connect-link.service';
import {
  ConnectLinkTokenGuard,
  type ConnectLinkRequest,
} from './connect-link-token.guard';

// E27 · P-086 · D-037 — rotas PÚBLICAS da página /conectar do painel. Sem login: a credencial é o
// token do link (ConnectLinkTokenGuard), que só dá acesso ao QR daquela sessão. Nunca devolvem
// nome, número, erro nem status bruto da sessão — só a fase calculada.
@UseGuards(ConnectLinkTokenGuard)
@Controller('public/connect')
export class PublicConnectController {
  constructor(private readonly links: ConnectLinkService) {}

  @Get()
  @RouteConfig({ rateLimit: PUBLIC_CONNECT_READ_RATE_LIMIT })
  @Header('Cache-Control', 'no-store')
  state(@Req() req: ConnectLinkRequest) {
    return this.links.publicState(req.connectLink!);
  }

  @Post('new-qr')
  @HttpCode(200)
  @RouteConfig({ rateLimit: PUBLIC_CONNECT_NEW_QR_RATE_LIMIT })
  @Header('Cache-Control', 'no-store')
  newQr(@Req() req: ConnectLinkRequest) {
    return this.links.requestNewQr(req.connectLink!);
  }
}

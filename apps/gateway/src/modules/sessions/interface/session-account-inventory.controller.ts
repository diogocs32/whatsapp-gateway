import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyAuthGuard } from '../../iam/interface/api-key-auth.guard';
import { RolesGuard } from '../../iam/interface/roles.guard';
import { SessionAccountInventoryService } from '../application/session-account-inventory.service';

@UseGuards(ApiKeyAuthGuard, RolesGuard)
@Controller('sessions/account-inventory')
export class SessionAccountInventoryController {
  constructor(private readonly inventory: SessionAccountInventoryService) {}

  // Um nível extra preserva GET /sessions/:id quando a sessão se chama account-inventory.
  @Get('snapshot')
  snapshot() {
    return this.inventory.snapshot();
  }
}

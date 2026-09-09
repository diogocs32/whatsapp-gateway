import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { clampInt } from '../../../shared-kernel/query-int';
import { AuditService } from '../application/audit.service';
import { JwtAuthGuard } from './auth.guard';
import { MinRole } from './roles.decorator';
import { RolesGuard } from './roles.guard';

// Consulta do audit log (F9.7) — OWNER + ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@MinRole('ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const take = clampInt(limit, 100, 1, 500);
    const skip = Math.max(Number(offset) || 0, 0);
    const rows = await this.audit.list(take, skip);
    return rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      ip: r.ip,
      at: r.createdAt.toISOString(),
    }));
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_REPOSITORY,
  type AuditEntry,
  type AuditLogRecord,
  type AuditRepository,
} from '../domain/audit.repository';

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly repo: AuditRepository,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.repo.create(entry);
  }

  list(limit: number, offset: number): Promise<AuditLogRecord[]> {
    return this.repo.list(limit, offset);
  }
}

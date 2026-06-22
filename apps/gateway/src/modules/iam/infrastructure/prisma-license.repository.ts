import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { LicenseRepository } from '../domain/license.repository';

const ID = 'singleton';

@Injectable()
export class PrismaLicenseRepository implements LicenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<string | null> {
    const row = await this.prisma.waLicense.findUnique({ where: { id: ID } });
    return row?.token ?? null;
  }

  async set(token: string): Promise<void> {
    await this.prisma.waLicense.upsert({
      where: { id: ID },
      create: { id: ID, token },
      update: { token, installedAt: new Date() },
    });
  }

  async clear(): Promise<void> {
    await this.prisma.waLicense.deleteMany({ where: { id: ID } });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { BrandingSettings } from '../domain/branding';
import type { BrandingRepository } from '../domain/branding.repository';

const ID = 'singleton';

@Injectable()
export class PrismaBrandingRepository implements BrandingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<BrandingSettings | null> {
    const row = await this.prisma.waBranding.findUnique({ where: { id: ID } });
    if (!row) return null;
    return {
      productName: row.productName,
      logoUrl: row.logoUrl,
      primaryColor: row.primaryColor,
      faviconUrl: row.faviconUrl,
    };
  }

  async set(b: BrandingSettings): Promise<void> {
    await this.prisma.waBranding.upsert({
      where: { id: ID },
      create: {
        id: ID,
        productName: b.productName,
        logoUrl: b.logoUrl,
        primaryColor: b.primaryColor,
        faviconUrl: b.faviconUrl,
      },
      update: {
        productName: b.productName,
        logoUrl: b.logoUrl,
        primaryColor: b.primaryColor,
        faviconUrl: b.faviconUrl,
      },
    });
  }
}

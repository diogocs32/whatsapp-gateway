import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_BRANDING, type BrandingSettings } from '../domain/branding';
import {
  BRANDING_REPOSITORY,
  type BrandingRepository,
} from '../domain/branding.repository';

@Injectable()
export class BrandingService {
  constructor(
    @Inject(BRANDING_REPOSITORY) private readonly repo: BrandingRepository,
  ) {}

  async get(): Promise<BrandingSettings> {
    return (await this.repo.get()) ?? DEFAULT_BRANDING;
  }

  async set(branding: BrandingSettings): Promise<BrandingSettings> {
    await this.repo.set(branding);
    return branding;
  }
}

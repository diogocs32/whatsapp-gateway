import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../bootstrap/config';
import {
  COMMUNITY_LICENSE,
  verifyLicense,
  type EffectiveLicense,
} from '../domain/license';
import {
  LICENSE_REPOSITORY,
  type LicenseRepository,
} from '../domain/license.repository';

@Injectable()
export class LicenseService implements OnModuleInit {
  private readonly logger = new Logger(LicenseService.name);
  private cached: EffectiveLicense = COMMUNITY_LICENSE;

  constructor(
    @Inject(LICENSE_REPOSITORY) private readonly repo: LicenseRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  // Licença efetiva (cache). No modo comunidade os limites vêm de MAX_SEATS/MAX_SESSIONS.
  effective(): EffectiveLicense {
    return this.cached;
  }

  // Recarrega do banco (ou do env LICENSE_KEY como bootstrap) e revalida.
  async reload(): Promise<EffectiveLicense> {
    const token =
      (await this.repo.get()) ??
      this.config.get('LICENSE_KEY', { infer: true }) ??
      null;
    this.cached = this.resolve(token);
    const l = this.cached;
    this.logger.log(
      l.valid
        ? `Licença válida: ${l.customer} (seats=${l.maxSeats}, sessions=${l.maxSessions})`
        : `Modo comunidade (${l.reason}) — seats=${l.maxSeats}, sessions=${l.maxSessions}`,
    );
    return l;
  }

  async install(token: string): Promise<EffectiveLicense> {
    const resolved = this.resolve(token);
    if (!resolved.valid) {
      throw new BadRequestException(`Licença inválida: ${resolved.reason}`);
    }
    await this.repo.set(token.trim());
    this.cached = resolved;
    this.logger.log(`Licença instalada: ${resolved.customer}`);
    return resolved;
  }

  async remove(): Promise<EffectiveLicense> {
    await this.repo.clear();
    return this.reload();
  }

  private resolve(token: string | null): EffectiveLicense {
    const l = verifyLicense(token, Date.now());
    if (l.community) {
      return {
        ...l,
        maxSeats: this.config.get('MAX_SEATS', { infer: true }),
        maxSessions: this.config.get('MAX_SESSIONS', { infer: true }),
      };
    }
    return l;
  }
}

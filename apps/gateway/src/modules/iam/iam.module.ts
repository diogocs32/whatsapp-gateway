import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../../bootstrap/config';
import { ApiKeyService } from './application/api-key.service';
import { AuditService } from './application/audit.service';
import { AuthSessionService } from './application/auth-session.service';
import { BrandingService } from './application/branding.service';
import { LicenseService } from './application/license.service';
import { TokenService } from './application/token.service';
import { UserService } from './application/user.service';
import { API_KEY_REPOSITORY } from './domain/api-key.repository';
import { AUDIT_REPOSITORY } from './domain/audit.repository';
import { BRANDING_REPOSITORY } from './domain/branding.repository';
import { LICENSE_REPOSITORY } from './domain/license.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/refresh-token.repository';
import { USER_REPOSITORY } from './domain/user.repository';
import { AdminSeeder } from './infrastructure/admin-seeder';
import { PrismaApiKeyRepository } from './infrastructure/prisma-api-key.repository';
import { PrismaAuditRepository } from './infrastructure/prisma-audit.repository';
import { PrismaBrandingRepository } from './infrastructure/prisma-branding.repository';
import { PrismaLicenseRepository } from './infrastructure/prisma-license.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { ApiKeyAuthGuard } from './interface/api-key-auth.guard';
import { ApiKeysController } from './interface/api-keys.controller';
import { AuthController } from './interface/auth.controller';
import { JwtAuthGuard } from './interface/auth.guard';
import { AuditController } from './interface/audit.controller';
import { AuditInterceptor } from './interface/audit.interceptor';
import { BrandingController } from './interface/branding.controller';
import { LicenseController } from './interface/license.controller';
import { RolesGuard } from './interface/roles.guard';
import { UsersController } from './interface/users.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }), // número (segundos)
        },
      }),
    }),
  ],
  controllers: [
    AuthController,
    ApiKeysController,
    UsersController,
    LicenseController,
    BrandingController,
    AuditController,
  ],
  providers: [
    AuthSessionService,
    TokenService,
    UserService,
    LicenseService,
    BrandingService,
    AuditService,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    RolesGuard,
    ApiKeyService,
    AdminSeeder,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    { provide: API_KEY_REPOSITORY, useClass: PrismaApiKeyRepository },
    { provide: LICENSE_REPOSITORY, useClass: PrismaLicenseRepository },
    { provide: BRANDING_REPOSITORY, useClass: PrismaBrandingRepository },
    { provide: AUDIT_REPOSITORY, useClass: PrismaAuditRepository },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  // Guards + LicenseService exportados: os módulos de API (sessions, …) os usam.
  exports: [
    JwtModule,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    RolesGuard,
    ApiKeyService,
    LicenseService,
  ],
})
export class IamModule {}

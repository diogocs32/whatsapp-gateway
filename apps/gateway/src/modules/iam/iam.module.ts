import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../../bootstrap/config';
import { ApiKeyService } from './application/api-key.service';
import { BrandingService } from './application/branding.service';
import { LicenseService } from './application/license.service';
import { LoginUseCase } from './application/login.usecase';
import { UserService } from './application/user.service';
import { API_KEY_REPOSITORY } from './domain/api-key.repository';
import { BRANDING_REPOSITORY } from './domain/branding.repository';
import { LICENSE_REPOSITORY } from './domain/license.repository';
import { USER_REPOSITORY } from './domain/user.repository';
import { AdminSeeder } from './infrastructure/admin-seeder';
import { PrismaApiKeyRepository } from './infrastructure/prisma-api-key.repository';
import { PrismaBrandingRepository } from './infrastructure/prisma-branding.repository';
import { PrismaLicenseRepository } from './infrastructure/prisma-license.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { ApiKeyAuthGuard } from './interface/api-key-auth.guard';
import { ApiKeysController } from './interface/api-keys.controller';
import { AuthController } from './interface/auth.controller';
import { JwtAuthGuard } from './interface/auth.guard';
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
  ],
  providers: [
    LoginUseCase,
    UserService,
    LicenseService,
    BrandingService,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    RolesGuard,
    ApiKeyService,
    AdminSeeder,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: API_KEY_REPOSITORY, useClass: PrismaApiKeyRepository },
    { provide: LICENSE_REPOSITORY, useClass: PrismaLicenseRepository },
    { provide: BRANDING_REPOSITORY, useClass: PrismaBrandingRepository },
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

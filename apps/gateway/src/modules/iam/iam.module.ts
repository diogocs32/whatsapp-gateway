import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../../bootstrap/config';
import { ApiKeyService } from './application/api-key.service';
import { LoginUseCase } from './application/login.usecase';
import { API_KEY_REPOSITORY } from './domain/api-key.repository';
import { USER_REPOSITORY } from './domain/user.repository';
import { AdminSeeder } from './infrastructure/admin-seeder';
import { PrismaApiKeyRepository } from './infrastructure/prisma-api-key.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { ApiKeyAuthGuard } from './interface/api-key-auth.guard';
import { ApiKeysController } from './interface/api-keys.controller';
import { AuthController } from './interface/auth.controller';
import { JwtAuthGuard } from './interface/auth.guard';
import { RolesGuard } from './interface/roles.guard';

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
  controllers: [AuthController, ApiKeysController],
  providers: [
    LoginUseCase,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    RolesGuard,
    ApiKeyService,
    AdminSeeder,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: API_KEY_REPOSITORY, useClass: PrismaApiKeyRepository },
  ],
  // Guards exportados: os módulos de API (sessions, messaging, …) os usam nos endpoints.
  exports: [JwtModule, JwtAuthGuard, ApiKeyAuthGuard, RolesGuard, ApiKeyService],
})
export class IamModule {}

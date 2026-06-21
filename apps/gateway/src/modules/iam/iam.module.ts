import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../../bootstrap/config';
import { LoginUseCase } from './application/login.usecase';
import { USER_REPOSITORY } from './domain/user.repository';
import { AdminSeeder } from './infrastructure/admin-seeder';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './interface/auth.controller';
import { JwtAuthGuard } from './interface/auth.guard';

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
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    JwtAuthGuard,
    AdminSeeder,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [JwtModule, JwtAuthGuard],
})
export class IamModule {}

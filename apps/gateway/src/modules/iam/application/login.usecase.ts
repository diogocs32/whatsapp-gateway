import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../../../shared-kernel/crypto';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../domain/user.repository';

export interface AuthUserDto {
  id: string;
  username: string;
  name: string;
  role: string;
}

export interface LoginResult {
  token: string;
  user: AuthUserDto;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute(
    username: string,
    password: string,
  ): Promise<LoginResult | null> {
    const user = await this.users.findByUsername(username);
    if (!user) return null;

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return null;

    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  }
}

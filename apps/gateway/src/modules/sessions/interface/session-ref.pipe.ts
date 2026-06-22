import {
  Inject,
  Injectable,
  NotFoundException,
  type PipeTransform,
} from '@nestjs/common';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from '../domain/session.repository';

// Resolve o parâmetro :id das rotas /sessions/:id/... aceitando o ID (ULID) OU o NOME da sessão.
// Assim integrações (n8n etc.) referenciam a sessão por um nome estável: se o número cair, basta
// recriar a sessão com o mesmo nome que a URL continua idêntica (mesmo comportamento da Evolution API).
@Injectable()
export class SessionRefPipe implements PipeTransform<string, Promise<string>> {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly repo: SessionRepository,
  ) {}

  async transform(value: string): Promise<string> {
    const session =
      (await this.repo.findById(value)) ?? (await this.repo.findByName(value));
    if (!session) {
      throw new NotFoundException(`Sessão não encontrada: ${value}`);
    }
    return session.id;
  }
}

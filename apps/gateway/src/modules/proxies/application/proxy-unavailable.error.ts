// Configuração sem saída elegível: não é permissão para usar o IP do servidor.
export class ProxyUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProxyUnavailableError';
  }
}

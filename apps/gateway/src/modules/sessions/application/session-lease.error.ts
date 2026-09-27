export class LeaseLostError extends Error {
  constructor() {
    super('A posse da sessão expirou ou foi transferida');
    this.name = 'LeaseLostError';
  }
}

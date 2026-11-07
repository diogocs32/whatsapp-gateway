// E30 (P-110, D-053) — o nome da sessão é @unique em `wa_sessions`: renomear para um nome já usado
// por OUTRA sessão falha aqui, como erro de domínio (a interface responde 409 sem conhecer o P2002
// do Prisma). `sessionName` (não `name`): `Error.name` é o nome da classe.
export class SessionNameTakenError extends Error {
  constructor(public readonly sessionName: string) {
    super(`Já existe uma sessão com o nome "${sessionName}"`);
    this.name = 'SessionNameTakenError';
  }
}

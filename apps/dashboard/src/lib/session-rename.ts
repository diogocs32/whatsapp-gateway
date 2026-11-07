// E30 (P-110, D-053) — renomear a sessão na própria linha da tela de Sessões. Puro (sem React/DOM)
// → testável em vitest `environment: 'node'`. Regras ESPELHO do gateway (`PATCH /api/sessions/
// {sessao}`, sessions/interface/dto.ts `sessionNameSchema` + @unique de wa_sessions.name): o
// gateway revalida tudo; aqui é só para o dono ver o erro óbvio sem esperar a ida ao servidor.
import { isValidSessionName } from './proxy-suggestion';

// Dica fixa sob o campo: o que muda e o que não muda ao renomear.
export const RENAME_HINT =
  'O id e a conexão não mudam. Integrações que usam o nome antigo (n8n, API) precisam passar a usar o novo.';
export const RENAME_INVALID =
  'Use apenas letras, números, _ ou - (1 a 64 caracteres).';
export const RENAME_TAKEN = 'Já existe uma sessão com esse nome.';

export type RenameCheck =
  | { kind: 'unchanged' }
  | { kind: 'invalid'; message: string }
  | { kind: 'taken'; message: string }
  | { kind: 'ok'; name: string };

export function checkRename(
  raw: string,
  current: { id: string; name: string },
  sessions: readonly { id: string; name: string }[],
): RenameCheck {
  const name = raw.trim();
  if (name === current.name) return { kind: 'unchanged' };
  if (!isValidSessionName(name)) {
    return { kind: 'invalid', message: RENAME_INVALID };
  }
  // Igual ao @unique: exato (caixa importa), na lista COMPLETA (nunca a filtrada do P-089), menos
  // a própria sessão (lista velha pode trazê-la ainda com o nome anterior).
  if (sessions.some((s) => s.id !== current.id && s.name === name)) {
    return { kind: 'taken', message: RENAME_TAKEN };
  }
  return { kind: 'ok', name };
}

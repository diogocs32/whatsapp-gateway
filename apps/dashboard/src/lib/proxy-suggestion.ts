// E26 (P-084, D-038) — sugestão de proxy no formulário "Nova sessão": ao recriar uma sessão com o
// nome de uma sessão apagada, o painel sugere o proxy fixo que ela usava (não obriga). Puro (sem
// React/DOM) → testável em vitest `environment: 'node'`.
//
// Tudo é DERIVADO na renderização a partir de (nome, resposta da sugestão, lista de selecionáveis,
// escolha do dono): a lista que chega depois da sugestão pré-seleciona sozinha, mudar o nome
// desfaz sozinho e a escolha manual é preservada. Invariante: o que se vê no seletor é o que se
// envia no POST (`selectValue` sempre existe nas opções, ou é '' = sem proxy).
// E28 (P-107, D-051): a lista deixou de ser só a dos livres — são os selecionáveis (habilitados e
// não-DEAD), livres (verde) e em uso (vermelho, compartilhável). A pré-seleção continua só para o
// sugerido LIVRE: compartilhar nunca é automático.
import type { ProxyDto, ProxySuggestionDto } from '@contracts';
import { fullDateTime, since } from './time-format';

// Mesmo formato do create no gateway (sessions/interface/dto.ts), aplicado ao nome já aparado.
export const SESSION_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidSessionName(trimmed: string): boolean {
  return SESSION_NAME_RE.test(trimmed);
}

// Resposta guardada junto do nome consultado: só vale enquanto o nome no campo for esse.
export interface SuggestionState {
  forName: string;
  data: ProxySuggestionDto | null;
}

export type SuggestionTone = 'suggest' | 'warn' | 'info';

export interface SuggestionNote {
  tone: SuggestionTone;
  text: string;
}

export interface SuggestionViewInput {
  trimmedName: string;
  suggestion: SuggestionState | null;
  // Habilitados e não-DEAD (livres e em uso), em ordem de posição — E28.
  selectableProxies: readonly ProxyDto[];
  // null = automático (aceita a pré-seleção); '' = o dono escolheu "Sem proxy"; id = escolha manual.
  choice: string | null;
  now: number;
  // O "Criar" foi segurado para mostrar a sugestão deste nome (Enter antes da resposta).
  held?: boolean;
  // E28 — quem usa cada proxy segundo a lista do pool (recarregada ao abrir o seletor, mais nova
  // que a resposta da sugestão). Sugerido "livre" que a lista mostra em uso NÃO é pré-selecionado
  // (compartilhar nunca é automático): vira o aviso de "em uso", com o nome de quem usa.
  inUseBy?: (proxyId: string) => readonly string[];
}

export interface SuggestionView {
  // Selecionáveis ∪ o sugerido disponível que ainda não está na lista (lista velha: o servidor
  // acabou de aplicar a mesma régua do `ensureAvailable` e o POST revalida).
  options: ProxyDto[];
  selectValue: string;
  preselectId: string | null;
  // Id do proxy sugerido quando ele está livre (sufixo " · sugerido" e botão "Usar este proxy").
  suggestedId: string | null;
  note: SuggestionNote | null;
  canApplySuggestion: boolean;
  manualChoiceLost: boolean;
}

const PREFIX: Record<SuggestionTone, string> = {
  suggest: 'Sugestão: ',
  warn: 'Atenção: ',
  info: '',
};

const DAY_MS = 24 * 60 * 60 * 1000;

// "#3 · BR-01" ou só "#3" quando o proxy não tem rótulo.
export function proxyShortLabel(
  p: Pick<ProxyDto, 'position' | 'label'>,
): string {
  return p.label ? `#${p.position} · ${p.label}` : `#${p.position}`;
}

// "apagada há 3 min" (até 24 h) ou "apagada em 27/09/2026, 14:05".
function releasedText(releasedAt: string, now: number): string {
  return now - Date.parse(releasedAt) < DAY_MS
    ? `apagada ${since(releasedAt, now)}`
    : `apagada em ${fullDateTime(releasedAt)}`;
}

// `"vendas" (apagada há 3 min)` — com o aviso de caixa quando o nome digitado difere.
function sessionRef(
  data: ProxySuggestionDto,
  trimmedName: string,
  now: number,
): string {
  const caseNote =
    data.fromSession !== trimmedName
      ? ' — com maiúsculas/minúsculas diferentes'
      : '';
  return `"${data.fromSession}" (${releasedText(data.releasedAt, now)}${caseNote})`;
}

// Frase para uma sugestão que NÃO pode ser pré-selecionada agora. `proxy` só é lido quando não é
// null. `pickable` (E28): o proxy em uso está na lista e pode ser escolhido para compartilhar.
function unavailableText(
  data: ProxySuggestionDto,
  ref: string,
  pickable: boolean,
): string {
  if (!data.proxy || data.reason === 'REMOVED') {
    return `A sessão ${ref} usava um proxy que foi excluído do pool.`;
  }
  const base = `A sessão ${ref} usava o ${proxyShortLabel(data.proxy)}`;
  switch (data.reason) {
    case 'IN_USE': {
      const inUse = data.inUseBySession
        ? `${base}, mas ele já está em uso pela sessão "${data.inUseBySession}".`
        : `${base}, mas ele já está em uso por outra sessão.`;
      return pickable
        ? `${inUse} Para compartilhar, escolha-o na lista (em vermelho).`
        : inUse;
    }
    case 'DEAD':
      return `${base}, mas ele está fora do ar (DEAD). Teste-o em Proxies para voltar a usá-lo.`;
    case 'DISABLED':
      return `${base}, mas ele está desabilitado em Proxies.`;
    default:
      return `${base}, mas ele não está livre agora.`;
  }
}

export function suggestionView(input: SuggestionViewInput): SuggestionView {
  const { trimmedName, selectableProxies, choice, now } = input;
  const raw =
    input.suggestion && input.suggestion.forName === trimmedName
      ? input.suggestion.data
      : null;
  const listUsers = raw?.proxy ? (input.inUseBy?.(raw.proxy.id) ?? []) : [];
  const data: ProxySuggestionDto | null =
    raw?.available && listUsers.length > 0
      ? {
          ...raw,
          available: false,
          reason: 'IN_USE',
          inUseBySession: listUsers[0],
        }
      : raw;
  const suggested = data?.available && data.proxy ? data.proxy : null;

  const options = [...selectableProxies];
  if (suggested && !options.some((p) => p.id === suggested.id)) {
    // Entra na ordem de posição (a lista do servidor vem ordenada por `position`).
    const at = options.findIndex((p) => p.position > suggested.position);
    options.splice(at === -1 ? options.length : at, 0, suggested);
  }
  const inOptions = (id: string) => options.some((p) => p.id === id);

  const preselectId = choice === null && suggested ? suggested.id : null;
  const want = choice ?? preselectId ?? '';
  const selectValue = want === '' || inOptions(want) ? want : '';
  const manualChoiceLost =
    choice !== null && choice !== '' && !inOptions(choice);
  const canApplySuggestion =
    suggested !== null && choice !== null && choice !== suggested.id;

  let tone: SuggestionTone | null = null;
  let body = '';
  if (data) {
    const ref = sessionRef(data, trimmedName, now);
    if (suggested && (choice === null || choice === suggested.id)) {
      tone = 'suggest';
      body =
        input.held && choice === null
          ? `${proxyShortLabel(suggested)} era o proxy da sessão ${ref} — confira e clique em Criar de novo.`
          : `${proxyShortLabel(suggested)} era o proxy da sessão ${ref}. Pode trocar se quiser.`;
    } else if (suggested) {
      tone = 'info';
      body = `A sessão ${ref} usava o ${proxyShortLabel(suggested)}, que está livre.`;
    } else {
      tone = 'warn';
      body = unavailableText(
        data,
        ref,
        !!data.proxy && data.reason === 'IN_USE' && inOptions(data.proxy.id),
      );
    }
  }

  let note: SuggestionNote | null = null;
  if (manualChoiceLost) {
    // E28: a lista traz livres e em uso — some só o excluído, desativado ou DEAD.
    const lost =
      'O proxy escolhido não está mais disponível (excluído, desativado ou DEAD).';
    note = {
      tone: 'warn',
      text: `${PREFIX.warn}${body ? `${lost} ${body}` : lost}`,
    };
  } else if (tone) {
    note = { tone, text: `${PREFIX[tone]}${body}` };
  }

  return {
    options,
    selectValue,
    preselectId,
    suggestedId: suggested?.id ?? null,
    note,
    canApplySuggestion,
    manualChoiceLost,
  };
}

// Segurar o "Criar" para consultar a sugestão na hora (Enter logo depois de digitar o nome): só
// no modo automático, com nome válido e livre, e se a sugestão desse nome ainda não chegou.
export function mustHoldCreate(input: {
  trimmedName: string;
  choice: string | null;
  resolvedFor: string | null;
  nameTaken?: boolean;
}): boolean {
  return (
    input.choice === null &&
    !input.nameTaken &&
    isValidSessionName(input.trimmedName) &&
    input.resolvedFor !== input.trimmedName
  );
}

// Decisão do "Criar" segurado depois da consulta (E26/P-084). Regra: a sessão nunca nasce com um
// proxy diferente do que o dono via ao clicar sem ele confirmar.
// - Nome mudou na espera → não cria (abort).
// - `data` undefined (erro, 403 do OPERATOR, estouro do teto) → vale o que está na tela AGORA
//   (`cur.selectValue`), que pode ter mudado se a resposta do debounce chegou na espera.
// - Com dados → vale o `view` recalculado com a resposta nova.
// Automático (o dono não mexeu no seletor) e o valor final difere do visto no clique → segura
// (a tela mostra o aviso "confira e clique em Criar de novo"); senão cria com o valor final.
export type HoldDecision =
  | { action: 'abort' }
  | { action: 'hold' }
  | { action: 'create'; proxyId: string };

export function decideAfterHold(input: {
  shown: string; // valor do seletor no clique
  trimmed: string; // nome no clique
  currentTrimmed: string; // nome agora
  data: ProxySuggestionDto | null | undefined; // undefined = erro/teto
  cur: { proxyChoice: string | null; selectValue: string };
  view: Pick<SuggestionView, 'selectValue'> | null; // suggestionView com `data` (null se undefined)
}): HoldDecision {
  if (input.currentTrimmed !== input.trimmed) return { action: 'abort' };
  const finalValue =
    input.data === undefined || !input.view
      ? input.cur.selectValue
      : input.view.selectValue;
  if (input.cur.proxyChoice === null && finalValue !== input.shown) {
    return { action: 'hold' };
  }
  return { action: 'create', proxyId: finalValue };
}

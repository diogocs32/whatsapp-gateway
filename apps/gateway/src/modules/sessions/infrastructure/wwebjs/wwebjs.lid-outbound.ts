// Conserto do "No LID for user" no ENVIO (31/08/2026): o WhatsApp migra contas para o
// endereçamento @lid e, quando o chip remetente também migrou, o findOrCreateLatestChat da
// própria página lança esse erro ao receber o jid clássico `<num>@c.us` de um alvo sem
// mapeamento PN→LID no Store local. Upstream sem fix (whatsapp-web.js issue #3834, aberta
// desde set/2025; os PRs de correção foram fechados sem merge). Estratégia REATIVA: o envio
// tenta o PN como sempre e, SÓ quando a página lança este erro, o LID é resolvido no Store
// LOCAL e a operação retenta uma vez via @lid — zero mudança para tudo que já funciona.
//
// POLÍTICA (dono, 31/08): nenhuma consulta de existência no caminho de envio. Por isso o
// resolvedor injetado NÃO usa enforceLidAndPnRetrieval nem getNumberId — o fallback deles é
// WAWebQueryExistsJob.queryWidExists, o contact-check de rede que arrisca ban de chip
// (conferido na lib instalada, src/util/Injected/Utils.js:1806-1820). Alvo sem LID local é
// insolúvel sem rede: o erro original sobe (falha honesta, igual a hoje).

// Assinatura do erro da página (produção 31/08: {"type":"Error","message":"No LID for user"};
// via pupPage.evaluate pode vir embrulhado: "Evaluation failed: Error: No LID for user ...").
export function isNoLidForUserError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  return /no lid for user/i.test(msg);
}

// Só jid individual clássico é elegível ao reroteio — grupo, broadcast e @lid seguem intactos.
export function canRetryViaLid(jid: string): boolean {
  return jid.endsWith('@c.us');
}

// Dependências do fallback — o engine liga os caches/resolvedor reais; o spec injeta mocks e
// pina os invariantes.
export interface LidFallbackDeps {
  getMapped: (pnJid: string) => string | undefined;
  forget: (pnJid: string) => void;
  resolve: (pnJid: string) => Promise<string | null>;
  remember: (pnJid: string, lid: string) => void;
  onRetryError?: (
    pnJid: string,
    lid: string,
    original: unknown,
    retryErr: unknown,
  ) => void;
}

// Máquina de decisão do fallback, pura e testável. Invariantes (pinados no spec):
// 1. Erro que NÃO é "No LID for user" (ou jid não elegível) sobe INTACTO — mesma instância.
// 2. Store local sem o LID → o ERRO ORIGINAL sobe (falha honesta, igual a antes do patch).
// 3. Nada é memorizado sem operação PROVADA: a lib resolve null/undefined sem lançar quando
//    não obtém o chat (Client.js:1596-1617) — null no retry NÃO memoriza e sobe o erro
//    original (senão o TypeError posterior do caller mascararia a causa e envenenaria o mapa).
// 4. Mapeamento memorizado que falha (throw) é esquecido e o erro sobe; que resolve null é
//    esquecido e a MESMA chamada refaz pelo PN (nada foi enviado — o null significa exatamente
//    que a página não obteve o chat).
export async function withLidFallback<T>(
  pnJid: string,
  op: (jid: string) => Promise<T>,
  deps: LidFallbackDeps,
): Promise<T> {
  const mapped = deps.getMapped(pnJid);
  if (mapped) {
    try {
      const out = await op(mapped);
      if (out != null) return out;
      deps.forget(pnJid); // não se prova mais → segue no caminho normal do PN abaixo
    } catch (e) {
      deps.forget(pnJid); // auto-cura: a próxima chamada volta ao PN
      throw e;
    }
  }
  try {
    return await op(pnJid);
  } catch (e) {
    if (!canRetryViaLid(pnJid) || !isNoLidForUserError(e)) throw e;
    const lid = await deps.resolve(pnJid);
    if (!lid) throw e; // invariante 2
    let out: T;
    try {
      out = await op(lid);
    } catch (retryErr) {
      deps.onRetryError?.(pnJid, lid, e, retryErr);
      throw retryErr;
    }
    if (out == null) throw e; // invariante 3
    deps.remember(pnJid, lid);
    return out;
  }
}

// Função INJETADA na página via Puppeteer (serializada — precisa ser autocontida; os tipos são
// apagados na compilação, só o corpo JS viaja). Lookup 100% LOCAL: getCurrentLid e
// getAlternateUserWid leem o Store já sincronizado e devolvem undefined quando não sabem —
// nunca vão à rede (são exatamente o 1º passo, local, do enforceLidAndPnRetrieval da lib, SEM
// o fallback queryWidExists). Qualquer módulo ausente ou erro → null. `@hosted.lid` é
// deliberadamente recusado (endsWith('@lid') não casa) — só reroteia para LID clássico.
export const pageResolvePnToLid = (pnJid: string): string | null => {
  try {
    const g = globalThis as {
      require?: (m: string) => {
        createWid?: (s: string) => unknown;
        getCurrentLid?: (w: unknown) => unknown;
        getAlternateUserWid?: (w: unknown) => unknown;
      };
    };
    if (typeof g.require !== 'function') return null;
    const lidOf = (w: unknown): string | null => {
      if (!w || typeof w !== 'object') return null;
      const s = (w as { _serialized?: unknown })._serialized;
      return typeof s === 'string' && s.endsWith('@lid') ? s : null;
    };
    const wf = g.require('WAWebWidFactory');
    const api = g.require('WAWebApiContact');
    if (typeof wf?.createWid !== 'function' || !api) return null;
    const wid = wf.createWid(pnJid);
    let lid: string | null = null;
    try {
      lid =
        typeof api.getCurrentLid === 'function'
          ? lidOf(api.getCurrentLid(wid))
          : null;
    } catch {
      lid = null;
    }
    if (!lid) {
      try {
        lid =
          typeof api.getAlternateUserWid === 'function'
            ? lidOf(api.getAlternateUserWid(wid))
            : null;
      } catch {
        lid = null;
      }
    }
    return lid;
  } catch {
    return null;
  }
};

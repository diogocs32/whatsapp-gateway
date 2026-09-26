import { describe, expect, it } from 'vitest';
import type { ConversationDto, ForwardResultDto } from '@contracts';
// Contrato ida e volta com o GATEWAY (fonte das regras do encaminhar — E24/D-030): as cópias daqui
// (tipos encaminháveis, limites, destino canônico, repetidos pelo 9º dígito) são conferidas contra
// os arquivos reais. Import dinâmico com o caminho numa variável: o vitest resolve, e o tsc do painel
// (DOM, sem @types/node) não arrasta arquivos do gateway.
type GwDestination =
  { key: string; candidates: string[]; kind: string } | { error: string };
type GatewayForward = {
  FORWARDABLE_TYPES: ReadonlySet<string>;
  canonicalDestination: (raw: string) => GwDestination;
  findDuplicate: (dests: GwDestination[]) => [string, string] | null;
};
type GatewayPort = {
  MAX_FORWARD_TARGETS: number;
  FREQUENTLY_FORWARDED_MIN: number;
};
const GW_DECISION = new URL(
  '../../../gateway/src/modules/messaging/application/forward.decision.ts',
  import.meta.url,
).href;
const GW_PORT = new URL(
  '../../../gateway/src/modules/sessions/application/engine.port.ts',
  import.meta.url,
).href;
const gw = (await import(/* @vite-ignore */ GW_DECISION)) as GatewayForward;
const port = (await import(/* @vite-ignore */ GW_PORT)) as GatewayPort;
import { FREQUENTLY_FORWARDED_MIN } from './message-format';
import {
  FORWARDABLE_TYPES,
  MAX_FORWARD_TARGETS,
  attemptSummary,
  canForward,
  canQuickForward,
  destinationOf,
  foldText,
  forwardFailure,
  forwardTargets,
  forwardedNotice,
  allClean,
  maxGroupsFor,
  maxTargetsFor,
  mergeOutcomes,
  willBecomeFrequent,
  newForwardKey,
  outcomeOf,
  planAttempt,
  refusalText,
  resultsFromError,
  resultsVerdict,
  sameDestination,
  searchTargets,
  toggleTarget,
  type ForwardTarget,
} from './forward';

const conv = (
  chatJid: string,
  name: string | null = null,
  extra: Partial<ConversationDto> = {},
): ConversationDto => ({
  chatJid,
  name,
  imgUrl: null,
  lastText: null,
  lastType: 'text',
  lastFromMe: false,
  lastTimestamp: '2026-09-26T08:00:00.000Z',
  ...extra,
});

const res = (over: Partial<ForwardResultDto>): ForwardResultDto => ({
  target: '5511988887777@s.whatsapp.net',
  to: null,
  ok: false,
  id: null,
  deduped: false,
  cold: false,
  idempotencyKey: null,
  ...over,
});

describe('regras espelhadas do gateway (ida e volta)', () => {
  it('tipos encaminháveis e limites iguais aos do gateway', () => {
    expect([...FORWARDABLE_TYPES].sort()).toEqual(
      [...gw.FORWARDABLE_TYPES].sort(),
    );
    expect(MAX_FORWARD_TARGETS).toBe(port.MAX_FORWARD_TARGETS);
    expect(FREQUENTLY_FORWARDED_MIN).toBe(port.FREQUENTLY_FORWARDED_MIN);
  });

  const JIDS = [
    '5511988887777@s.whatsapp.net',
    '551188887777@s.whatsapp.net',
    '5511988887777:12@s.whatsapp.net',
    '5511988887777@c.us',
    '14155550123@s.whatsapp.net',
    '123456789@s.whatsapp.net', // curto demais
    '1234567890123456@c.us', // longo demais
    '120363025246125486@g.us',
    '5511988887777-1600000000@g.us',
    'abc@g.us',
    '98765432109876@lid',
    '98765432109876:3@lid',
    'x1@lid',
    'status@broadcast',
    '120363025246125486@newsletter',
    '13135550002@bot',
    '5511988887777@hosted',
    'semarroba',
  ];

  it('destinationOf aceita e recusa o mesmo que o canonicalDestination', () => {
    for (const j of JIDS) {
      const mine = destinationOf(j);
      const theirs = gw.canonicalDestination(j);
      if ('error' in theirs) {
        expect(mine, j).toBeNull();
      } else {
        expect(mine, j).not.toBeNull();
        expect(mine!.key, j).toBe(theirs.key);
        expect(mine!.kind, j).toBe(theirs.kind);
        expect([...mine!.candidates].sort(), j).toEqual(
          [...theirs.candidates].sort(),
        );
      }
    }
  });

  it('sameDestination bate com o findDuplicate (9º dígito, sufixos, aparelho)', () => {
    const ok = JIDS.filter(
      (j) => !('error' in gw.canonicalDestination(j)) && j.includes('@'),
    );
    for (const a of ok) {
      for (const b of ok) {
        if (a === b) continue;
        const theirs =
          gw.findDuplicate([
            gw.canonicalDestination(a),
            gw.canonicalDestination(b),
          ]) !== null;
        expect(
          sameDestination(destinationOf(a)!, destinationOf(b)!),
          `${a} × ${b}`,
        ).toBe(theirs);
      }
    }
  });
});

describe('canForward / canQuickForward', () => {
  it('só os tipos que o gateway encaminha', () => {
    for (const type of FORWARDABLE_TYPES) {
      const text =
        type === 'location'
          ? 'Escritório\nhttps://maps.google.com/?q=-23.5,-46.6'
          : 'x';
      expect(canForward({ type, text }), type).toBe(true);
    }
    for (const type of [
      'poll',
      'event',
      'group_invite',
      'poll_vote',
      'other',
      'novo',
    ]) {
      expect(canForward({ type, text: 'x' }), type).toBe(false);
    }
  });

  it('texto vazio ou miniatura legada = "não suportada" → sem ação', () => {
    expect(canForward({ type: 'text', text: null })).toBe(false);
    expect(canForward({ type: 'text', text: '   ' })).toBe(false);
    expect(canForward({ type: 'text', text: `/9j/${'A'.repeat(80)}` })).toBe(
      false,
    );
    expect(canForward({ type: 'text', text: 'oi' })).toBe(true);
  });

  it('wwebjs `other` com arquivo continua fora (o gateway decide pelo type)', () => {
    expect(
      canForward({ type: 'other', text: null, mediaType: 'document' }),
    ).toBe(false);
  });

  it('mídia sem legenda e vCard legado entram', () => {
    expect(canForward({ type: 'image', text: null, mediaType: 'image' })).toBe(
      true,
    );
    expect(
      canForward({ type: 'text', text: 'BEGIN:VCARD\nFN:Ana\nEND:VCARD' }),
    ).toBe(true);
  });

  it('atalho ↪ como o do WhatsApp Web: mídia, localização e contato — sem voz/figurinha/"com frequência"', () => {
    for (const t of ['image', 'video', 'document']) {
      expect(canQuickForward({ type: t, text: null, mediaType: t }), t).toBe(
        true,
      );
    }
    for (const t of ['audio', 'sticker']) {
      expect(canQuickForward({ type: t, text: null, mediaType: t }), t).toBe(
        false,
      );
    }
    expect(canQuickForward({ type: 'location', text: 'X' })).toBe(true);
    expect(
      canQuickForward({ type: 'contact', text: 'Ana — 5511988887777' }),
    ).toBe(true);
    expect(canQuickForward({ type: 'text', text: 'oi' })).toBe(false);
    expect(
      canQuickForward({ type: 'other', text: null, mediaType: 'image' }),
    ).toBe(false);
    expect(
      canQuickForward({
        type: 'image',
        text: null,
        mediaType: 'image',
        forwardingScore: 5,
      }),
    ).toBe(false);
    expect(
      canQuickForward({
        type: 'image',
        text: null,
        mediaType: 'image',
        forwardingScore: 4,
      }),
    ).toBe(true);
  });
});

describe('maxGroupsFor / willBecomeFrequent (regras do WhatsApp)', () => {
  it('mensagem que já veio encaminhada: só 1 grupo', () => {
    expect(maxGroupsFor({})).toBe(5);
    expect(maxGroupsFor({ isForwarded: false, forwardingScore: null })).toBe(5);
    expect(maxGroupsFor({ isForwarded: true })).toBe(1);
    expect(maxGroupsFor({ forwardingScore: 2 })).toBe(1);
  });
  it('aviso quando a cópia vai virar "com frequência" (terceiro com contador 4)', () => {
    expect(willBecomeFrequent({ fromMe: false, forwardingScore: 4 })).toBe(
      true,
    );
    expect(willBecomeFrequent({ fromMe: true, forwardingScore: 4 })).toBe(
      false,
    );
    expect(willBecomeFrequent({ fromMe: false, forwardingScore: 3 })).toBe(
      false,
    );
    expect(willBecomeFrequent({ fromMe: false, forwardingScore: 5 })).toBe(
      false,
    );
    expect(willBecomeFrequent({ fromMe: false })).toBe(false);
  });
});

describe('maxTargetsFor', () => {
  it('5; 1 quando a original tem forwardingScore ≥ 5', () => {
    expect(maxTargetsFor({})).toBe(5);
    expect(maxTargetsFor({ forwardingScore: null })).toBe(5);
    expect(maxTargetsFor({ forwardingScore: 4 })).toBe(5);
    expect(maxTargetsFor({ forwardingScore: 5 })).toBe(1);
    expect(maxTargetsFor({ forwardingScore: 127 })).toBe(1);
  });
});

describe('forwardTargets', () => {
  const list = forwardTargets([
    conv('5511988887777@s.whatsapp.net', 'João Silva'),
    conv('5511977776666:3@s.whatsapp.net', null),
    conv('120363025246125486@g.us', 'Equipe Vendas'),
    conv('98765432109876@lid', null),
    conv('status@broadcast', 'Status'),
    conv('120363025246125486@newsletter', 'Canal'),
    conv('5511988887777@c.us', 'João de novo'), // mesma chave → fica a 1ª
  ]);

  it('descarta o que o gateway recusa e a mesma conversa repetida, mantendo a ordem', () => {
    expect(list.map((t) => t.jid)).toEqual([
      '5511988887777@s.whatsapp.net',
      '5511977776666@s.whatsapp.net',
      '120363025246125486@g.us',
      '98765432109876@lid',
    ]);
  });

  it('rótulos: nome + telefone; sem nome = telefone formatado; grupo; lid', () => {
    const [joao, semNome, grupo, lid] = list;
    expect(joao).toMatchObject({
      name: 'João Silva',
      detail: '+55 11 98888-7777',
      kind: 'phone',
    });
    expect(semNome).toMatchObject({ name: '+55 11 97777-6666', detail: null });
    expect(grupo).toMatchObject({
      name: 'Equipe Vendas',
      detail: 'Grupo',
      kind: 'group',
      digits: '',
    });
    expect(lid).toMatchObject({ kind: 'lid', digits: '' });
  });

  it('busca sem acento, por nome ou por número (com ou sem formatação)', () => {
    expect(foldText('  JOÃO Ção ')).toBe('joao cao');
    expect(searchTargets(list, 'joao').map((t) => t.name)).toEqual([
      'João Silva',
    ]);
    expect(searchTargets(list, 'VENDAS').map((t) => t.name)).toEqual([
      'Equipe Vendas',
    ]);
    expect(searchTargets(list, '(11) 97777').map((t) => t.jid)).toEqual([
      '5511977776666@s.whatsapp.net',
    ]);
    expect(searchTargets(list, '98888-7777').map((t) => t.name)).toEqual([
      'João Silva',
    ]);
    // dígitos de LID/grupo não são telefone: só casam pelo NOME exibido (o LID sem nome aparece com
    // os próprios dígitos, como na lista do Inbox)
    expect(searchTargets(list, '9876543210').map((t) => t.kind)).toEqual([
      'lid',
    ]);
    expect(searchTargets(list, '')).toHaveLength(4);
    expect(searchTargets(list, 'ninguém')).toEqual([]);
  });
});

describe('toggleTarget', () => {
  const ts = forwardTargets([
    conv('5511988887777@s.whatsapp.net', 'A'),
    conv('551188887777@s.whatsapp.net', 'A fixo'), // gêmeo do 9º dígito
    conv('5511911112222@s.whatsapp.net', 'B'),
    conv('5511933334444@s.whatsapp.net', 'C'),
    conv('120363025246125486@g.us', 'G'),
  ]);
  const [a, aTwin, b, c, g] = ts;

  it('marca e desmarca na ordem', () => {
    let s: ForwardTarget[] = [];
    s = toggleTarget(s, b, 5).selected;
    s = toggleTarget(s, a, 5).selected;
    expect(s.map((t) => t.name)).toEqual(['B', 'A']);
    s = toggleTarget(s, b, 5).selected;
    expect(s.map((t) => t.name)).toEqual(['A']);
  });

  it('recusa o gêmeo do 9º dígito (o gateway daria 400)', () => {
    const r = toggleTarget([a], aTwin, 5);
    expect(r.selected).toEqual([a]);
    expect(r.refused).toEqual({ reason: 'duplicate', other: a });
    expect(refusalText(r.refused!)).toMatch(
      /^A já está marcado — é o mesmo número/,
    );
  });

  it('respeita o limite (5, ou 1 com "encaminhada com frequência")', () => {
    const full = [a, b, c, g];
    expect(
      toggleTarget(
        full,
        forwardTargets([conv('5511955556666@s.whatsapp.net')])[0],
        4,
      ).refused,
    ).toEqual({
      reason: 'limit',
      max: 4,
    });
    const one = toggleTarget([b], c, 1);
    expect(one.selected).toEqual([b]);
    expect(refusalText(one.refused!)).toBe(
      'As mensagens encaminhadas com frequência podem ser compartilhadas com apenas 1 conversa por vez.',
    );
    expect(refusalText({ reason: 'limit', max: 5 })).toBe(
      'Você só pode compartilhar com até 5 conversas.',
    );
  });

  it('mensagem já encaminhada: o 2º grupo é recusado', () => {
    const g2 = forwardTargets([conv('120363000000000001@g.us', 'G2')])[0];
    const r = toggleTarget([a, g], g2, 5, 1);
    expect(r.refused).toEqual({ reason: 'groups' });
    expect(refusalText(r.refused!)).toBe(
      'Você pode enviar mensagens encaminhadas para apenas uma conversa em grupo por vez.',
    );
    expect(toggleTarget([a], g2, 5, 1).refused).toBeNull();
    expect(toggleTarget([g], b, 5, 1).refused).toBeNull(); // contato continua livre
  });
});

describe('planAttempt (idempotencyKey por clique)', () => {
  const ts = forwardTargets([
    conv('5511988887777@s.whatsapp.net', 'A'),
    conv('5511911112222@s.whatsapp.net', 'B'),
    conv('120363025246125486@g.us', 'G'),
  ]);
  let n = 0;
  const gen = () => `k${++n}`;

  it('mesmo pedido (mesma mensagem e conjunto, em qualquer ordem) reaproveita a chave', () => {
    const first = planAttempt(null, 'm1', [ts[0], ts[1]], gen);
    const again = planAttempt(first, 'm1', [ts[1], ts[0]], gen);
    expect(again.key).toBe(first.key);
    expect(again.to).toEqual([
      '5511911112222@s.whatsapp.net',
      '5511988887777@s.whatsapp.net',
    ]);
  });

  it('conjunto ou mensagem diferente → chave nova', () => {
    const first = planAttempt(null, 'm1', [ts[0], ts[1]], gen);
    expect(planAttempt(first, 'm1', [ts[0]], gen).key).not.toBe(first.key);
    expect(planAttempt(first, 'm1', [ts[0], ts[1], ts[2]], gen).key).not.toBe(
      first.key,
    );
    expect(planAttempt(first, 'm2', [ts[0], ts[1]], gen).key).not.toBe(
      first.key,
    );
  });

  it('newForwardKey cabe na chave derivada do gateway (≤ 200 com o destino)', () => {
    const k = newForwardKey();
    expect(k).toMatch(/^painel-fwd-[0-9a-f-]{36}$/);
    expect(
      `${k}:120363025246125486-1600000000@g.us`.length,
    ).toBeLessThanOrEqual(200);
  });
});

describe('outcomeOf', () => {
  it('enviada, repetição, sem confirmação e tempo esgotado ficam travadas (nunca reenviar)', () => {
    expect(outcomeOf(res({ ok: true, id: 'X' }))).toMatchObject({
      kind: 'sent',
      locked: true,
      retry: false,
    });
    expect(outcomeOf(res({ ok: true, deduped: true }))).toMatchObject({
      kind: 'already',
      locked: true,
    });
    const u = outcomeOf(res({ ok: true, confirmed: false }));
    expect(u).toMatchObject({
      kind: 'unconfirmed',
      locked: true,
      retry: false,
    });
    expect(u.text).toMatch(/não reenvie/);
    for (const error of [
      'o envio não respondeu a tempo — confira no celular antes de tentar de novo',
      'Encaminhar no WhatsApp Web não respondeu em 30 s — confira no celular antes de tentar de novo.',
    ]) {
      expect(outcomeOf(res({ status: 400, error }))).toMatchObject({
        kind: 'unknown',
        locked: true,
        retry: false,
      });
    }
  });

  it('423: 1º contato × pedido inteiro bloqueado', () => {
    expect(
      outcomeOf(res({ status: 423, cold: true, code: 'SESSION_QUARANTINED' }))
        .text,
    ).toMatch(/1º contato .* guard-rail bloqueou o aparelho/);
    expect(outcomeOf(res({ status: 423, cold: false })).text).toMatch(
      /bloqueou o encaminhamento inteiro/,
    );
    expect(outcomeOf(res({ status: 423 })).retry).toBe(false);
  });

  it('409 em andamento pede espera e deixa tentar de novo', () => {
    expect(outcomeOf(res({ status: 409, error: 'x' }))).toMatchObject({
      kind: 'failed',
      retry: true,
    });
  });

  it('recusas da MENSAGEM: motivo curto na linha, sem retry', () => {
    expect(
      outcomeOf(res({ status: 400, code: 'FORWARD_LIMIT', error: 'x' })).text,
    ).toBe(
      'As mensagens encaminhadas com frequência podem ser compartilhadas com apenas 1 conversa por vez.',
    );
    const o = outcomeOf(
      res({
        status: 400,
        code: 'FORWARD_UNSUPPORTED',
        error:
          'Esta mensagem não pode ser encaminhada pelo gateway (visualização única).',
      }),
    );
    expect(o).toEqual({
      kind: 'failed',
      text: 'Não enviada — visualização única; encaminhe pelo celular.',
      locked: false,
      retry: false,
    });
    expect(
      outcomeOf(
        res({
          status: 400,
          code: 'FORWARD_UNSUPPORTED',
          error: 'sem parênteses',
        }),
      ).text,
    ).toBe('Não enviada — mensagem sem suporte; encaminhe pelo celular.');
    expect(
      outcomeOf(
        res({
          status: 400,
          code: 'FORWARD_SOURCE_UNAVAILABLE',
          error: 'longo…',
        }),
      ).text,
    ).toBe(
      'Não enviada — a original não está mais disponível; encaminhe pelo celular.',
    );
    expect(outcomeOf(res({ status: 400, code: 'FORWARD_LIMIT' })).retry).toBe(
      false,
    );
  });

  it('falha de envio genérica mostra o motivo do servidor e deixa tentar de novo', () => {
    expect(
      outcomeOf(res({ status: 400, error: 'Sessão não conectada' })),
    ).toEqual({
      kind: 'failed',
      text: 'Não enviada: Sessão não conectada',
      locked: false,
      retry: true,
    });
    expect(outcomeOf(res({})).text).toBe('Não enviada: erro 400');
  });
});

describe('attemptSummary', () => {
  it('tudo ok, parcial, sem confirmação e nada', () => {
    expect(
      attemptSummary([res({ ok: true }), res({ ok: true, deduped: true })]),
    ).toEqual({
      tone: 'ok',
      text: 'Encaminhada para 2 conversas.',
    });
    expect(
      attemptSummary([res({ ok: true }), res({ status: 400, error: 'x' })]),
    ).toEqual({
      tone: 'partial',
      text: 'Encaminhada para 1 conversa; 1 conversa não recebeu — veja abaixo.',
    });
    expect(attemptSummary([res({ ok: true, confirmed: false })])).toEqual({
      tone: 'partial',
      text: '1 conversa sem confirmação do WhatsApp — veja abaixo. Confira no celular antes de encaminhar de novo.',
    });
    expect(
      attemptSummary([
        res({ ok: true }),
        res({ ok: true }),
        res({
          status: 400,
          error:
            'o envio não respondeu a tempo — confira no celular antes de tentar de novo',
        }),
        res({ status: 409 }),
        res({ status: 409 }),
      ]).text,
    ).toBe(
      'Encaminhada para 2 conversas; 1 conversa sem resposta a tempo (pode ter saído); 2 conversas não receberam — veja abaixo. Confira no celular antes de encaminhar de novo.',
    );
    expect(
      attemptSummary([res({ status: 423 }), res({ status: 423 })]),
    ).toEqual({
      tone: 'error',
      text: 'Não foi encaminhada para nenhuma das 2 conversas.',
    });
  });
});

describe('forwardFailure', () => {
  it('sem status (rede): tentar de novo não duplica', () => {
    expect(forwardFailure({ message: 'Failed to fetch' }, 'v')).toMatchObject({
      retry: true,
      results: null,
    });
    expect(forwardFailure(null, 'v').text).toMatch(/não reenvia o que já saiu/);
  });

  it('423 conta os destinos de 1º contato e não oferece retry', () => {
    const body = {
      code: 'SESSION_QUARANTINED',
      state: 'quarentena',
      results: [
        res({ status: 423, cold: true }),
        res({ status: 423, cold: false }),
        res({ status: 423, cold: true }),
        // replay de um pedido anterior: já saiu, não conta como destino a tirar
        res({ ok: true, deduped: true, cold: true }),
      ],
    };
    const f = forwardFailure(
      { status: 423, code: 'SESSION_QUARANTINED', message: 'q', body },
      'vendas',
    );
    expect(f.text).toBe(
      'Nada foi enviado: o aparelho vendas está em quarentena (guard-rail) e 2 destinos são 1º contato (sem conversa). Tire esses destinos para encaminhar só a quem já conversa com você, ou encaminhe pelo celular.',
    );
    expect(f.results).toHaveLength(4);
    expect(f.retry).toBe(false);
    expect(
      forwardFailure(
        { status: 423, body: { results: [res({ status: 423, cold: true })] } },
        'v',
      ).text,
    ).toMatch(/1 destino é 1º contato .* Tire esse destino para/);
  });

  it('aparelho desconectado (as 3 grafias do gateway)', () => {
    for (const message of [
      'Sessão não iniciada',
      'Sessão não está conectada',
      'Sessão não conectada',
    ]) {
      expect(
        forwardFailure(
          { status: 400, code: 'FORWARD_FAILED', message },
          'vendas',
        ).text,
        message,
      ).toBe(
        'Não encaminhada: o aparelho vendas não está conectado a este servidor.',
      );
    }
  });

  it('recusas antes de enviar (code) e 404: travam o ➤ (final) ou limitam a 1', () => {
    expect(
      forwardFailure(
        {
          status: 400,
          code: 'FORWARD_UNSUPPORTED',
          message:
            'Esta mensagem não pode ser encaminhada pelo gateway (enquete).',
        },
        'v',
      ),
    ).toEqual({
      text: 'Esta mensagem não pode ser encaminhada pelo gateway (enquete). Se precisar, encaminhe pelo celular.',
      results: null,
      retry: false,
      final: true,
    });
    // o texto do gateway já manda encaminhar pelo celular → não repete
    const src =
      'A original desta mensagem não está mais guardada no gateway (mais de 7 dias ou recebida antes da atualização) — sem ela só texto pode ser encaminhado. Encaminhe pelo celular.';
    expect(
      forwardFailure(
        { status: 400, code: 'FORWARD_SOURCE_UNAVAILABLE', message: src },
        'v',
      ).text,
    ).toBe(src);
    expect(
      forwardFailure(
        { status: 400, code: 'FORWARD_LIMIT', message: 'só 1' },
        'v',
      ),
    ).toMatchObject({
      limitOne: true,
      retry: false,
    });
    expect(
      forwardFailure(
        { status: 400, code: 'FORWARD_LIMIT', message: 'só 1' },
        'v',
      ).text,
    ).toMatch(/^As mensagens encaminhadas com frequência/);
    expect(
      forwardFailure({ status: 404, message: 'Mensagem não encontrada' }, 'v'),
    ).toMatchObject({
      final: true,
      retry: false,
    });
    expect(
      forwardFailure({ status: 404, message: 'Mensagem não encontrada' }, 'v')
        .text,
    ).toMatch(/retenção/);
    // 404 que não é da mensagem (sessão apagada, gateway sem a rota): motivo do servidor
    expect(
      forwardFailure(
        {
          status: 404,
          message: 'Cannot POST /api/sessions/x/messages/y/forward',
        },
        'v',
      ),
    ).toMatchObject({
      text: 'Não encaminhada: Cannot POST /api/sessions/x/messages/y/forward',
      final: true,
    });
    expect(forwardFailure({ status: 423 }, 'v').final).toBeUndefined();
  });

  it('409 de conflito de chave pede chave nova (a mesma daria 409 para sempre)', () => {
    const f = forwardFailure(
      {
        status: 409,
        message:
          'idempotencyKey já usada nesta sessão com outro destinatário/conteúdo — use uma chave nova',
      },
      'v',
    );
    expect(f).toMatchObject({ retry: true, resetKey: true, results: null });
    expect(
      forwardFailure(
        {
          status: 409,
          message:
            'envio com esta idempotencyKey em andamento — retente em instantes',
        },
        'v',
      ).resetKey,
    ).toBeUndefined();
  });

  it('409, 429 e 5xx deixam tentar o mesmo pedido', () => {
    for (const status of [409, 429, 500, 502]) {
      expect(forwardFailure({ status }, 'v').retry, String(status)).toBe(true);
    }
  });

  it('400 genérico: motivo do servidor; retry só se algum item permite', () => {
    expect(
      forwardFailure(
        { status: 400, message: 'Destino inválido "x": número inválido' },
        'v',
      ),
    ).toEqual({
      text: 'Não encaminhada: Destino inválido "x": número inválido',
      results: null,
      retry: false,
    });
    expect(
      forwardFailure(
        {
          status: 400,
          code: 'FORWARD_FAILED',
          message: 'y',
          body: { results: [res({ status: 400, error: 'y' })] },
        },
        'v',
      ).retry,
    ).toBe(true);
  });

  it('resultsFromError valida o corpo', () => {
    expect(
      resultsFromError({ body: { results: [{ target: 'a', ok: false }] } }),
    ).toHaveLength(1);
    expect(resultsFromError({ body: { results: [{ ok: false }] } })).toBeNull();
    expect(resultsFromError({ body: { results: 'x' } })).toBeNull();
    expect(resultsFromError({ body: null })).toBeNull();
    expect(resultsFromError(undefined)).toBeNull();
  });
});

describe('forwardedNotice', () => {
  it('1, 2 e muitos', () => {
    expect(forwardedNotice([])).toBe('Você encaminhou 1 item.');
    expect(forwardedNotice(['Ana'])).toBe('Você encaminhou 1 item para Ana.');
    expect(forwardedNotice(['Ana', 'Bia'])).toBe(
      'Você encaminhou 1 item para Ana e Bia.',
    );
    expect(forwardedNotice(['Ana', 'Bia', 'Cau'])).toBe(
      'Você encaminhou 1 item para Ana e mais 2 conversas.',
    );
  });
});

describe('resultsVerdict', () => {
  it('recusa da mensagem, limite vivo e o que vale repetir', () => {
    expect(resultsVerdict([res({ ok: true })])).toEqual({
      final: false,
      limitOne: false,
      retry: false,
      uncertain: false,
    });
    expect(
      resultsVerdict([
        res({ ok: true, deduped: true }),
        res({
          status: 400,
          code: 'FORWARD_UNSUPPORTED',
          error: 'x (apagada).',
        }),
      ]),
    ).toEqual({ final: true, limitOne: false, retry: false, uncertain: false });
    expect(
      resultsVerdict([res({ status: 400, code: 'FORWARD_SOURCE_UNAVAILABLE' })])
        .final,
    ).toBe(true);
    expect(
      resultsVerdict([res({ status: 400, code: 'FORWARD_LIMIT' })]).limitOne,
    ).toBe(true);
    expect(
      resultsVerdict([res({ status: 409 }), res({ status: 423, cold: true })]),
    ).toEqual({
      final: false,
      limitOne: false,
      retry: true,
      uncertain: true, // 409 "em andamento" num destino: só o MESMO pedido pode ser repetido
    });
    expect(resultsVerdict([res({ status: 423 })]).retry).toBe(false);
    expect(
      resultsVerdict([
        res({
          status: 409,
          error:
            'idempotencyKey já usada nesta sessão com outro destinatário/conteúdo — use uma chave nova',
        }),
      ]).uncertain,
    ).toBe(false);
  });
});

describe('mergeOutcomes / allClean', () => {
  const ts = forwardTargets([
    conv('5511988887777@s.whatsapp.net', 'A'),
    conv('120363025246125486@g.us', 'G'),
  ]);
  const att = planAttempt(null, 'm', ts, () => 'k');

  it('casa cada resultado pelo target (ordem trocada não confunde) e soma ao que já se sabia', () => {
    const first = mergeOutcomes(
      new Map(),
      [
        res({ target: '120363025246125486@g.us', status: 409 }),
        res({ target: '5511988887777@s.whatsapp.net', ok: true }),
      ],
      att,
    );
    expect(first.get('5511988887777')?.kind).toBe('sent');
    expect(first.get('120363025246125486@g.us')?.kind).toBe('failed');
    expect(allClean(['5511988887777', '120363025246125486@g.us'], first)).toBe(
      false,
    );
    const retry = planAttempt(att, 'm', [ts[1]], () => 'k2');
    const second = mergeOutcomes(
      first,
      [res({ target: '120363025246125486@g.us', ok: true, deduped: true })],
      retry,
    );
    expect(allClean(['5511988887777', '120363025246125486@g.us'], second)).toBe(
      true,
    );
    expect(first.get('120363025246125486@g.us')?.kind).toBe('failed'); // não muta o anterior
  });

  it('target desconhecido cai na posição; sem conversa marcada não é "limpo"', () => {
    const m = mergeOutcomes(new Map(), [res({ target: '???', ok: true })], att);
    expect(m.get('5511988887777')?.kind).toBe('sent');
    expect(allClean([], m)).toBe(false);
    expect(
      allClean(
        ['5511988887777'],
        mergeOutcomes(
          new Map(),
          [
            res({
              target: '5511988887777@s.whatsapp.net',
              ok: true,
              confirmed: false,
            }),
          ],
          att,
        ),
      ),
    ).toBe(false);
  });
});

// ---- Casos da revisão adversarial da E25 (mutantes que sobreviviam + achados confirmados) --------
describe('revisão E25', () => {
  const TIMEOUT =
    'o envio não respondeu a tempo — confira no celular antes de tentar de novo';

  it('423 diz o estado real do guard-rail (quarentena, banida, pausa manual)', () => {
    const r = [res({ status: 423, cold: true })];
    const t = (state?: string) =>
      forwardFailure(
        {
          status: 423,
          code: 'SESSION_QUARANTINED',
          body: { state, results: r },
        },
        'vendas',
      ).text;
    expect(t('quarentena')).toMatch(
      /^Nada foi enviado: o aparelho vendas está em quarentena/,
    );
    expect(t('banida')).toMatch(/está banido \(guard-rail\)/);
    expect(t('pausa_manual')).toMatch(/está em pausa manual/);
    expect(t(undefined)).toMatch(/está bloqueado \(guard-rail\)/);
  });

  it('desfecho incerto congela o pedido (sem resposta, 5xx, 409 em andamento); 429 não', () => {
    expect(forwardFailure({ message: 'Failed to fetch' }, 'v').uncertain).toBe(
      true,
    );
    expect(
      forwardFailure({ status: 502, message: 'Bad Gateway' }, 'v'),
    ).toMatchObject({
      uncertain: true,
      retry: true,
      results: null,
    });
    expect(
      forwardFailure(
        {
          status: 409,
          message:
            'envio com esta idempotencyKey em andamento — retente em instantes',
        },
        'v',
      ).uncertain,
    ).toBe(true);
    expect(forwardFailure({ status: 429 }, 'v').uncertain).toBeUndefined();
    expect(
      forwardFailure({ status: 423, body: { results: [] } }, 'v').uncertain,
    ).toBeUndefined();
  });

  it('falha com results[] resume destino a destino — nunca "Não encaminhada" sobre um "pode ter saído"', () => {
    const f = forwardFailure(
      {
        status: 400,
        code: 'FORWARD_FAILED',
        message: 'Nenhum destino recebeu o encaminhamento — veja results[]',
        body: {
          results: [
            res({
              target: '5511988887777@s.whatsapp.net',
              status: 400,
              error: TIMEOUT,
            }),
            res({
              target: '5511911112222@s.whatsapp.net',
              status: 400,
              error: 'x',
            }),
          ],
        },
      },
      'v',
    );
    expect(f.text).toBe(
      '1 conversa sem resposta a tempo (pode ter saído); 1 conversa não recebeu — veja abaixo. Confira no celular antes de encaminhar de novo.',
    );
    expect(f.text).not.toMatch(/results\[\]/);
    expect(f.results).toHaveLength(2);
    expect(f.retry).toBe(true);
    // o destino incerto fica travado ao juntar o resultado
    const ts = forwardTargets([
      conv('5511988887777@s.whatsapp.net', 'A'),
      conv('5511911112222@s.whatsapp.net', 'B'),
    ]);
    const att = planAttempt(null, 'm', ts, () => 'k');
    const merged = mergeOutcomes(new Map(), f.results!, att);
    expect(merged.get('5511988887777')).toMatchObject({
      kind: 'unknown',
      locked: true,
    });
    expect(merged.get('5511911112222')).toMatchObject({
      kind: 'failed',
      locked: false,
    });
  });

  it('allClean nunca aceita "pode ter saído"', () => {
    const ts = forwardTargets([conv('5511988887777@s.whatsapp.net', 'A')]);
    const att = planAttempt(null, 'm', ts, () => 'k');
    const m = mergeOutcomes(
      new Map(),
      [
        res({
          target: '5511988887777@s.whatsapp.net',
          status: 400,
          error: TIMEOUT,
        }),
      ],
      att,
    );
    expect(allClean(['5511988887777'], m)).toBe(false);
  });

  it('attemptSummary com "pode ter saído" sozinho e junto de enviada', () => {
    expect(
      attemptSummary([res({ ok: true }), res({ status: 400, error: TIMEOUT })]),
    ).toEqual({
      tone: 'partial',
      text: 'Encaminhada para 1 conversa; 1 conversa sem resposta a tempo (pode ter saído) — veja abaixo. Confira no celular antes de encaminhar de novo.',
    });
    expect(attemptSummary([res({ status: 400, error: TIMEOUT })])).toEqual({
      tone: 'partial',
      text: '1 conversa sem resposta a tempo (pode ter saído) — veja abaixo. Confira no celular antes de encaminhar de novo.',
    });
  });

  it('busca só com dígitos também acha pelo nome ("Turma 2024")', () => {
    const ts = forwardTargets([
      conv('120363025246125486@g.us', 'Turma 2024'),
      conv('5511988887777@s.whatsapp.net', 'Ana'),
    ]);
    expect(searchTargets(ts, '2024').map((t) => t.name)).toEqual([
      'Turma 2024',
    ]);
    expect(searchTargets(ts, '98888').map((t) => t.name)).toEqual(['Ana']);
  });
});

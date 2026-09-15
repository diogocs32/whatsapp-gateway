import { describe, expect, it } from 'vitest';
import { deriveTriageStatus, type TriageInput } from './triage-status';

const t = (iso: string) => new Date(iso);

function conv(over: Partial<TriageInput> = {}): TriageInput {
  // Padrão: chegou mensagem do contato e ninguém respondeu nem marcou nada → vermelho.
  return {
    lastFromMe: false,
    lastInboundKeyId: 'IN-1',
    lastInboundTimestamp: t('2026-09-15T12:00:00Z'),
    triageKeyId: null,
    triageTimestamp: null,
    ...over,
  };
}

describe('deriveTriageStatus (semáforo da caixa única)', () => {
  it('última mensagem é do contato e nada foi feito → pending (🔴)', () => {
    expect(deriveTriageStatus(conv())).toBe('pending');
  });

  it('respondi pelo CELULAR (fromMe, source=phone) → answered (🟢) sem tocar no painel', () => {
    expect(deriveTriageStatus(conv({ lastFromMe: true }))).toBe('answered');
  });

  it('marquei "não preciso responder" na entrada atual → ignored (🟡)', () => {
    expect(
      deriveTriageStatus(
        conv({
          triageKeyId: 'IN-1',
          triageTimestamp: t('2026-09-15T12:05:00Z'),
        }),
      ),
    ).toBe('ignored');
  });

  it('REGRA DE OURO: entrada NOVA depois do amarelo → volta a pending (🔴)', () => {
    expect(
      deriveTriageStatus(
        conv({
          lastInboundKeyId: 'IN-2',
          lastInboundTimestamp: t('2026-09-15T13:00:00Z'),
          triageKeyId: 'IN-1',
          triageTimestamp: t('2026-09-15T12:05:00Z'),
        }),
      ),
    ).toBe('pending');
  });

  it('REGRA DE OURO: entrada NOVA depois de respondido → volta a pending (🔴)', () => {
    expect(
      deriveTriageStatus(conv({ lastFromMe: false, lastInboundKeyId: 'IN-3' })),
    ).toBe('pending');
  });

  it('resposta vence a marca amarela: respondi depois de ter marcado → answered (🟢)', () => {
    expect(
      deriveTriageStatus(
        conv({
          lastFromMe: true,
          triageKeyId: 'IN-1',
          triageTimestamp: t('2026-09-15T12:05:00Z'),
        }),
      ),
    ).toBe('answered');
  });

  it('marca sem keyId (âncora por tempo): entrada mais nova invalida, entrada antiga não', () => {
    const marcado = {
      triageKeyId: null,
      triageTimestamp: t('2026-09-15T12:30:00Z'),
    };
    expect(
      deriveTriageStatus(
        conv({
          ...marcado,
          lastInboundKeyId: null,
          lastInboundTimestamp: t('2026-09-15T12:00:00Z'),
        }),
      ),
    ).toBe('ignored');
    expect(
      deriveTriageStatus(
        conv({
          ...marcado,
          lastInboundKeyId: null,
          lastInboundTimestamp: t('2026-09-15T13:00:00Z'),
        }),
      ),
    ).toBe('pending');
  });

  it('keyId da entrada desconhecido mas marca com keyId → decide pelo tempo (não trava em 🟡)', () => {
    expect(
      deriveTriageStatus(
        conv({
          lastInboundKeyId: null,
          lastInboundTimestamp: t('2026-09-15T14:00:00Z'),
          triageKeyId: 'IN-1',
          triageTimestamp: t('2026-09-15T12:05:00Z'),
        }),
      ),
    ).toBe('pending');
  });
});

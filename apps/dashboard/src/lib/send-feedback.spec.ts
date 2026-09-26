import { describe, expect, it } from 'vitest';
import { deviceBlockReason, sendErrorMessage } from './send-feedback';

describe('deviceBlockReason', () => {
  it('trava a resposta quando o aparelho não consegue enviar', () => {
    for (const status of [
      'STOPPED',
      'STARTING',
      'SCAN_QR_CODE',
      'PAIRING_CODE',
      'FAILED',
    ] as const) {
      expect(deviceBlockReason({ name: 'vendas', status })).toMatch(
        /^O aparelho vendas está .+ — responda pelo celular/,
      );
    }
  });
  it('WORKING, DEGRADED e aparelho desconhecido não travam', () => {
    expect(deviceBlockReason({ name: 'v', status: 'WORKING' })).toBeNull();
    expect(deviceBlockReason({ name: 'v', status: 'DEGRADED' })).toBeNull();
    expect(deviceBlockReason(undefined)).toBeNull();
    expect(deviceBlockReason(null)).toBeNull();
  });
});

describe('sendErrorMessage', () => {
  it('"Sessão não iniciada" vira aparelho desconectado', () => {
    expect(
      sendErrorMessage(
        { status: 400, message: 'Sessão não iniciada' },
        'vendas',
      ),
    ).toBe(
      'Não enviada: o aparelho vendas não está conectado a este servidor. O texto ficou no campo.',
    );
  });
  it('quarentena (423), rate-limit (429), rede e genérico', () => {
    expect(
      sendErrorMessage({ status: 423, message: 'Sessão em quarentena' }, 'v'),
    ).toBe('Não enviada: Sessão em quarentena. O texto ficou no campo.');
    expect(sendErrorMessage({ status: 429 }, 'v')).toMatch(/espere um minuto/);
    expect(sendErrorMessage({ message: 'Failed to fetch' }, 'v')).toMatch(
      /sem conexão com o servidor/,
    );
    expect(sendErrorMessage(null, 'v')).toMatch(/sem conexão/);
    expect(sendErrorMessage({ status: 500, message: '' }, 'v')).toBe(
      'Não enviada: erro 500. O texto ficou no campo — tentar de novo não duplica.',
    );
    expect(
      sendErrorMessage({ status: 400, message: 'to inválido' }, 'v'),
    ).toMatch(/^Não enviada: to inválido\./);
  });
});

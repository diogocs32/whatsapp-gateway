import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/bootstrap/config';

// D-007 — regressão da pegadinha do z.coerce.boolean(): "false"/"0" viravam TRUE.
// Estes testes travam a semântica dos booleans de env (DB_SSL, GUARDRAIL_ENFORCE,
// S3_FORCE_PATH_STYLE): ligado = true/1/yes/on · desligado = false/0/no/off ·
// ausente/vazio = default · inválido = boot falha com o nome da variável.

const baseEnv = {
  DB_HOST: 'localhost',
  DB_USER: 'gateway',
  DB_NAME: 'gateway',
  REDIS_HOST: 'localhost',
  JWT_SECRET: 'segredo-de-teste-com-32-caracteres!',
  DASHBOARD_PASSWORD: 'senha-forte',
};

describe('validateEnv — booleans de env (D-007)', () => {
  it('ausentes usam o default: enforce=false, ssl=false, pathStyle=true', () => {
    const env = validateEnv({ ...baseEnv });
    expect(env.GUARDRAIL_ENFORCE).toBe(false);
    expect(env.DB_SSL).toBe(false);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('"false" e "0" DESLIGAM (antes viravam true — a pegadinha)', () => {
    const env = validateEnv({
      ...baseEnv,
      GUARDRAIL_ENFORCE: 'false',
      S3_FORCE_PATH_STYLE: '0',
      DB_SSL: 'off',
    });
    expect(env.GUARDRAIL_ENFORCE).toBe(false);
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    expect(env.DB_SSL).toBe(false);
  });

  it('"true"/"1"/"on" LIGAM, aceitando maiúsculas e espaços', () => {
    const env = validateEnv({
      ...baseEnv,
      GUARDRAIL_ENFORCE: ' TRUE ',
      DB_SSL: 'on',
      S3_FORCE_PATH_STYLE: '1',
    });
    expect(env.GUARDRAIL_ENFORCE).toBe(true);
    expect(env.DB_SSL).toBe(true);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('string vazia cai no default (equivale a não definir)', () => {
    const env = validateEnv({ ...baseEnv, GUARDRAIL_ENFORCE: '' });
    expect(env.GUARDRAIL_ENFORCE).toBe(false);
  });

  it('valor não reconhecido derruba o boot citando a variável (fail-fast)', () => {
    expect(() =>
      validateEnv({ ...baseEnv, GUARDRAIL_ENFORCE: 'talvez' }),
    ).toThrow(/GUARDRAIL_ENFORCE/);
  });
});

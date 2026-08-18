/**
 * Fronteiras de módulo do gateway (M3) — codifica ARQUITETURA.md §"Regras de dependência".
 * Levantamento prévio (18/08/2026): todas as regras abaixo passam no código atual — qualquer
 * violação nova é regressão de fronteira, não legado.
 *
 * Doc oficial: https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md
 * (group matching `$1` em from.path → to.pathNot é feature documentada — rules-reference.md).
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'sem-ciclos',
      comment:
        'Dependência circular entre arquivos — sinal de fronteira errada (ARQUITETURA §Regras).',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'modulo-nao-importa-internals-alheios',
      comment:
        'Módulo NÃO importa domain/ nem infrastructure/ de OUTRO módulo — só o público ' +
        '(providers de application/, guards/pipes de interface/, arquivos de raiz de módulo flat). ' +
        'ARQUITETURA: "módulo → internals de outro módulo: proibido".',
      severity: 'error',
      from: { path: '^apps/gateway/src/modules/([^/]+)/' },
      to: {
        path: '^apps/gateway/src/modules/[^/]+/(domain|infrastructure)/',
        pathNot: '^apps/gateway/src/modules/$1/',
      },
    },
    {
      name: 'shared-kernel-independente',
      comment:
        'shared-kernel não importa modules/** (ARQUITETURA: "shared-kernel → módulo: proibido").',
      severity: 'error',
      from: { path: '^apps/gateway/src/shared-kernel' },
      to: { path: '^apps/gateway/src/modules' },
    },
    {
      name: 'infra-nao-importa-modulos',
      comment:
        'infra/ são adapters de mundo externo — não importam modules/** (ARQUITETURA: ' +
        '"infra → módulo: proibido"; a exceção D-002.3 do directory é de ESCRITA em tabela, ' +
        'não de import — conferido no levantamento de 18/08).',
      severity: 'error',
      from: { path: '^apps/gateway/src/infra' },
      to: { path: '^apps/gateway/src/modules' },
    },
    {
      name: 'src-nao-importa-testes',
      comment: 'Código de produção não importa arquivos de teste e2e.',
      severity: 'error',
      from: { path: '^apps/gateway/src' },
      to: { path: '^apps/gateway/test' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^apps/gateway/src/generated' },
    moduleSystems: ['es6', 'cjs'],
    // imports type-only também contam como dependência de fronteira
    tsPreCompilationDeps: true,
    // sem tsConfig: o gateway não usa path aliases — todos os imports internos são relativos
    // (conferido 18/08: zero imports não-relativos internos), e o parse do tsconfig em
    // subdiretório falha com TS18003 a partir da raiz
  },
};

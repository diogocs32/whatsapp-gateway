#!/usr/bin/env node
/**
 * Checagem de advisories de REPOSITÓRIO do GitHub (P-054, 25/09/2026).
 *
 * Por que existe: o `npm audit` consulta só o GitHub Advisory Database global. Advisory publicado
 * apenas no repositório do mantenedor fica invisível — ex.: GHSA-9c5c-9qcx-q35q (nestjs/nest,
 * @nestjs/platform-fastify < 11.2.4, `ecosystem` vazio, 404 na base global). Em 25/09/2026 eram 12
 * advisories de repositório afetando o lockfile, 10 invisíveis ao `npm audit`.
 *
 * O que faz: para cada repo de scripts/checar-advisories.config.json lista
 * `GET /repos/{owner}/{repo}/security-advisories?state=published` (paginação pelo header Link) e:
 *   - tipo "npm":     casa cada pacote citado com TODAS as cópias do package-lock.json;
 *   - tipo "runtime": avalia o componente embutido no Node (o `fetch` do gateway usa o undici do
 *                     Node, fora do lockfile). Com `imagem`, a versão do Node vem do `FROM node:X.Y.Z`
 *                     do Dockerfile de produção e a do undici, de deps/undici no repo nodejs/node
 *                     naquela tag; sem pin, cai no Node que roda o script;
 *   - tipo "infra":   com `producao` conhecida avalia as faixas; sem ela (B-007) lista os
 *                     high/critical recentes e só falha com notícia posterior a `reconhecidoEm`.
 * Como ler, aceitar e reconhecer: docs/how-to/checar-advisories.md.
 *
 * Uso:
 *   node scripts/checar-advisories.mjs                  → relatório markdown no stdout
 *   node scripts/checar-advisories.mjs --informativo    → pendência não quebra (só exit 2)
 *   node scripts/checar-advisories.mjs --json <arq>     → também grava o resultado em JSON
 *   node scripts/checar-advisories.mjs --config <arq> --lockfile <arq>   (simulações)
 *   node scripts/checar-advisories.mjs --autoteste      → casos reais do comparador, offline
 *   GITHUB_STEP_SUMMARY=<arq> …                         → anexa o relatório ao resumo do job
 * Token: GITHUB_TOKEN, GH_TOKEN, `gh auth token` ou nenhum (60 req/h — não cabe numa rodada).
 *
 * Saída: 0 = nada pendente · 1 = advisory afetando/indeterminado sem aceite válido, ou infra
 * high/critical nova não reconhecida · 2 = erro de consulta/config (nunca verde por silêncio).
 *
 * Sem dependências: o `semver` resolvível na raiz é 6.3.1 transitivo de dev e não entende as
 * faixas em texto livre dos advisories de repositório — comparador próprio abaixo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PADRAO = path.join(ROOT, 'scripts/checar-advisories.config.json');
const LOCK_PADRAO = path.join(ROOT, 'package-lock.json');
const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const PARALELO = 6;
const LIMITE_RESUMO = 1_000_000; // GITHUB_STEP_SUMMARY aceita até 1 MiB por step
const SEV_ORDEM = { critical: 0, high: 1, medium: 2, moderate: 2, low: 3 };

// ================================================================ versões (SemVer 2.0.0 §11)

const RE_VER =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/;
const RE_PARCIAL = /^v?(\d+)(?:\.(\d+))?$/;

function parseVer(s) {
  const m = RE_VER.exec(String(s ?? '').trim());
  if (!m) return null;
  return {
    nums: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ? m[4].split('.') : [],
  };
}

// "8" / "8.2" → 8.0.0 / 8.2.0. Só é usado onde completar com zeros é EXATO: piso (>=, e o piso
// implícito de "1 <=1.28.1") e teto estrito (<). Em <=, > e = o parcial seria faixa-x → recusado.
function parseParcial(s) {
  const m = RE_PARCIAL.exec(String(s ?? '').trim());
  return m ? { nums: [Number(m[1]), Number(m[2] ?? 0), 0], pre: [] } : null;
}

// Precedência SemVer §11: identificador numérico compara como número e fica abaixo do
// alfanumérico, que compara em ASCII. Resolve os rc REAIS do Baileys no npm — 7.0.0-rc.1…rc.9
// (com ponto) e rc10…rc14 (sem ponto): rc.9 < rc10 porque 'rc' < 'rc10' em ASCII. Não há ordem
// "natural": nenhuma versão publicada a exige (a 7.0.0-rc5 sem ponto não existe).
function cmpId(a, b) {
  const an = /^\d+$/.test(a);
  const bn = /^\d+$/.test(b);
  if (an && bn) return Number(a) - Number(b);
  if (an) return -1;
  if (bn) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function cmpVer(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a.nums[i] !== b.nums[i]) return a.nums[i] - b.nums[i];
  }
  if (!a.pre.length || !b.pre.length) return b.pre.length - a.pre.length; // pré-release < final
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    const c = cmpId(a.pre[i], b.pre[i]);
    if (c) return c;
  }
  return 0;
}

// ================================================================ faixas em texto livre

const OPS = {
  '<': (c) => c < 0,
  '<=': (c) => c <= 0,
  '>': (c) => c > 0,
  '>=': (c) => c >= 0,
  '=': (c) => c === 0,
};
const PISO = new Set(['>', '>=']);
const TETO = new Set(['<', '<=']);
const bate = (v, c) => OPS[c.op](cmpVer(v, c.v));

function normalizar(raw) {
  return String(raw ?? '')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/=</g, '<=')
    .replace(/=>/g, '>=')
    .replace(/={2,}/g, '=')
    .replace(/\bv(?=\d)/gi, '')
    .trim();
}

/**
 * Faixa → alternativas (OU explícito: "||", ";" ou "or"), cada uma com os comparadores (vírgula,
 * "and" e espaço) e os intervalos que eles formam; null se algo não for interpretável ("All",
 * "TBD", "6.2.x", "2.2 or newer", "RELEASE.2023-…" — viram 'indeterminada', o lado seguro).
 * Formatos reais (25/09/2026): ">= 3.0.0, < 3.1.8" · "=< 11.1.17" · "≤ v0.29.4" · "==8.0.0" ·
 * "< 8.2.2; 9.0.0" (versão solta = exata) · "4.0.0 < 4.1.2; 3.0.0 < 3.1.5" e "1 <=1.28.1"
 * (versão solta antes de teto = piso implícito) · ">= 12.0.0 < 12.0.2 and < 11.2.4" ·
 * "< 12.0.3 || < 11.2.5" · "<7.0.0-rc12,<6.7.22" · ">= 1.1.0 < 5.2.5, >= 6.0.0 < 6.2.4, …".
 */
function parseFaixa(raw) {
  const s = normalizar(raw);
  if (!s) return null;
  const alternativas = [];
  for (const pedaco of s.split(/\|\||;|\bor\b/i)) {
    const alt = pedaco
      .replace(/\band\b/gi, ',')
      .replace(/(<=|>=|<|>|=)/g, ' $1')
      .replace(/(<=|>=|<|>|=)\s+/g, '$1')
      .trim();
    if (!alt) continue;
    const tokens = alt.split(/[\s,]+/).filter(Boolean);
    const comps = [];
    for (let i = 0; i < tokens.length; i++) {
      const [, opTok, resto] = /^(<=|>=|<|>|=)?(.*)$/.exec(tokens[i]);
      let op = opTok;
      let v;
      if (op) {
        v =
          parseVer(resto) ??
          (op === '>=' || op === '<' ? parseParcial(resto) : null);
      } else if (/^<=?[^=]/.test(tokens[i + 1] ?? '')) {
        op = '>=';
        v = parseVer(resto) ?? parseParcial(resto);
      } else {
        op = '=';
        v = parseVer(resto);
      }
      if (!v) return null;
      comps.push({ op, v });
    }
    if (!comps.length) return null;
    alternativas.push({ comps, intervalos: agrupar(comps) });
  }
  return alternativas.length ? alternativas : null;
}

// Comparadores → intervalos. Caso padrão do GitHub (">= a, < b"): no máximo um piso e um teto,
// em qualquer ordem. Com mais de um, na ordem escrita: cada piso abre um intervalo, o teto
// seguinte o fecha; teto sem piso aberto vira "teto solto" (tudo abaixo dele). Piso MAIOR que o
// teto (">= 12.0.0, < 11.2.4", "9.0.0, < 8.2.2") não tem leitura em E: vira os dois semi-intervalos
// (a união, a leitura mais abrangente) marcados como ambíguos (regra C em `avaliar`).
function agrupar(comps) {
  const pisos = comps.filter((c) => PISO.has(c.op));
  const tetos = comps.filter((c) => TETO.has(c.op));
  if (
    comps.every((c) => c.op !== '=') &&
    pisos.length <= 1 &&
    tetos.length <= 1
  ) {
    if (pisos[0] && tetos[0] && !satisfazivelE(comps)) {
      return [
        { teto: tetos[0], invertida: true },
        { piso: pisos[0], invertida: true },
      ];
    }
    return [{ piso: pisos[0], teto: tetos[0] }];
  }
  const out = [];
  let aberto = null;
  for (const c of comps) {
    if (c.op === '=') {
      out.push({ exato: c });
      aberto = null;
    } else if (PISO.has(c.op)) {
      aberto = { piso: c };
      out.push(aberto);
    } else if (aberto) {
      aberto.teto = c;
      aberto = null;
    } else {
      out.push({ teto: c });
    }
  }
  return out;
}

function dentro(v, iv) {
  if (iv.exato) return bate(v, iv.exato);
  return (!iv.piso || bate(v, iv.piso)) && (!iv.teto || bate(v, iv.teto));
}

// A leitura literal (todos os comparadores em E) é possível? Em ">= 12.0.0 < 12.0.2 and < 11.2.4"
// e ">= 1.1.0 < 5.2.5, >= 6.0.0 < 6.2.4" não é (piso > teto) → a única leitura com sentido é OU.
function satisfazivelE(comps) {
  const exatos = comps.filter((c) => c.op === '=');
  if (exatos.length) return comps.every((c) => bate(exatos[0].v, c));
  let piso = null;
  let teto = null;
  for (const c of comps) {
    if (PISO.has(c.op)) {
      const d = piso ? cmpVer(c.v, piso.v) : 1;
      if (d > 0 || (d === 0 && c.op === '>')) piso = c;
    } else {
      const d = teto ? cmpVer(c.v, teto.v) : -1;
      if (d < 0 || (d === 0 && c.op === '<')) teto = c;
    }
  }
  if (!piso || !teto) return true;
  const d = cmpVer(piso.v, teto.v);
  return d < 0 || (d === 0 && piso.op === '>=' && teto.op === '<=');
}

// Versões corrigidas de `patched_versions` (texto livre: "12.0.2 and 11.2.4", "6.24.0: 7.24.0",
// "^1.28.2 || >=4.9.2", "4.4.0+"). Versão precedida de < / <= é TETO, não correção — em
// ">= 6.0.1 < 7.0.0; >= 7.4.1" o 7.0.0 é o fim da linha 6.x.
function versoesCorrigidas(texto) {
  const out = [];
  const re =
    /(<=|>=|<|>|=|\^|~)?\s*(\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)/g;
  for (const m of normalizar(texto).matchAll(re)) {
    if (m[1] === '<' || m[1] === '<=') continue;
    const v = parseVer(m[2]);
    if (v) out.push({ v, estrito: m[1] === '>' });
  }
  return out;
}

// DESEMPATE (só para faixa ambígua): a versão está corrigida se é >= alguma versão corrigida da
// MESMA major.minor. Ex.: 11.2.6 com "12.0.3, 11.2.5" (≥ 11.2.5); 6.7.24 com "7.0.0-rc12,6.7.22"
// (≥ 6.7.22); traefik 3.6.14 com "v2.11.43, v3.6.14, v3.7.0-rc.2". Linha diferente não desempata.
function desempata(v, texto) {
  return versoesCorrigidas(texto).some(
    (c) =>
      c.v.nums[0] === v.nums[0] &&
      c.v.nums[1] === v.nums[1] &&
      (c.estrito ? cmpVer(v, c.v) > 0 : cmpVer(v, c.v) >= 0),
  );
}

/**
 * Veredito de `versao` numa faixa de advisory: 'afetada' | 'nao-afetada' | 'indeterminada'.
 * Base = UNIÃO dos intervalos (a leitura mais abrangente): se ela não pega a versão, nenhuma
 * leitura pega → 'nao-afetada' é certo. 'afetada' exige um intervalo que a contenha sem depender
 * de interpretação. Ambiguidades reais nos dados:
 *  (A) vírgula/"and" com vários intervalos e leitura literal em E POSSÍVEL que discorda da
 *      união — Baileys "<7.0.0-rc12,<6.7.22": E = "< 6.7.22"; união = "< 7.0.0-rc12";
 *  (B) dois ou mais tetos soltos — "< 12.0.3 || < 11.2.5" (nest), traefik "<= v2.11.42,
 *      <= v3.6.13, <= v3.7.0-rc.1": o mantenedor quis "por linha". Só o MENOR teto solto vale
 *      para qualquer leitura; casar apenas pelos maiores é ambíguo;
 *  (C) um piso e um teto invertidos (piso > teto) — só a união tem sentido, mas o que o mantenedor
 *      quis é incerto.
 * Ambígua → desempate por `patched_versions` (acima) → senão 'indeterminada' (triagem humana).
 * Faixa ou versão ininteligível → 'indeterminada'. Na dúvida, nunca 'nao-afetada'.
 */
function avaliar(versao, faixa, corrigidas = '') {
  const v = parseVer(versao);
  const alternativas = parseFaixa(faixa);
  if (!v || !alternativas) return 'indeterminada';
  const soltos = alternativas
    .flatMap((a) => a.intervalos)
    .filter((iv) => iv.teto && !iv.piso);
  const menorSolto = soltos.reduce(
    (m, iv) => (!m || cmpVer(iv.teto.v, m.teto.v) < 0 ? iv : m),
    null,
  );
  let tocou = false;
  for (const alt of alternativas) {
    const ambiguaA =
      alt.intervalos.length > 1 &&
      satisfazivelE(alt.comps) &&
      !alt.comps.every((c) => bate(v, c));
    for (const iv of alt.intervalos) {
      if (!dentro(v, iv)) continue;
      tocou = true;
      const ambiguaB =
        soltos.length > 1 && iv.teto && !iv.piso && iv !== menorSolto;
      if (!ambiguaA && !ambiguaB && !iv.invertida) return 'afetada';
    }
  }
  if (!tocou) return 'nao-afetada';
  return desempata(v, corrigidas) ? 'nao-afetada' : 'indeterminada';
}

const PRECEDENCIA = { afetada: 2, indeterminada: 1, 'nao-afetada': 0 };
const pior = (a, b) => (PRECEDENCIA[b] > PRECEDENCIA[a] ? b : a);

// ================================================================ nomes, datas, aceites

const RE_NOME_NPM = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

// Nome do pacote como veio no advisory → candidatos no lockfile. Lista em texto livre
// ("@nestjs/core, @nestjs/platform-fastify", "a and b") vira um candidato por item. Fora do padrão
// npm (ex.: "nodejs/undici") tenta o último segmento e a forma com escopo.
function nomesCandidatos(nome) {
  const n = String(nome ?? '')
    .trim()
    .toLowerCase();
  if (!n) return [];
  if (RE_NOME_NPM.test(n)) return [n];
  const itens = n
    .split(/\s*(?:,|;|\band\b|\s)\s*/)
    .map((x) => x.replace(/^[("'`]+|[)"'`]+$/g, ''))
    .filter(Boolean);
  if (itens.length > 1) return [...new Set(itens.flatMap(nomesCandidatos))];
  const partes = n.split('/').filter(Boolean);
  const c = [partes.at(-1)];
  if (partes.length === 2) c.push(`@${partes[0]}/${partes[1]}`);
  return [...new Set(c.filter((x) => x && RE_NOME_NPM.test(x)))];
}

// Campo `repository` de um package.json → "owner/repo" do GitHub (ou null).
function repoDoRepository(repository) {
  const s = String(
    typeof repository === 'string' ? repository : (repository?.url ?? ''),
  ).trim();
  const url = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?]|$)/i.exec(
    s,
  );
  if (url) return `${url[1]}/${url[2]}`;
  const curto = /^(?:github:)?([\w.-]+)\/([\w.-]+)$/.exec(s);
  return curto ? `${curto[1]}/${curto[2]}` : null;
}

// Dockerfile → Node do estágio FINAL (o que vira a imagem de produção). Resolve `ARG X=valor` em
// `FROM node:${X}…`, espelho de registry (`mirror.gcr.io/library/node:…`) e estágio que herda de
// outro (`FROM build`). `versao` = X.Y.Z só com tag exata (26.10.0-bookworm-slim, 26.10.0@sha256…);
// tag móvel (26-bookworm-slim), digest puro ou estágio final que não é node → null.
function nodeDoDockerfile(texto) {
  const args = {};
  const estagios = []; // {ref, nome}
  for (const linha of String(texto ?? '').split(/\r?\n/)) {
    const arg = /^\s*ARG\s+([A-Za-z_]\w*)=(["']?)([^"'\s]+)\2\s*$/i.exec(linha);
    if (arg) {
      args[arg[1]] = arg[3];
      continue;
    }
    const from =
      /^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/i.exec(linha);
    if (from) {
      const ref = from[1].replace(
        /\$\{?([A-Za-z_]\w*)\}?/g,
        (m, k) => args[k] ?? m,
      );
      estagios.push({ ref, nome: from[2]?.toLowerCase() ?? null });
    }
  }
  const tagNode = (ref) =>
    /^(?:[\w.-]+(?::\d+)?\/)?(?:library\/)?node(?:[:@](.+))?$/.exec(ref)?.[1] ??
    null;
  const tags = [
    ...new Set(estagios.map((e) => tagNode(e.ref)).filter(Boolean)),
  ];
  let final = estagios.at(-1) ?? null;
  for (let saltos = 0; final && saltos < estagios.length; saltos++) {
    const pai = estagios.find(
      (e) => e.nome && e.nome === final.ref.toLowerCase(),
    );
    if (!pai || pai === final) break;
    final = pai;
  }
  const tagFinal = final ? tagNode(final.ref) : null;
  const versao = tagFinal
    ? (/^(\d+\.\d+\.\d+)(?:-|@|$)/.exec(tagFinal)?.[1] ?? null)
    : null;
  return { tags, final: final?.ref ?? null, tagFinal, versao };
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
function dataValida(s) {
  if (!RE_DATA.test(String(s ?? ''))) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function ghsaCanonico(s) {
  const m = /^ghsa-([a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})$/i.exec(
    String(s ?? '').trim(),
  );
  return m ? `GHSA-${m[1].toLowerCase()}` : null;
}

/** Aceite = {ghsa, pacote, motivo, revisarAte AAAA-MM-DD}. Vencido ou inválido volta a falhar. */
function validarAceite(a, hoje) {
  if (!ghsaCanonico(a?.ghsa)) return { valido: false, porque: 'ghsa inválido' };
  if (!String(a.pacote ?? '').trim())
    return { valido: false, porque: 'sem pacote' };
  if (String(a.motivo ?? '').trim().length < 10) {
    return { valido: false, porque: 'sem motivo técnico' };
  }
  if (!dataValida(a.revisarAte)) {
    return { valido: false, porque: `revisarAte inválido (${a.revisarAte})` };
  }
  if (a.revisarAte < hoje) {
    return { valido: false, porque: `vencido em ${a.revisarAte}` };
  }
  return { valido: true };
}

const RE_INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z$/;

/**
 * Infra com versão de produção DESCONHECIDA: entra todo high/critical publicado ou atualizado na
 * janela, ou mexido depois do reconhecimento. `reconhecidoEm` (instante ISO em UTC, ex.:
 * "2026-09-25T16:21:13Z") = momento em que a lista foi LIDA: publicado E atualizado até ele =
 * reconhecido (pendente B-007); publicado depois (inclusive no mesmo dia) ou atualizado depois
 * (severidade/faixa podem ter mudado) = notícia nova → falha. Sem reconhecimento: tudo é novo.
 * Data ilegível conta como nova (nunca verde por silêncio).
 */
function classificarInfra(adv, alvo, agora, janelaDias) {
  const sev = String(adv.severity ?? '').toLowerCase();
  if (sev !== 'high' && sev !== 'critical') return null;
  const limite = agora.getTime() - janelaDias * 86_400_000;
  const pub = Date.parse(adv.published_at ?? '');
  const upd = Date.parse(adv.updated_at ?? '');
  const marco = RE_INSTANTE.test(String(alvo.reconhecidoEm ?? ''))
    ? Date.parse(alvo.reconhecidoEm)
    : NaN;
  const temMarco = Number.isFinite(marco);
  const recente = !(pub < limite && upd < limite); // NaN → recente
  const publicadaDepois = !(pub <= marco); // sem marco ou data ilegível → depois
  const atualizadaDepois = !publicadaDepois && !(upd <= marco);
  if (!recente && !(temMarco && (publicadaDepois || atualizadaDepois))) {
    return null;
  }
  return {
    reconhecida: temMarco && !publicadaDepois && !atualizadaDepois,
    atualizadaDepois,
  };
}

// ================================================================ config, lockfile, cobertura

const TIPOS = new Set(['npm', 'runtime', 'infra']);

function carregarConfig(arquivo, agora = new Date()) {
  const c = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const erros = [];
  if (!Array.isArray(c.repos) || !c.repos.length) erros.push('repos vazio');
  const vistos = new Set();
  for (const r of c.repos ?? []) {
    const id = String(r.repo ?? '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(id)) erros.push(`repo inválido: "${id}"`);
    if (vistos.has(id.toLowerCase())) erros.push(`repo duplicado: ${id}`);
    vistos.add(id.toLowerCase());
    if (!TIPOS.has(r.tipo)) erros.push(`${id}: tipo "${r.tipo}" inválido`);
    if (r.tipo === 'runtime' && (!r.pacote || !r.processVersions)) {
      erros.push(`${id}: runtime exige "pacote" e "processVersions"`);
    }
    if (
      r.tipo === 'runtime' &&
      r.imagem &&
      !fs.existsSync(path.join(ROOT, r.imagem))
    ) {
      erros.push(`${id}: imagem "${r.imagem}" não existe`);
    }
    if (r.tipo === 'infra') {
      if (r.producao != null && !parseVer(r.producao)) {
        erros.push(`${id}: producao "${r.producao}" não é versão (use null)`);
      }
      if (r.reconhecidoAte != null) {
        erros.push(
          `${id}: reconhecidoAte foi trocado por reconhecidoEm (instante ISO em UTC)`,
        );
      }
      if (r.reconhecidoEm != null) {
        const t = Date.parse(r.reconhecidoEm);
        if (!RE_INSTANTE.test(String(r.reconhecidoEm)) || !Number.isFinite(t)) {
          erros.push(
            `${id}: reconhecidoEm "${r.reconhecidoEm}" não é AAAA-MM-DDTHH:MM[:SS]Z`,
          );
        } else if (t > agora.getTime()) {
          erros.push(
            `${id}: reconhecidoEm no futuro (${r.reconhecidoEm}) silenciaria tudo`,
          );
        }
      }
      if (r.reconhecidoEm && !String(r.motivoReconhecimento ?? '').trim()) {
        erros.push(`${id}: reconhecidoEm sem motivoReconhecimento`);
      }
    }
  }
  const janela = c.janelaInfraDias ?? 180;
  if (!Number.isInteger(janela) || janela < 1)
    erros.push('janelaInfraDias inválido');
  if (erros.length) throw new Error(`config ${arquivo}: ${erros.join('; ')}`);
  return { ...c, janelaInfraDias: janela, aceitos: c.aceitos ?? [] };
}

function copiasDoLockfile(arquivo) {
  const lock = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  if (!lock.packages) {
    throw new Error(
      `${arquivo}: sem "packages" (lockfileVersion ${lock.lockfileVersion})`,
    );
  }
  const mapa = new Map(); // nome real → [{versao, caminho, dev}]
  for (const [caminho, e] of Object.entries(lock.packages)) {
    const i = caminho.lastIndexOf('node_modules/');
    if (i === -1 || !e.version || e.link) continue;
    // alias ("string-width-cjs" → string-width) traz o nome real em `name`
    const nome = (
      e.name ?? caminho.slice(i + 'node_modules/'.length)
    ).toLowerCase();
    if (!mapa.has(nome)) mapa.set(nome, []);
    mapa.get(nome).push({ versao: e.version, caminho, dev: e.dev === true });
  }
  return mapa;
}

// Dependências DIRETAS de runtime (dependencies) sem repo no config. Fonte: `pacotes` de cada
// repo; fallback: `repository` de node_modules/<pkg>/package.json (só existe localmente — no CI
// não há node_modules, por isso o mapeamento explícito no config é o que vale).
function cobertura(config) {
  const rel = config.coberturaDe ?? 'apps/gateway/package.json';
  const arquivo = path.join(ROOT, rel);
  if (!fs.existsSync(arquivo))
    return { arquivo: rel, erro: 'arquivo não encontrado' };
  const deps = Object.keys(
    JSON.parse(fs.readFileSync(arquivo, 'utf8')).dependencies ?? {},
  );
  const mapeados = new Set(
    config.repos.flatMap((r) => (r.pacotes ?? []).map((p) => p.toLowerCase())),
  );
  const repos = new Set(config.repos.map((r) => r.repo.toLowerCase()));
  const naoCobertas = [];
  const viaNodeModules = [];
  for (const dep of deps) {
    if (mapeados.has(dep.toLowerCase())) continue;
    let repoLocal = null;
    for (const base of [path.dirname(arquivo), ROOT]) {
      const pj = path.join(base, 'node_modules', dep, 'package.json');
      if (fs.existsSync(pj)) {
        repoLocal = repoDoRepository(
          JSON.parse(fs.readFileSync(pj, 'utf8')).repository,
        );
        break;
      }
    }
    if (repoLocal && repos.has(repoLocal.toLowerCase())) {
      viaNodeModules.push({ dep, repo: repoLocal });
    } else {
      naoCobertas.push({ dep, repo: repoLocal });
    }
  }
  return { arquivo: rel, total: deps.length, naoCobertas, viaNodeModules };
}

// ================================================================ GitHub API

function obterToken() {
  for (const nome of ['GITHUB_TOKEN', 'GH_TOKEN']) {
    if (process.env[nome]) return { token: process.env[nome], origem: nome };
  }
  try {
    const t = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10_000,
    }).trim();
    if (t) return { token: t, origem: '`gh auth token`' };
  } catch {
    // sem gh ou sem login
  }
  return { token: '', origem: 'sem token (60 req/h)' };
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, rede, repo) {
  let tentativas = 0;
  let esperasLimite = 0;
  let redirecionamentos = 0;
  for (;;) {
    // o token só vai para a API do GitHub — inclusive em redirecionamento e no `next` do Link
    if (!url.startsWith(`${API}/`))
      throw new Error(`URL fora de ${API}: ${url}`);
    const comToken = Boolean(rede.token);
    let res;
    try {
      res = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': API_VERSION,
          'User-Agent': 'conexozenvo-checar-advisories',
          ...(comToken ? { Authorization: `Bearer ${rede.token}` } : {}),
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      if (++tentativas <= 2) {
        await esperar(1500 * tentativas);
        continue;
      }
      throw new Error(
        `rede: ${err.cause?.code ?? err.name} ${err.cause?.message ?? err.message}`,
      );
    }
    rede.restante = res.headers.get('x-ratelimit-remaining') ?? rede.restante;
    // Rate limit (primário ou secundário) responde 403 OU 429 — não é token recusado: espera
    // retry-after / x-ratelimit-reset (teto 60 s) e repete COM o token (doc: rate-limits-for-the-rest-api).
    if (res.status === 403 || res.status === 429) {
      const corpo = await res.text();
      const limite =
        res.status === 429 ||
        res.headers.get('x-ratelimit-remaining') === '0' ||
        res.headers.has('retry-after') ||
        /rate limit/i.test(corpo);
      if (limite) {
        if (++esperasLimite <= 2) {
          const retry = Number(res.headers.get('retry-after'));
          const reset = Number(res.headers.get('x-ratelimit-reset'));
          const ms =
            retry > 0
              ? retry * 1000
              : reset > 0
                ? reset * 1000 - Date.now()
                : 5000;
          await esperar(Math.min(Math.max(ms, 1000), 60_000));
          continue;
        }
        throw new Error(
          `rate limit da API do GitHub (HTTP ${res.status}, restante ${rede.restante ?? '?'})`,
        );
      }
      if (!comToken) {
        throw new Error(
          `HTTP 403: ${corpo.slice(0, 200).replace(/\s+/g, ' ')}`,
        );
      }
    }
    if ((res.status === 401 || res.status === 403) && comToken) {
      // 403 já teve o corpo lido acima (checagem de rate limit)
      if (res.status === 401) await res.body?.cancel();
      // consultas em paralelo podem receber o 401/403 juntas: uma nota só (o Set deduplica)
      rede.avisos.add(
        `token (${rede.origem}) recusado com HTTP ${res.status} — a rodada seguiu SEM Authorization (advisory publicado de repo público é recurso público; o limite cai para 60 req/h)`,
      );
      rede.recusado = `recusado (HTTP ${res.status}) → sem token`;
      rede.token = '';
      continue;
    }
    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get('location');
      await res.body?.cancel();
      if (!destino || ++redirecionamentos > 3) {
        throw new Error(`HTTP ${res.status} sem destino utilizável`);
      }
      url = new URL(destino, url).href;
      rede.avisos.add(
        `${repo}: HTTP ${res.status} → ${url.split('?')[0]} (repo renomeado/transferido? atualize o config)`,
      );
      continue;
    }
    if (res.status >= 500 && ++tentativas <= 2) {
      await res.body?.cancel();
      await esperar(2000 * tentativas);
      continue;
    }
    if (!res.ok) {
      const corpo = (await res.text()).slice(0, 200).replace(/\s+/g, ' ');
      throw new Error(
        `HTTP ${res.status} (rate-limit restante: ${rede.restante ?? '?'}): ${corpo}`,
      );
    }
    return { corpo: await res.json(), link: res.headers.get('link') ?? '' };
  }
}

function proximaPagina(link) {
  for (const m of link.matchAll(/<([^>]+)>\s*;\s*rel="([^"]+)"/g)) {
    if (m[2].split(/\s+/).includes('next')) return m[1];
  }
  return null;
}

async function listarAdvisories(repo, rede) {
  const itens = [];
  let url = `${API}/repos/${repo}/security-advisories?state=published&per_page=100`;
  for (let pagina = 1; url; pagina++) {
    if (pagina > 50) throw new Error('paginação não terminou em 50 páginas');
    const { corpo, link } = await getJson(url, rede, repo);
    if (!Array.isArray(corpo)) throw new Error('resposta não é uma lista');
    itens.push(...corpo);
    url = proximaPagina(link);
  }
  return itens;
}

async function emParalelo(itens, n, fn) {
  const out = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      out[i] = await fn(itens[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(n, itens.length) }, trabalhador),
  );
  return out;
}

// JSON público fora da API do GitHub (sem token), com 2 novas tentativas.
async function getJsonPublico(url) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'conexozenvo-checar-advisories' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (tentativa > 2) throw new Error(`${url}: ${err.message}`);
      await esperar(1500 * tentativa);
    }
  }
}

// Versão do componente embutido que vai para a PRODUÇÃO. Com `imagem`: Node do estágio FINAL do
// Dockerfile (tag exata) → deps/<pacote>/src/package.json do repo nodejs/node naquela tag (fonte do
// próprio Node) + releases de segurança da mesma linha em nodejs.org/dist/index.json (com o pin, o
// Node não sobe sozinho). Sem Node fixado → erro (exit 2): a produção ficaria ao acaso do cache.
// Sem `imagem`: o Node que roda o script.
async function resolverRuntime(alvo, rede) {
  const pacote = alvo.pacote;
  if (!alvo.imagem) {
    const versao = process.versions[alvo.processVersions] ?? null;
    return versao
      ? { pacote, versao, onde: `Node ${process.version} (runner)` }
      : {
          pacote,
          versao,
          erro: `process.versions.${alvo.processVersions} ausente`,
        };
  }
  const df = nodeDoDockerfile(
    fs.readFileSync(path.join(ROOT, alvo.imagem), 'utf8'),
  );
  if (!df.versao) {
    return {
      pacote,
      versao: null,
      onde: alvo.imagem,
      erro: `${alvo.imagem}: estágio final \`FROM ${df.final ?? '?'}\` sem Node X.Y.Z fixado — a versão de produção (e a do ${pacote} embutido) ficaria ao acaso do cache do build; fixe a tag exata`,
    };
  }
  const aviso =
    df.tags.length > 1
      ? `${alvo.imagem}: estágios com Node diferentes (${df.tags.join(', ')}) — avaliado o estágio final (${df.tagFinal})`
      : null;
  try {
    const { corpo } = await getJson(
      `${API}/repos/nodejs/node/contents/deps/${pacote}/src/package.json?ref=v${df.versao}`,
      rede,
      'nodejs/node',
    );
    const pj = JSON.parse(
      Buffer.from(corpo.content ?? '', 'base64').toString('utf8'),
    );
    if (!pj.version) throw new Error('package.json sem version');
    const releases = await getJsonPublico('https://nodejs.org/dist/index.json');
    const fixada = parseVer(df.versao);
    const linha = releases
      .map((r) => ({
        version: r.version,
        date: r.date,
        security: r.security === true,
        v: parseVer(r.version),
      }))
      .filter((r) => r.v && r.v.nums[0] === fixada.nums[0]);
    const seguranca = linha.filter(
      (r) => r.security && cmpVer(r.v, fixada) > 0,
    );
    const ultima = linha.reduce(
      (m, r) => (!m || cmpVer(r.v, m.v) > 0 ? r : m),
      null,
    );
    return {
      pacote,
      versao: pj.version,
      node: df.versao,
      onde: `node:${df.tagFinal} (${alvo.imagem})`,
      aviso,
      seguranca: seguranca.map(({ version, date }) => ({ version, date })),
      ultima:
        ultima && cmpVer(ultima.v, fixada) > 0
          ? { version: ultima.version, date: ultima.date }
          : null,
    };
  } catch (err) {
    return {
      pacote,
      versao: null,
      onde: alvo.imagem,
      erro: `Node ${df.versao} fixado em ${alvo.imagem}: ${err.message}`,
    };
  }
}

// ================================================================ avaliação

function baseDe(adv, alvo) {
  return {
    tipo: alvo.tipo,
    repo: alvo.repo,
    ghsa: ghsaCanonico(adv.ghsa_id) ?? String(adv.ghsa_id),
    sev: String(adv.severity ?? '—').toLowerCase(),
    publicado: adv.published_at ?? null,
    atualizado: adv.updated_at ?? null,
    url: adv.html_url ?? `https://github.com/${alvo.repo}/security/advisories`,
    resumo: adv.summary ?? '',
  };
}

const faixaTxt = (vu) =>
  `${vu?.vulnerable_version_range ?? '?'} → ${vu?.patched_versions || '—'}`;

function novoRegistro() {
  const linhas = new Map();
  const registrar = (
    base,
    { pacote, versao, onde, faixa, veredito, notas = [] },
  ) => {
    const chave = `${base.ghsa}|${pacote}|${versao}`;
    const l = linhas.get(chave) ?? {
      ...base,
      pacote,
      versao,
      onde: [],
      faixas: [],
      veredito,
      notas: [],
    };
    l.veredito = pior(l.veredito, veredito);
    if (onde && !l.onde.some((o) => o.caminho === onde.caminho))
      l.onde.push(onde);
    if (faixa && !l.faixas.includes(faixa)) l.faixas.push(faixa);
    for (const n of notas) if (!l.notas.includes(n)) l.notas.push(n);
    linhas.set(chave, l);
  };
  return { linhas, registrar };
}

// tipo npm: casa SEMPRE pelo nome com as cópias do lockfile. `ecosystem` é preenchido à mão pelos
// mantenedores ('' no nestjs/nest, 'typescript', 'docker'…) — diferente de npm vira só anotação.
// Nome sem cópia no lockfile (nome antigo/alternativo: "baileys", "fastify-multipart"): se o repo
// tem UM só pacote instalado em `pacotes`, avalia a faixa contra ele (anotado); senão vai para
// `naoCasados` (aviso agregado) — nunca some calado.
function avaliarNpm(adv, alvo, copias, registrar, naoCasados = []) {
  const base = baseDe(adv, alvo);
  const vulns = adv.vulnerabilities ?? [];
  if (!vulns.length) {
    registrar(base, {
      pacote: alvo.repo,
      versao: '—',
      faixa: '—',
      veredito: 'indeterminada',
      notas: ['advisory sem `vulnerabilities` (pacote/faixa não informados)'],
    });
    return;
  }
  for (const vu of vulns) {
    const nome = String(vu.package?.name ?? '').trim();
    const eco = String(vu.package?.ecosystem ?? '').trim();
    const notas = [];
    if (eco && eco.toLowerCase() !== 'npm')
      notas.push(`ecosystem declarado "${eco}"`);
    const candidatos = nomesCandidatos(nome);
    if (!candidatos.length) {
      registrar(base, {
        pacote: alvo.repo,
        versao: '—',
        faixa: faixaTxt(vu),
        veredito: 'indeterminada',
        notas: [...notas, 'pacote não informado no advisory'],
      });
      continue;
    }
    if (candidatos[0] !== nome.toLowerCase())
      notas.push(`nome no advisory: "${nome}"`);
    let alvos = candidatos.filter((p) => copias.has(p));
    if (!alvos.length) {
      const doRepo = [
        ...new Set((alvo.pacotes ?? []).map((p) => p.toLowerCase())),
      ].filter((p) => copias.has(p));
      if (doRepo.length !== 1) {
        naoCasados.push({ repo: alvo.repo, ghsa: base.ghsa, nome });
        continue;
      }
      alvos = doRepo;
      notas.push(
        `nome no advisory "${nome}" não está no lockfile — avaliado como ${doRepo[0]} (único pacote do repo)`,
      );
    }
    for (const pacote of alvos) {
      for (const c of copias.get(pacote)) {
        const veredito = avaliar(
          c.versao,
          vu.vulnerable_version_range,
          vu.patched_versions,
        );
        if (veredito === 'nao-afetada') continue;
        registrar(base, {
          pacote,
          versao: c.versao,
          onde: c,
          faixa: faixaTxt(vu),
          veredito,
          notas,
        });
      }
    }
  }
}

// tipo runtime: componente embutido no Node que roda o script (process.versions[processVersions]).
function avaliarRuntime(adv, alvo, versao, ondeTexto, registrar) {
  const base = baseDe(adv, alvo);
  const onde = { caminho: ondeTexto, dev: false };
  const vulns = (adv.vulnerabilities ?? []).filter((vu) => {
    const c = nomesCandidatos(vu.package?.name);
    return !c.length || c.includes(alvo.pacote.toLowerCase());
  });
  if (!(adv.vulnerabilities ?? []).length) {
    registrar(base, {
      pacote: alvo.pacote,
      versao,
      onde,
      faixa: '—',
      veredito: 'indeterminada',
      notas: ['advisory sem `vulnerabilities`'],
    });
    return;
  }
  for (const vu of vulns) {
    const veredito = avaliar(
      versao,
      vu.vulnerable_version_range,
      vu.patched_versions,
    );
    if (veredito === 'nao-afetada') continue;
    const notas = vu.package?.name
      ? []
      : ['pacote não informado (avaliado como o do repo)'];
    registrar(base, {
      pacote: alvo.pacote,
      versao,
      onde,
      faixa: faixaTxt(vu),
      veredito,
      notas,
    });
  }
}

// tipo infra com `producao` conhecida: avalia todas as faixas (qualquer pacote/ecosystem) contra
// a versão de produção registrada — traefik lista v2 e v3 no mesmo advisory.
function avaliarInfraConhecida(adv, alvo, registrar) {
  const base = baseDe(adv, alvo);
  const vulns = adv.vulnerabilities ?? [];
  const veredito = vulns.length
    ? vulns
        .map((vu) =>
          avaliar(
            alvo.producao,
            vu.vulnerable_version_range,
            vu.patched_versions,
          ),
        )
        .reduce(pior, 'nao-afetada')
    : 'indeterminada';
  if (veredito === 'nao-afetada') return;
  registrar(base, {
    pacote: alvo.repo,
    versao: alvo.producao,
    onde: { caminho: 'produção (config)', dev: false },
    faixa: vulns.map(faixaTxt).join(' · ') || '—',
    veredito,
    notas: vulns.length ? [] : ['advisory sem `vulnerabilities`'],
  });
}

// ================================================================ relatório

const esc = (s) =>
  String(s ?? '—')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
const dia = (iso) => (iso ? String(iso).slice(0, 10) : '—');
const linkGhsa = (l) =>
  `[${l.ghsa}](${l.url} "${esc(l.resumo).replace(/"/g, "'").slice(0, 150)}")`;
const ordenar = (a, b) =>
  (a.situacao === 'pendente' ? 0 : 1) - (b.situacao === 'pendente' ? 0 : 1) ||
  (SEV_ORDEM[a.sev] ?? 9) - (SEV_ORDEM[b.sev] ?? 9) ||
  String(b.publicado).localeCompare(String(a.publicado)) ||
  a.ghsa.localeCompare(b.ghsa);

function ondeTxt(l) {
  if (!l.onde.length) return '—';
  const soDev = l.onde.every((o) => o.dev) ? ' (só dev)' : '';
  if (l.onde.length === 1) return `\`${esc(l.onde[0].caminho)}\`${soDev}`;
  return `${l.onde.length} cópias${soDev}`;
}

function renderizar(r) {
  const md = [];
  const resultado =
    r.exit === 2
      ? '⚠️ **falha de consulta/config — exit 2** (nada foi dado como verde)'
      : r.pendencias
        ? `❌ **${r.pendencias} pendência(s)**${r.informativo ? ' — modo informativo: exit 0 (em PR só a falha de consulta quebra)' : ' — exit 1'}`
        : '✅ **nada pendente — exit 0**';
  md.push(
    '## Advisories de repositório (P-054)',
    '',
    `**Resultado:** ${resultado}`,
    '',
  );
  md.push(
    `- Rodada: ${r.rodada} · repos: ${r.repos.total} (npm ${r.repos.npm} · runtime ${r.repos.runtime} · infra ${r.repos.infra}) · token: ${r.token} · rate-limit restante: ${r.rateLimitRestante ?? '?'}`,
  );
  md.push(`- Lockfile: \`${r.lockfile}\` · config: \`${r.config}\``);
  for (const rt of r.runtime.avaliados) {
    const alvoTxt = rt.erro
      ? `⚠️ ${esc(rt.erro)}`
      : `**${esc(rt.onde)} · ${esc(rt.pacote)} ${esc(rt.versao)}**`;
    md.push(
      `- Runtime (${esc(rt.repo)}): ${alvoTxt} — o \`fetch\`/safe-fetch do gateway usa o undici EMBUTIDO no Node, fora do lockfile. O Node que rodou o script (${r.runtime.runner.node}, undici ${r.runtime.runner.undici ?? '?'}) só executa; em produção, conferir no log de boot \`Runtime: Node …\`.`,
    );
  }
  md.push('');

  if (r.falhas.length) {
    md.push('### ⚠️ Falhas de consulta (exit 2)', '');
    for (const f of r.falhas) md.push(`- ${esc(f)}`);
    md.push('');
  }

  md.push(
    '### Achados — lockfile · runtime do Node · infra com versão de produção',
    '',
  );
  if (!r.achados.length) {
    md.push('Nenhuma versão em faixa vulnerável ou ambígua.', '');
  } else {
    md.push(
      '| situação | GHSA | sev | publicado | alvo | onde | faixa → corrigida | veredito | observação |',
      '|---|---|---|---|---|---|---|---|---|',
    );
    for (const l of r.achados) {
      const situacao =
        l.situacao === 'aceito'
          ? `aceito até ${l.aceite.revisarAte}`
          : '**PENDENTE**';
      const obs = [
        l.situacao === 'aceito' ? l.aceite.motivo : null,
        l.aceiteInvalido ? `aceite ignorado: ${l.aceiteInvalido}` : null,
        ...l.notas,
      ]
        .filter(Boolean)
        .join(' · ');
      md.push(
        `| ${situacao} | ${linkGhsa(l)} | ${l.sev} | ${dia(l.publicado)} | ${esc(l.pacote)}@${esc(l.versao)} | ${ondeTxt(l)} | \`${esc(l.faixas.join(' · '))}\` | ${l.veredito} | ${esc(obs) || '—'} |`,
      );
    }
    md.push('');
  }

  md.push(
    `### Infra sem versão de produção (B-007) — high/critical publicados ou atualizados nos últimos ${r.infra.janelaDias} dias`,
    '',
  );
  const tabelaInfra = (lista, comSituacao) => {
    md.push(
      `|${comSituacao ? ' situação |' : ''} repo | GHSA | sev | publicado | atualizado | faixa → corrigida | dev/CI |`,
      `|${comSituacao ? '---|' : ''}---|---|---|---|---|---|---|`,
    );
    for (const l of lista) {
      const sit = comSituacao
        ? ` ${l.situacao === 'aceito' ? `aceito até ${l.aceite.revisarAte}` : '**PENDENTE**'} |`
        : '';
      const upd = l.atualizadaDepois
        ? `${dia(l.atualizado)} ⚠️ atualizado após o reconhecimento — releia`
        : dia(l.atualizado);
      md.push(
        `|${sit} ${esc(l.repo)} | ${linkGhsa(l)} | ${l.sev} | ${dia(l.publicado)} | ${upd} | \`${esc(l.faixas.join(' · '))}\` | ${esc(l.devCi)} |`,
      );
    }
    md.push('');
  };
  md.push(
    '**Novas (publicadas ou atualizadas depois do reconhecimento, ou repo sem reconhecimento):**',
    '',
  );
  if (r.infra.novas.length) tabelaInfra(r.infra.novas, true);
  else md.push('Nenhuma.', '');
  md.push(
    `<details><summary>Reconhecidas — lidas, pendentes da B-007 (${r.infra.reconhecidas.length})</summary>`,
    '',
  );
  for (const m of r.infra.motivos) {
    md.push(
      `- **${esc(m.repo)}** (lido em ${m.reconhecidoEm}): ${esc(m.motivo)}`,
    );
  }
  md.push('');
  if (r.infra.reconhecidas.length) tabelaInfra(r.infra.reconhecidas, false);
  md.push('</details>', '');

  md.push('### Cobertura da lista de repos (informativo)', '');
  const cob = r.cobertura;
  if (cob.erro) {
    md.push(`- ⚠️ \`${cob.arquivo}\`: ${cob.erro}`);
  } else if (!cob.naoCobertas.length && !cob.viaNodeModules.length) {
    md.push(
      `- ✅ as ${cob.total} dependências diretas de runtime de \`${cob.arquivo}\` têm repo no config (\`pacotes\`).`,
    );
  } else {
    for (const d of cob.naoCobertas) {
      md.push(
        `- ⚠️ \`${esc(d.dep)}\` sem repo no config${d.repo ? ` (repository local: ${esc(d.repo)})` : ''} — incluir em \`repos\` com \`pacotes\`.`,
      );
    }
    for (const d of cob.viaNodeModules) {
      md.push(
        `- ℹ️ \`${esc(d.dep)}\` coberto só pelo \`repository\` do node_modules (${esc(d.repo)}) — no CI não há node_modules: adicione em \`pacotes\`.`,
      );
    }
  }
  md.push('');

  if (r.avisos.length) {
    md.push('### Avisos', '');
    for (const a of r.avisos) md.push(`- ${esc(a)}`);
    md.push('');
  }
  md.push(
    '<sub>exit 0 = nada pendente · 1 = afetada/indeterminada sem aceite válido, ou infra high/critical nova · 2 = falha de consulta/config. Aceitar/reconhecer: docs/how-to/checar-advisories.md</sub>',
    '',
  );
  return md.join('\n');
}

// ================================================================ main

async function main(opcoes) {
  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);
  const config = carregarConfig(opcoes.config, agora);
  const copias = copiasDoLockfile(opcoes.lockfile);
  const { token, origem } = obterToken();
  const rede = { token, origem, restante: null, avisos: new Set() };
  const avisos = [];
  const falhas = [];

  // aceites: chave GHSA|pacote (pacote npm; runtime = "undici"; infra = "owner/repo")
  const aceites = new Map();
  for (const a of config.aceitos) {
    const chave = `${ghsaCanonico(a.ghsa) ?? a.ghsa}|${String(a.pacote ?? '').toLowerCase()}`;
    if (aceites.has(chave)) {
      avisos.push(`aceite duplicado: ${a.ghsa} (${a.pacote})`);
    }
    const v = validarAceite(a, hoje);
    if (!v.valido)
      avisos.push(`aceite ${a.ghsa} (${a.pacote}) NÃO vale: ${v.porque}`);
    aceites.set(chave, { ...a, ...v, usado: false });
  }

  const resultados = await emParalelo(config.repos, PARALELO, async (alvo) => {
    try {
      return { alvo, itens: await listarAdvisories(alvo.repo, rede) };
    } catch (err) {
      return { alvo, erro: `${alvo.repo}: ${err.message}` };
    }
  });

  const { linhas, registrar } = novoRegistro();
  const runtimes = [];
  const naoCasados = [];
  const infraNovas = [];
  const infraReconhecidas = [];
  for (const { alvo, itens, erro } of resultados) {
    if (erro) {
      falhas.push(erro);
      continue;
    }
    let versaoRuntime = null;
    let ondeRuntime = null;
    if (alvo.tipo === 'runtime') {
      const rt = await resolverRuntime(alvo, rede);
      runtimes.push({ repo: alvo.repo, ...rt });
      if (rt.erro) {
        falhas.push(`${alvo.repo}: ${rt.erro}`);
        continue;
      }
      if (rt.aviso) avisos.push(`${alvo.repo}: ${rt.aviso}`);
      versaoRuntime = rt.versao;
      ondeRuntime = rt.onde;
      // Node fixado: release de SEGURANÇA mais nova da mesma linha = pendência (sem aceite — a
      // correção é sempre possível sem major: subir o FROM). Release comum mais nova = aviso.
      for (const r of rt.seguranca ?? []) {
        registrar(
          {
            tipo: 'runtime',
            repo: 'nodejs/node',
            ghsa: `Node ${r.version}`,
            sev: 'high',
            publicado: r.date,
            atualizado: r.date,
            url: `https://nodejs.org/en/blog/release/${r.version}`,
            resumo: 'release de segurança da mesma linha do Node fixado',
          },
          {
            pacote: 'node',
            versao: rt.node,
            onde: { caminho: rt.onde, dev: false },
            faixa: `< ${r.version} (security: true em nodejs.org/dist/index.json)`,
            veredito: 'afetada',
            notas: [
              'subir o FROM do Dockerfile (os 2 estágios) — com o pin o Node não sobe sozinho',
            ],
          },
        );
      }
      if (rt.ultima) {
        avisos.push(
          `Node fixado ${rt.node}; a linha já tem ${rt.ultima.version} (${rt.ultima.date}) — a tag exata deixa de receber rebuild da base Debian quando sai versão nova: planeje subir o FROM`,
        );
      }
    }
    for (const adv of itens) {
      if (adv.withdrawn_at) continue;
      if (alvo.tipo === 'npm') {
        avaliarNpm(adv, alvo, copias, registrar, naoCasados);
      } else if (alvo.tipo === 'runtime')
        avaliarRuntime(adv, alvo, versaoRuntime, ondeRuntime, registrar);
      else if (alvo.producao) avaliarInfraConhecida(adv, alvo, registrar);
      else {
        const c = classificarInfra(adv, alvo, agora, config.janelaInfraDias);
        if (!c) continue;
        const l = {
          ...baseDe(adv, alvo),
          pacote: alvo.repo,
          faixas: (adv.vulnerabilities ?? []).map(faixaTxt),
          devCi: alvo.devCi ?? '—',
          atualizadaDepois: c.atualizadaDepois,
        };
        (c.reconhecida ? infraReconhecidas : infraNovas).push(l);
      }
    }
  }

  const porRepo = new Map();
  for (const n of naoCasados) {
    if (!porRepo.has(n.repo)) porRepo.set(n.repo, new Map());
    const m = porRepo.get(n.repo);
    m.set(n.nome, (m.get(n.nome) ?? 0) + 1);
  }
  for (const [repo, m] of porRepo) {
    const lista = [...m].map(([nome, q]) => `${nome || '?'} ×${q}`).join(', ');
    avisos.push(
      `${repo}: advisories de pacote fora do lockfile, ignorados (${lista}) — confira se algum é nome alternativo de pacote instalado`,
    );
  }

  const aplicarAceite = (l) => {
    const a = aceites.get(`${l.ghsa}|${String(l.pacote).toLowerCase()}`);
    if (a) a.usado = true;
    if (a?.valido) {
      l.situacao = 'aceito';
      l.aceite = { revisarAte: a.revisarAte, motivo: a.motivo };
    } else {
      l.situacao = 'pendente';
      if (a) l.aceiteInvalido = a.porque;
    }
    return l;
  };
  const achados = [...linhas.values()].map(aplicarAceite).sort(ordenar);
  infraNovas.forEach(aplicarAceite);
  infraNovas.sort(ordenar);
  infraReconhecidas.sort(ordenar);
  for (const a of aceites.values()) {
    if (!a.usado && !falhas.length) {
      avisos.push(
        `aceite sem achado correspondente (pode sair do config): ${a.ghsa} (${a.pacote})`,
      );
    }
  }

  const cob = cobertura(config);
  const pendencias = [...achados, ...infraNovas].filter(
    (l) => l.situacao === 'pendente',
  ).length;
  const exit = falhas.length ? 2 : pendencias && !opcoes.informativo ? 1 : 0;
  const tipos = (t) => config.repos.filter((r) => r.tipo === t).length;
  const resultado = {
    rodada: agora.toISOString(),
    exit,
    informativo: opcoes.informativo,
    pendencias,
    token: rede.recusado ? `${origem} ${rede.recusado}` : origem,
    rateLimitRestante: rede.restante,
    config: path.relative(ROOT, opcoes.config) || opcoes.config,
    lockfile: path.relative(ROOT, opcoes.lockfile) || opcoes.lockfile,
    runtime: {
      runner: {
        node: process.version,
        undici: process.versions.undici ?? null,
      },
      avaliados: runtimes,
    },
    repos: {
      total: config.repos.length,
      npm: tipos('npm'),
      runtime: tipos('runtime'),
      infra: tipos('infra'),
    },
    falhas,
    achados: achados.map((l) => ({
      ...l,
      onde: l.onde.map((o) => ({ caminho: o.caminho, dev: o.dev })),
    })),
    infra: {
      janelaDias: config.janelaInfraDias,
      novas: infraNovas,
      reconhecidas: infraReconhecidas,
      motivos: config.repos
        .filter((r) => r.tipo === 'infra' && !r.producao && r.reconhecidoEm)
        .map((r) => ({
          repo: r.repo,
          reconhecidoEm: r.reconhecidoEm,
          motivo: r.motivoReconhecimento,
        })),
    },
    cobertura: cob,
    avisos: [...avisos, ...rede.avisos],
  };

  const texto = renderizar(resultado);
  process.stdout.write(`${texto}\n`);
  if (opcoes.json) {
    fs.writeFileSync(opcoes.json, `${JSON.stringify(resultado, null, 2)}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const resumo =
      Buffer.byteLength(texto) > LIMITE_RESUMO
        ? `${texto.slice(0, LIMITE_RESUMO / 2)}\n\n… (cortado: limite de 1 MiB do resumo — ver o log do step)\n`
        : `${texto}\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo);
  }
  // exitCode (e não process.exit): process.exit logo após escrever trunca o stdout em pipe >64 KB
  process.exitCode = exit;
}

// ================================================================ autoteste (offline)

function autoteste() {
  const erros = [];
  let total = 0;
  const conferir = (ok, desc) => {
    total++;
    if (!ok) erros.push(desc);
  };

  // [versão, faixa, patched_versions, esperado, origem] — faixas copiadas dos advisories de
  // 25/09/2026 (nestjs/nest, fastify/*, WhiskeySockets/Baileys, websockets/ws, nodejs/undici,
  // traefik/traefik, panva/jose, redis/redis, minio/minio, protobufjs); "sintético" = regra pura.
  const BAILEYS = '<7.0.0-rc12,<6.7.22';
  const TRAEFIK_6JWX = '<= v2.11.42, <= v3.6.13, <= v3.7.0-rc.1';
  const TRAEFIK_6JWX_FIX = 'v2.11.43, v3.6.14, v3.7.0-rc.2';
  const WS =
    '>= 1.1.0 < 5.2.5, >= 6.0.0 < 6.2.4, >= 7.0.0 < 7.5.11, >= 8.0.0 < 8.21.0';
  const JOSE = '1 <=1.28.1 || 2 <=2.0.5 || 3 <=3.20.3 || 4 <=4.9.1';
  const casos = [
    [
      '11.2.3',
      '>= 12.0.0 < 12.0.2 and < 11.2.4',
      '12.0.2 and 11.2.4',
      'afetada',
      'nest GHSA-9c5c',
    ],
    [
      '11.2.6',
      '>= 12.0.0 < 12.0.2 and < 11.2.4',
      '12.0.2 and 11.2.4',
      'nao-afetada',
      'nest GHSA-9c5c',
    ],
    [
      '12.0.1',
      '>= 12.0.0 < 12.0.2 and < 11.2.4',
      '12.0.2 and 11.2.4',
      'afetada',
      'nest GHSA-9c5c',
    ],
    [
      '11.2.6',
      '< 12.0.3 || < 11.2.5',
      '12.0.3, 11.2.5',
      'nao-afetada',
      'nest GHSA-96h4 (desempate)',
    ],
    [
      '11.2.6',
      '< 12.0.3 || < 11.2.5',
      '',
      'indeterminada',
      'nest GHSA-96h4 sem corrigidas',
    ],
    [
      '11.2.4',
      '< 12.0.3 || < 11.2.5',
      '12.0.3, 11.2.5',
      'afetada',
      'nest GHSA-96h4 (menor teto)',
    ],
    ['11.2.6', '=< 11.1.17 ', '11.1.18', 'nao-afetada', 'nest GHSA-36xv'],
    ['11.1.17', '=< 11.1.17 ', '11.1.18', 'afetada', 'nest GHSA-36xv'],
    ['5.11.3', '< 5.12.2', '5.12.2', 'afetada', 'fastify GHSA-9q9j'],
    ['5.11.3', '>= 5.8.3, < 5.12.1', '5.12.1', 'afetada', 'fastify GHSA-3m5p'],
    ['5.11.3', '>= 4.0.0, < 5.12.2', '5.12.2', 'afetada', 'fastify GHSA-p68q'],
    [
      '5.11.3',
      '>= 5.3.2, <= 5.8.4',
      '5.8.5',
      'nao-afetada',
      'fastify GHSA-247c',
    ],
    ['5.1.0', '>= 3.0.0, < 5.1.1', '5.1.1', 'afetada', 'proxy-addr GHSA-8cmm'],
    [
      '5.1.1',
      '>= 3.0.0, < 5.1.1',
      '5.1.1',
      'nao-afetada',
      'proxy-addr GHSA-8cmm',
    ],
    ['3.2.1', '< 3.2.2', '3.2.2', 'afetada', 'busboy GHSA-gxm5'],
    ['3.2.2', '< 3.2.2', '3.2.2', 'nao-afetada', 'busboy GHSA-gxm5'],
    ['4.1.4', '= 4.1.3', '4.1.4', 'nao-afetada', 'fast-uri GHSA-58mr'],
    ['4.1.4', '>= 4.1.3, < 4.1.5', '4.1.5', 'afetada', 'fast-uri GHSA-jvvf'],
    ['3.1.7', '>= 3.0.0, < 3.1.8', '3.1.8', 'afetada', 'fast-uri GHSA-hrr3'],
    [
      '3.1.8',
      '>= 3.0.0, < 3.1.8',
      '3.1.8',
      'nao-afetada',
      'fast-uri GHSA-hrr3',
    ],
    [
      '3.1.7',
      '4.0.0 < 4.1.2; 3.0.0 < 3.1.5; < 2.4.4',
      '4.1.2; 3.1.5; 2.4.4',
      'nao-afetada',
      'fast-uri GHSA-7p8r',
    ],
    [
      '3.1.4',
      '4.0.0 < 4.1.2; 3.0.0 < 3.1.5; < 2.4.4',
      '4.1.2; 3.1.5; 2.4.4',
      'afetada',
      'fast-uri GHSA-7p8r',
    ],
    [
      '3.1.0',
      '<=2.4.0; 3.0.0<= 3.1.0',
      '2.4.1; 3.1.1',
      'afetada',
      'fast-uri GHSA-q3j6',
    ],
    [
      '4.0.0',
      '>= 2.3.1 <2.4.2; 3.0.0 <= 3.1.2; 4.0.0',
      '2.4.2; 3.1.3; 4.0.1',
      'afetada',
      'fast-uri GHSA-4c8g (solta = exata)',
    ],
    [
      '4.0.1',
      '>= 2.3.1 <2.4.2; 3.0.0 <= 3.1.2; 4.0.0',
      '2.4.2; 3.1.3; 4.0.1',
      'nao-afetada',
      'fast-uri GHSA-4c8g',
    ],
    [
      '9.0.0',
      '< 8.2.2; 9.0.0',
      '>= 8.2.2; >= 9.0.1',
      'afetada',
      'find-my-way GHSA-rrr8',
    ],
    ['9.7.0', '<=9.6.0', '9.7.0', 'nao-afetada', 'find-my-way GHSA-c96f'],
    ['8.0.0', '==8.0.0', '8.0.1', 'afetada', 'protobufjs GHSA-xq3m'],
    [
      '7.6.6',
      '>=7.5.0, <=7.6.4',
      '7.6.5',
      'nao-afetada',
      'protobufjs GHSA-j3f2',
    ],
    [
      '7.2.0',
      '<= 6.0.0; 7.0.0 <= 7.4.0',
      '>= 6.0.1 < 7.0.0; >= 7.4.1 ',
      'afetada',
      'multipart GHSA-hpp2',
    ],
    [
      '10.1.2',
      '>= 3.0.0, < 10.1.1',
      '10.1.1',
      'nao-afetada',
      'multipart GHSA-62qx',
    ],
    [
      '7.0.0-rc14',
      BAILEYS,
      '7.0.0-rc12,6.7.22',
      'nao-afetada',
      'Baileys GHSA-qvv5 (instalada)',
    ],
    [
      '7.0.0-rc.5',
      BAILEYS,
      '7.0.0-rc12,6.7.22',
      'indeterminada',
      'Baileys GHSA-qvv5 (E ≠ OU, sem desempate)',
    ],
    [
      '7.0.0-rc.9',
      BAILEYS,
      '7.0.0-rc12,6.7.22',
      'indeterminada',
      'Baileys GHSA-qvv5',
    ],
    [
      '7.0.0-rc11',
      BAILEYS,
      '7.0.0-rc12,6.7.22',
      'indeterminada',
      'Baileys GHSA-qvv5',
    ],
    [
      '6.7.24',
      BAILEYS,
      '7.0.0-rc12,6.7.22',
      'nao-afetada',
      'Baileys GHSA-qvv5 (desempate 6.7.22)',
    ],
    [
      '6.7.24',
      BAILEYS,
      '',
      'indeterminada',
      'Baileys GHSA-qvv5 sem corrigidas',
    ],
    [
      '6.7.21',
      BAILEYS,
      '7.0.0-rc12,6.7.22',
      'afetada',
      'Baileys GHSA-qvv5 (menor teto)',
    ],
    [
      '7.0.0-rc14',
      '>= 7.0.0-rc.1, < 7.0.0-rc12',
      '7.0.0-rc12',
      'nao-afetada',
      'Baileys (formato da base global)',
    ],
    [
      '7.0.0-rc.9',
      '>= 7.0.0-rc.1, < 7.0.0-rc12',
      '7.0.0-rc12',
      'afetada',
      'Baileys rc.9 < rc12 (ASCII)',
    ],
    [
      '7.0.0-rc14',
      '< 7.0.0',
      '7.0.0',
      'afetada',
      'sintético: pré-release < final (§11)',
    ],
    [
      '8.21.3',
      WS,
      '5.2.5, 6.2.4, 7.5.11, 8.21.0',
      'nao-afetada',
      'ws GHSA-96hv (instalada)',
    ],
    [
      '8.20.0',
      WS,
      '5.2.5, 6.2.4, 7.5.11, 8.21.0',
      'afetada',
      'ws GHSA-96hv (vírgula = OU de intervalos)',
    ],
    ['6.2.3', WS, '5.2.5, 6.2.4, 7.5.11, 8.21.0', 'afetada', 'ws GHSA-96hv'],
    [
      '8.0.2',
      '>= 8.0.0, < 8.10.2',
      '8.10.2',
      'afetada',
      'undici GHSA-rx4f (Node 26.0.0)',
    ],
    [
      '8.10.2',
      '>= 8.0.0, < 8.10.2',
      '8.10.2',
      'nao-afetada',
      'undici GHSA-rx4f (Node 26.10.0)',
    ],
    [
      '8.0.2',
      '< 6.28.1; 7.0.0 < 7.29.1; 8.0.0 < 8.10.2',
      '6.28.1; 7.29.1; 8.10.2',
      'afetada',
      'undici GHSA-r53p',
    ],
    [
      '8.0.2',
      '7.23.0 < 7.28.0; < 8.2.0',
      '7.28.0; 8.2.0',
      'afetada',
      'undici GHSA-hm92',
    ],
    [
      '8.10.2',
      '7.23.0 < 7.28.0; < 8.2.0',
      '7.28.0; 8.2.0',
      'nao-afetada',
      'undici GHSA-hm92',
    ],
    [
      '6.5.0',
      '< 5.28.3; > 6.0.0 < 6.11.0',
      '>= 5.28.4 < 6.0.0; >= 6.11.1',
      'afetada',
      'undici GHSA-m4v8',
    ],
    [
      '6.0.0',
      '< 5.28.3; > 6.0.0 < 6.11.0',
      '>= 5.28.4 < 6.0.0; >= 6.11.1',
      'nao-afetada',
      'undici GHSA-m4v8 (> estrito)',
    ],
    [
      '3.6.7',
      '>= v3.0.0, <= v3.7.12',
      'v3.7.13',
      'afetada',
      'traefik GHSA-qqjf',
    ],
    [
      '3.7.13',
      '>= v3.0.0, <= v3.7.12',
      'v3.7.13',
      'nao-afetada',
      'traefik GHSA-qqjf',
    ],
    [
      '3.6.7',
      TRAEFIK_6JWX,
      TRAEFIK_6JWX_FIX,
      'indeterminada',
      'traefik GHSA-6jwx (3.6.7 < 3.6.14)',
    ],
    [
      '3.6.14',
      TRAEFIK_6JWX,
      TRAEFIK_6JWX_FIX,
      'nao-afetada',
      'traefik GHSA-6jwx (desempate 3.6.14)',
    ],
    [
      '3.7.13',
      TRAEFIK_6JWX,
      TRAEFIK_6JWX_FIX,
      'nao-afetada',
      'traefik GHSA-6jwx',
    ],
    [
      '2.11.40',
      TRAEFIK_6JWX,
      TRAEFIK_6JWX_FIX,
      'afetada',
      'traefik GHSA-6jwx (menor teto)',
    ],
    [
      '4.9.1',
      JOSE,
      '^1.28.2 || ^2.0.6 || ^3.20.4 || >=4.9.2',
      'afetada',
      'jose GHSA-jv3g (piso parcial)',
    ],
    [
      '4.9.2',
      JOSE,
      '^1.28.2 || ^2.0.6 || ^3.20.4 || >=4.9.2',
      'nao-afetada',
      'jose GHSA-jv3g',
    ],
    [
      '6.1.0',
      JOSE,
      '^1.28.2 || ^2.0.6 || ^3.20.4 || >=4.9.2',
      'nao-afetada',
      'jose GHSA-jv3g',
    ],
    ['7.2.4', '>= 7.2', 'TBD', 'afetada', 'redis GHSA-93m2 (piso parcial)'],
    ['7.2.4', 'All', 'TBD', 'indeterminada', 'redis GHSA-c8h9'],
    ['6.2.3', '6.2.x', '6.2.3', 'indeterminada', 'redis GHSA-qh52'],
    [
      '7.4.0',
      '2.2 or newer',
      '5.0.13, 6.0.15, 6.2.5',
      'indeterminada',
      'redis GHSA-8wxq',
    ],
    [
      '1.0.0',
      '>= RELEASE.2023-05-18T00-05-36Z',
      '>= RELEASE.2026-04-11T03-20-12Z',
      'indeterminada',
      'minio GHSA-hv4r',
    ],
    [
      '3.5.0',
      '>= 2.0.0 < 3.0.0, >= 2.5.0 < 4.0.0',
      '',
      'indeterminada',
      'sintético: regra A (E possível ≠ OU)',
    ],
    ['1.2.3', '', '', 'indeterminada', 'sintético: faixa vazia'],
    [
      '2.5.0',
      '< 1.5.3, >= 2.0.0',
      '',
      'indeterminada',
      'sintético: regra C (piso > teto)',
    ],
    [
      '1.9.0',
      '< 1.5.3, >= 2.0.0',
      '',
      'nao-afetada',
      'sintético: regra C fora da união',
    ],
    [
      '11.0.0',
      '>= 12.0.0, < 11.2.4',
      '12.0.2, 11.2.4',
      'indeterminada',
      'sintético: regra C sem desempate',
    ],
    [
      '12.0.5',
      '>= 12.0.0, < 11.2.4',
      '12.0.2, 11.2.4',
      'nao-afetada',
      'sintético: regra C com desempate 12.0.2',
    ],
    [
      '9.0.0',
      '9.0.0, < 8.2.2',
      '',
      'indeterminada',
      'sintético: piso implícito > teto',
    ],
    ['latest', '< 1.0.0', '', 'indeterminada', 'sintético: versão ilegível'],
  ];
  for (const [v, faixa, fix, esperado, origem] of casos) {
    const obtido = avaliar(v, faixa, fix);
    conferir(
      obtido === esperado,
      `${origem}: ${v} em "${faixa}" → ${obtido} (esperado ${esperado})`,
    );
  }

  // Ordem SemVer §11: exemplo oficial de semver.org + os rc reais do Baileys no npm.
  const cadeias = [
    [
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-alpha.beta',
      '1.0.0-beta',
      '1.0.0-beta.2',
      '1.0.0-beta.11',
      '1.0.0-rc.1',
      '1.0.0',
    ],
    [
      '6.7.22',
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `7.0.0-rc.${n}`),
      ...[10, 11, 12, 13, 14].map((n) => `7.0.0-rc${n}`),
      '7.0.0',
    ],
  ];
  for (const cadeia of cadeias) {
    for (let i = 0; i + 1 < cadeia.length; i++) {
      const [a, b] = [parseVer(cadeia[i]), parseVer(cadeia[i + 1])];
      conferir(
        cmpVer(a, b) < 0 && cmpVer(b, a) > 0,
        `ordem: ${cadeia[i]} < ${cadeia[i + 1]}`,
      );
    }
  }

  // patched_versions → versões corrigidas (tetos não contam)
  const corr = (t) =>
    versoesCorrigidas(t).map(
      (c) =>
        c.v.nums.join('.') + (c.v.pre.length ? `-${c.v.pre.join('.')}` : ''),
    );
  const listas = [
    ['>= 6.0.1 < 7.0.0; >= 7.4.1 ', ['6.0.1', '7.4.1']],
    ['6.24.0: 7.24.0', ['6.24.0', '7.24.0']],
    [
      '^1.28.2 || ^2.0.6 || ^3.20.4 || >=4.9.2',
      ['1.28.2', '2.0.6', '3.20.4', '4.9.2'],
    ],
    ['4.4.0+', ['4.4.0']],
    ['12.0.2 and 11.2.4', ['12.0.2', '11.2.4']],
    ['7.0.0-rc12,6.7.22', ['7.0.0-rc12', '6.7.22']],
    ['>= RELEASE.2026-04-11T03-20-12Z', []],
  ];
  for (const [t, esperado] of listas) {
    const obtido = corr(t);
    conferir(
      JSON.stringify(obtido) === JSON.stringify(esperado),
      `corrigidas "${t}" → ${JSON.stringify(obtido)}`,
    );
  }

  // aceites (hoje fixo)
  const hoje = '2026-09-25';
  const aceite = {
    ghsa: 'GHSA-p68q-wchp-6fh7',
    pacote: 'fastify',
    motivo: 'motivo técnico verdadeiro',
    revisarAte: '2026-11-30',
  };
  const aceitesCasos = [
    [aceite, true],
    [{ ...aceite, revisarAte: '2026-09-25' }, true],
    [{ ...aceite, revisarAte: '2026-09-24' }, false],
    [{ ...aceite, revisarAte: '2026-02-30' }, false],
    [{ ...aceite, revisarAte: '30/11/2026' }, false],
    [{ ...aceite, revisarAte: undefined }, false],
    [{ ...aceite, motivo: '' }, false],
    [{ ...aceite, pacote: ' ' }, false],
    [{ ...aceite, ghsa: 'CVE-2026-3635' }, false],
  ];
  for (const [a, esperado] of aceitesCasos) {
    const v = validarAceite(a, hoje);
    conferir(
      v.valido === esperado,
      `aceite ${JSON.stringify(a)} → ${v.valido} ${v.porque ?? ''}`,
    );
  }

  // infra sem versão de produção (janela 180 dias, lida em 25/09 16:21:13Z)
  const agora = new Date('2026-09-27T12:00:00Z');
  const traefik = {
    repo: 'traefik/traefik',
    reconhecidoEm: '2026-09-25T16:21:13Z',
  };
  const adv = (severity, published_at, updated_at = published_at) => ({
    severity,
    published_at,
    updated_at,
  });
  const infraCasos = [
    [
      adv('critical', '2026-09-07T14:00:00Z', '2026-09-10T08:00:00Z'),
      traefik,
      'reconhecida',
      'traefik GHSA-qqjf',
    ],
    [
      adv('critical', '2026-08-21T10:00:00Z'),
      traefik,
      'reconhecida',
      'traefik GHSA-5w68',
    ],
    [
      adv('high', '2026-09-25T16:00:00Z'),
      traefik,
      'reconhecida',
      'publicada antes da leitura, mesmo dia',
    ],
    [
      adv('high', '2026-09-25T23:59:00Z'),
      traefik,
      'nova',
      'publicada DEPOIS da leitura, mesmo dia',
    ],
    [
      adv('high', '2026-09-26T09:00:00Z'),
      traefik,
      'nova',
      'publicada depois do reconhecimento',
    ],
    [
      adv('medium', '2026-09-26T09:00:00Z'),
      traefik,
      'fora',
      'medium não entra',
    ],
    [
      adv('high', '2025-01-01T00:00:00Z'),
      traefik,
      'fora',
      'fora da janela e não mexida',
    ],
    [
      adv('high', '2025-01-01T00:00:00Z', '2026-09-26T00:00:00Z'),
      traefik,
      'nova+atualizada',
      'antiga (fora da janela) atualizada depois',
    ],
    [
      adv('critical', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'),
      traefik,
      'nova+atualizada',
      'reconhecida e atualizada depois (releia)',
    ],
    [
      adv('critical', '2026-09-07T14:00:00Z'),
      { repo: 'x/y' },
      'nova',
      'repo sem reconhecimento',
    ],
    [adv('high', null, null), traefik, 'nova', 'data ilegível conta como nova'],
  ];
  for (const [a, alvo, esperado, origem] of infraCasos) {
    const c = classificarInfra(a, alvo, agora, 180);
    const obtido = !c
      ? 'fora'
      : c.reconhecida
        ? 'reconhecida'
        : c.atualizadaDepois
          ? 'nova+atualizada'
          : 'nova';
    conferir(
      obtido === esperado,
      `infra ${origem}: ${obtido} (esperado ${esperado})`,
    );
  }

  // Dockerfile → Node do estágio FINAL (tag exata), com ARG, espelho e estágio herdado
  const dockerfiles = [
    [
      'FROM node:26.10.0-bookworm-slim AS build\nRUN x\nFROM node:26.10.0-bookworm-slim AS production',
      '26.10.0',
    ],
    [
      'FROM node:26-bookworm-slim AS build\nFROM node:26-bookworm-slim AS p',
      null,
    ],
    [
      'FROM node:26.10.0-bookworm-slim AS b\nFROM node:26.8.0-bookworm-slim AS p',
      '26.8.0',
    ],
    ['from --platform=linux/amd64 node:26.10.0@sha256:abc AS b', '26.10.0'],
    ['FROM node@sha256:abc AS b', null],
    [
      'ARG NODE_VERSION=26.8.0\nFROM node:${NODE_VERSION}-bookworm-slim AS p',
      '26.8.0',
    ],
    ['ARG V="26.9.0"\nFROM docker.io/library/node:$V-bookworm-slim', '26.9.0'],
    ['FROM mirror.gcr.io/library/node:26.10.0-bookworm-slim AS p', '26.10.0'],
    [
      'FROM node:26.10.0-bookworm-slim AS base\nFROM base AS production',
      '26.10.0',
    ],
    ['FROM node:26.10.0-bookworm-slim AS build\nFROM nginx:1.27-alpine', null],
    ['FROM nodered/node-red:4', null],
  ];
  for (const [texto, esperado] of dockerfiles) {
    const obtido = nodeDoDockerfile(texto).versao;
    conferir(
      obtido === esperado,
      `dockerfile ${JSON.stringify(texto.slice(0, 50))} → ${obtido}`,
    );
  }

  // nomes e repository (valores reais dos advisories e dos package.json instalados)
  const nomes = [
    ['@nestjs/platform-fastify', ['@nestjs/platform-fastify']],
    ['nodejs/undici', ['undici', '@nodejs/undici']],
    ['Traefik', ['traefik']],
    [
      '@nestjs/core, @nestjs/platform-fastify',
      ['@nestjs/core', '@nestjs/platform-fastify'],
    ],
    ['@nestjs/core and @nestjs/common', ['@nestjs/core', '@nestjs/common']],
    ['', []],
  ];
  for (const [n, esperado] of nomes) {
    const obtido = nomesCandidatos(n);
    conferir(
      JSON.stringify(obtido) === JSON.stringify(esperado),
      `nome "${n}" → ${JSON.stringify(obtido)}`,
    );
  }
  const repositorios = [
    [
      { url: 'git+https://github.com/fastify/fastify-cookie.git' },
      'fastify/fastify-cookie',
    ],
    ['git@github.com:WhiskeySockets/Baileys.git', 'WhiskeySockets/Baileys'],
    ['WhiskeySockets/libsignal-node', 'WhiskeySockets/libsignal-node'],
    [
      {
        url: 'git://github.com/brianc/node-postgres.git',
        directory: 'packages/pg',
      },
      'brianc/node-postgres',
    ],
    [
      {
        url: 'https://github.com/puppeteer/puppeteer/tree/main/packages/puppeteer',
      },
      'puppeteer/puppeteer',
    ],
    [{ url: 'git+https://github.com/apify/proxy-chain' }, 'apify/proxy-chain'],
    [undefined, null],
  ];
  for (const [r, esperado] of repositorios) {
    const obtido = repoDoRepository(r);
    conferir(
      obtido === esperado,
      `repository ${JSON.stringify(r)} → ${obtido}`,
    );
  }

  for (const e of erros) console.error(`FALHOU ${e}`);
  console.log(`${total - erros.length}/${total} casos ok`);
  process.exitCode = erros.length ? 1 : 0;
}

// ================================================================ entrada

function lerArgs(argv) {
  const o = {
    autoteste: false,
    informativo: false,
    json: null,
    config: process.env.CHECAR_ADVISORIES_CONFIG
      ? path.resolve(process.env.CHECAR_ADVISORIES_CONFIG)
      : CONFIG_PADRAO,
    lockfile: LOCK_PADRAO,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--autoteste') o.autoteste = true;
    else if (a === '--informativo') o.informativo = true;
    else if (a === '--json' || a === '--config' || a === '--lockfile') {
      const v = argv[++i];
      if (!v || v.startsWith('--')) throw new Error(`${a} exige um caminho`);
      o[a.slice(2)] = path.resolve(v);
    } else throw new Error(`opção desconhecida: ${a}`);
  }
  return o;
}

let opcoes;
try {
  opcoes = lerArgs(process.argv.slice(2));
} catch (err) {
  console.error(`ERRO: ${err.message}`);
  console.error(
    'uso: node scripts/checar-advisories.mjs [--informativo] [--json <arq>] [--config <arq>] [--lockfile <arq>] | --autoteste',
  );
  process.exitCode = 2;
}
if (opcoes?.autoteste) {
  autoteste();
} else if (opcoes) {
  main(opcoes).catch((err) => {
    console.error(`ERRO: ${err.stack ?? err}`);
    process.exitCode = 2;
  });
}

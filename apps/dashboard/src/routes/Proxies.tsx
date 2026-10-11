import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import type {
  BulkDeleteProxiesResult,
  ProxyAssignmentDto,
  ProxyDto,
  ProxyListItemDto,
  ProxyMode,
  ProxyProtocol,
  ProxyStrategy,
  SessionDto,
} from '@contracts';
import {
  ProxyPicker,
  type ProxyPickerOption,
} from '../components/proxies/ProxyPicker';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  bulkDeleteQuestion,
  bulkDeleteResultText,
  bulkDeleteSummary,
  bulkDeleteWarning,
  consentFromPick,
  inUseErrorText,
  isSelectableProxy,
  proxyOptionLabel,
  proxyUsageView,
  selectAllState,
  shareFromConsent,
  sharedNote,
  toggleAll,
  toggleOne,
  unavailableText,
  type ShareConsent,
} from '../lib/proxy-usage';

const PROTOCOLS: ProxyProtocol[] = ['HTTP', 'HTTPS', 'SOCKS4', 'SOCKS5'];
const MODES: { value: ProxyMode; label: string }[] = [
  { value: 'NONE', label: 'Sem proxy' },
  { value: 'SINGLE', label: 'Proxy fixo' },
  { value: 'RANGE', label: 'Faixa de IDs' },
  { value: 'GLOBAL_ROUND_ROBIN', label: 'Global (round-robin)' },
];
const STRATEGIES: ProxyStrategy[] = [
  'STICKY',
  'ROUND_ROBIN',
  'LEAST_LATENCY',
  'RANDOM',
];

function statusBadge(status: ProxyDto['status']) {
  const map: Record<ProxyDto['status'], string> = {
    ALIVE: 'bg-emerald-500/15 text-emerald-400',
    DEAD: 'bg-red-500/15 text-red-400',
    UNTESTED: 'bg-zinc-600/30 text-zinc-300',
  };
  return map[status];
}

// E28/P-107 — "livre"/"em uso por N sessões" no pool, com os nomes (ajuda a decidir o que excluir).
function UsageCell({ proxy }: { proxy: ProxyListItemDto }) {
  const u = proxyUsageView(proxy);
  return (
    <div className="min-w-0" title={u.title}>
      <span
        className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${
          u.tone === 'used'
            ? 'bg-red-500/15 text-red-400'
            : u.tone === 'free'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-zinc-600/30 text-zinc-300'
        }`}
      >
        {u.text}
      </span>
      {u.others.length > 0 && (
        <p className="mt-1 max-w-48 truncate text-xs text-zinc-500">
          {u.others.join(', ')}
        </p>
      )}
    </div>
  );
}

export function Proxies() {
  const { signOut } = useAuth();
  const [proxies, setProxies] = useState<ProxyListItemDto[]>([]);
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [assignments, setAssignments] = useState<
    Record<string, ProxyAssignmentDto>
  >({});
  const [webshare, setWebshare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<'one' | 'bulk'>('one');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [protocol, setProtocol] = useState<ProxyProtocol>('HTTP');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkProtocol, setBulkProtocol] = useState<ProxyProtocol>('HTTP');

  // E28/P-107 — marcar vários e excluir com UMA confirmação (na página, sem confirm() nativo).
  // A seleção guarda ids; o que some da lista (outra aba apagou) deixa de contar sozinho.
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const allRef = useRef<HTMLInputElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const poolCountRef = useRef<HTMLParagraphElement>(null);
  // Ordem das cargas do pool: uma resposta velha (seletor aberto com a rede lenta) não sobrescreve
  // a nova (ex.: a recarga depois da exclusão em lote, que traria de volta os apagados).
  const proxiesSeq = useRef(0);
  const allState = selectAllState(selected, proxies);
  const summary = bulkDeleteSummary(selected, proxies);
  const selCount = summary.ids.length;
  const showConfirm = confirming && selCount > 0;
  const deleteWarning = bulkDeleteWarning(summary);
  const confirmTitleId = useId();

  // "Marcar todos" fica no meio-termo (indeterminate) com seleção parcial — só via DOM.
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = allState === 'some';
  }, [allState]);

  // Ao pedir a exclusão, o foco vai para "Cancelar" (o padrão seguro numa ação sem volta).
  useEffect(() => {
    if (showConfirm) cancelRef.current?.focus();
  }, [showConfirm]);

  // A seleção esvaziou com a confirmação pedida (os marcados sumiram num refresh): o pedido cai —
  // senão a confirmação voltaria sozinha ao marcar outro proxy. (Durante a confirmação as caixas
  // ficam travadas, então a seleção só muda por fora.)
  useEffect(() => {
    if (confirming && selCount === 0) setConfirming(false);
  }, [confirming, selCount]);

  function cancelBulkDelete() {
    // flushSync: o botão "Excluir selecionados" volta ao DOM antes do focus().
    flushSync(() => setConfirming(false));
    deleteBtnRef.current?.focus();
  }

  async function confirmBulkDelete() {
    setDeleting(true);
    setError(null);
    let r: BulkDeleteProxiesResult;
    try {
      r = await api.proxies.bulkRemove({ ids: summary.ids });
    } catch (e) {
      setError((e as Error).message);
      // Os botões voltam a valer; o foco (no botão que estava desativado) vai para "Cancelar".
      flushSync(() => setDeleting(false));
      cancelRef.current?.focus();
      return;
    }
    setSelected(new Set());
    setConfirming(false);
    setDeleting(false);
    flash(bulkDeleteResultText(r));
    const left = await refresh();
    // A barra some com a seleção: o foco volta para a tabela — o "marcar todos" ou, sem nenhum
    // proxy (ele fica desativado), a contagem do pool.
    if (left && left.length > 0) allRef.current?.focus();
    else poolCountRef.current?.focus();
  }

  // Abrir o seletor de uma sessão recarrega só o pool (contagem de uso fresca no clique).
  async function reloadProxies() {
    const seq = ++proxiesSeq.current;
    try {
      const list = await api.proxies.list();
      if (seq === proxiesSeq.current) setProxies(list);
    } catch {
      /* mantém a última lista boa; o PUT revalida no gateway */
    }
  }

  async function refresh(): Promise<ProxyListItemDto[] | null> {
    const seq = ++proxiesSeq.current;
    try {
      const [px, ss, ws] = await Promise.all([
        api.proxies.list(),
        api.sessions.list(),
        api.proxies.webshareStatus(),
      ]);
      if (seq === proxiesSeq.current) setProxies(px);
      setSessions(ss);
      setWebshare(ws.configured);
      const entries = await Promise.all(
        ss.map(
          async (s) => [s.id, await api.proxies.getAssignment(s.id)] as const,
        ),
      );
      setAssignments(Object.fromEntries(entries));
      return px;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  function flash(msg: string) {
    setInfo(msg);
    setTimeout(() => setInfo(null), 3000);
  }

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const portNum = Number(port);
    if (!host.trim() || !Number.isInteger(portNum)) {
      setError('Informe host e porta válidos');
      return;
    }
    await act(async () => {
      await api.proxies.create({
        host: host.trim(),
        port: portNum,
        protocol,
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        label: label.trim() || undefined,
      });
      setHost('');
      setPort('');
      setUsername('');
      setPassword('');
      setLabel('');
    });
  }

  async function onBulk(e: FormEvent) {
    e.preventDefault();
    if (!bulkText.trim()) return;
    setError(null);
    try {
      const r = await api.proxies.bulk({
        text: bulkText,
        protocol: bulkProtocol,
      });
      setBulkText('');
      flash(`${r.created} importados, ${r.failed} falharam`);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function testAll() {
    setBusy(true);
    setError(null);
    try {
      await api.proxies.testAll();
      flash('Teste concluído');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function syncWebshare() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.proxies.webshareSync();
      flash(`Webshare: ${r.created} novos, ${r.updated} atualizados`);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Proxies <span className="text-zinc-500">· pool & rotação</span>
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <main className="space-y-8 p-6">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-emerald-400">{info}</p>}

        {/* ---- POOL ---- */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p
              ref={poolCountRef}
              tabIndex={-1}
              className="text-sm text-zinc-400 outline-none"
            >
              {proxies.length} proxy(s) no pool — posição estável (âncora das
              faixas)
            </p>
            <div className="flex gap-2">
              <button
                onClick={testAll}
                disabled={busy || proxies.length === 0}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-40"
              >
                Testar todos
              </button>
              <button
                onClick={syncWebshare}
                disabled={busy || !webshare}
                title={
                  webshare
                    ? 'Sincronizar com Webshare'
                    : 'WEBSHARE_API_KEY não configurado'
                }
                className="rounded-lg border border-indigo-800 bg-indigo-600/20 px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-40"
              >
                Sync Webshare
              </button>
            </div>
          </div>

          <div className="mb-4 flex gap-1 text-sm">
            <button
              onClick={() => setTab('one')}
              className={`rounded-lg px-3 py-1.5 ${tab === 'one' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`}
            >
              Adicionar 1
            </button>
            <button
              onClick={() => setTab('bulk')}
              className={`rounded-lg px-3 py-1.5 ${tab === 'bulk' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`}
            >
              Importar lista
            </button>
          </div>

          {tab === 'one' ? (
            <form
              onSubmit={onCreate}
              className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <Field label="Host">
                <input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="1.2.3.4"
                  className="w-40 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </Field>
              <Field label="Porta">
                <input
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="8080"
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </Field>
              <Field label="Protocolo">
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as ProxyProtocol)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {PROTOCOLS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Usuário">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="opcional"
                  className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </Field>
              <Field label="Senha">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="opcional"
                  className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </Field>
              <Field label="Label">
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="opcional"
                  className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </Field>
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                Adicionar
              </button>
            </form>
          ) : (
            <form
              onSubmit={onBulk}
              className="mb-5 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <p className="text-xs text-zinc-400">
                Uma linha por proxy:{' '}
                <code className="text-zinc-300">host:port</code>,{' '}
                <code className="text-zinc-300">host:port:user:pass</code> ou{' '}
                <code className="text-zinc-300">user:pass@host:port</code>
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                placeholder={'1.2.3.4:8080:user:pass\n5.6.7.8:1080'}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500"
              />
              <div className="flex items-end gap-3">
                <Field label="Protocolo">
                  <select
                    value={bulkProtocol}
                    onChange={(e) =>
                      setBulkProtocol(e.target.value as ProxyProtocol)
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    {PROTOCOLS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                  Importar
                </button>
              </div>
            </form>
          )}

          {/* E28/P-107 — barra da seleção; a confirmação é UMA para o lote, aqui mesmo. */}
          {selCount > 0 && !showConfirm && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
              <span className="text-zinc-300">
                {selCount === 1
                  ? '1 proxy selecionado'
                  : `${selCount} proxies selecionados`}
              </span>
              <button
                ref={deleteBtnRef}
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-red-900/60 px-3 py-1.5 text-red-400 hover:bg-red-950/40"
              >
                Excluir selecionados
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800"
              >
                Limpar seleção
              </button>
            </div>
          )}
          {showConfirm && (
            <div
              role="group"
              aria-labelledby={confirmTitleId}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && !deleting) {
                  e.preventDefault();
                  cancelBulkDelete();
                }
              }}
              className="mb-3 space-y-2 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm"
            >
              <p id={confirmTitleId} className="font-medium text-red-300">
                {bulkDeleteQuestion(selCount)}
              </p>
              {deleteWarning && (
                <p className="text-amber-300">{deleteWarning}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={confirmBulkDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {deleting
                    ? 'Excluindo…'
                    : selCount === 1
                      ? 'Excluir 1 proxy'
                      : `Excluir ${selCount} proxies`}
                </button>
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={cancelBulkDelete}
                  disabled={deleting}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-left text-zinc-400">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      ref={allRef}
                      type="checkbox"
                      checked={allState === 'all'}
                      disabled={proxies.length === 0 || deleting || showConfirm}
                      onChange={() => setSelected((s) => toggleAll(s, proxies))}
                      aria-label="Marcar todos os proxies"
                      className="h-4 w-4 accent-emerald-500"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">Endereço</th>
                  <th className="px-3 py-3 font-medium">Proto</th>
                  <th className="px-3 py-3 font-medium">Origem</th>
                  <th className="px-3 py-3 font-medium">País</th>
                  <th className="px-3 py-3 font-medium">IP de saída</th>
                  <th className="px-3 py-3 font-medium">Latência</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Sessões</th>
                  <th className="px-3 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {proxies.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-3 py-10 text-center text-zinc-500"
                    >
                      Pool vazio. Adicione proxies ou sincronize com a Webshare.
                    </td>
                  </tr>
                )}
                {proxies.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-zinc-900/40 ${p.enabled ? '' : 'opacity-50'} ${
                      selected.has(p.id) ? 'bg-zinc-900/60' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        disabled={deleting || showConfirm}
                        onChange={() => setSelected((s) => toggleOne(s, p.id))}
                        aria-label={`Selecionar o proxy #${p.position}`}
                        className="h-4 w-4 accent-emerald-500"
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-zinc-400">
                      {p.position}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {p.host}:{p.port}
                      {p.label && (
                        <span className="ml-2 text-zinc-500">{p.label}</span>
                      )}
                      {p.hasAuth && (
                        <span className="ml-1 text-zinc-600">🔒</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{p.protocol}</td>
                    <td className="px-3 py-3 text-zinc-400">{p.source}</td>
                    <td className="px-3 py-3 text-zinc-400">
                      {p.country ?? '—'}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-400">
                      {p.exitIp ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-zinc-400">
                      {p.latencyMs != null ? `${p.latencyMs}ms` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(p.status)}`}
                      >
                        {p.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <UsageCell proxy={p} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => act(() => api.proxies.test(p.id))}
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                        >
                          Testar
                        </button>
                        <button
                          onClick={() =>
                            act(() =>
                              p.enabled
                                ? api.proxies.disable(p.id)
                                : api.proxies.enable(p.id),
                            )
                          }
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800"
                        >
                          {p.enabled ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Excluir este proxy?'))
                              act(() => api.proxies.remove(p.id));
                          }}
                          className="rounded-md border border-red-900/60 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- ATRIBUIÇÕES POR SESSÃO ---- */}
        <section>
          <h2 className="mb-1 font-medium">Atribuição por sessão</h2>
          <p className="mb-4 text-sm text-zinc-400">
            Defina qual proxy/faixa cada instância usa. Faixas podem se sobrepor
            (ex.: A=1–10, B=5–10). Reinicie a sessão para aplicar. No proxy
            fixo: <span className="text-emerald-400">verde</span> = livre,{' '}
            <span className="text-red-400">vermelho</span> = já usado por outra
            sessão (dá para compartilhar).
          </p>
          <div className="space-y-3">
            {sessions.length === 0 && (
              <p className="text-sm text-zinc-500">
                Nenhuma sessão cadastrada.
              </p>
            )}
            {sessions.map((s) => {
              const a = assignments[s.id];
              // A key inclui o assignment salvo: quando ele carrega (async) ou muda após salvar,
              // a linha re-monta e passa a refletir o estado persistido (corrige o "parece que não salvou").
              const k = `${s.id}:${a?.mode ?? 'none'}:${a?.currentProxyId ?? ''}:${a?.rangeStart ?? ''}-${a?.rangeEnd ?? ''}:${a?.strategy ?? ''}`;
              return (
                <AssignmentRow
                  key={k}
                  session={s}
                  proxies={proxies}
                  assignment={a}
                  onSaved={(msg) => {
                    flash(msg);
                    void refresh();
                  }}
                  onError={setError}
                  onPickerOpen={() => void reloadProxies()}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-xs text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

// E28/P-107 — opções do proxy fixo de uma sessão já criada: os escolhíveis (habilitados e não-DEAD)
// em verde/vermelho conforme OUTRA sessão use, e o proxy atual mesmo que tenha ficado indisponível
// (aparece cinza, sem poder ser escolhido de novo).
function assignmentOptions(
  proxies: readonly ProxyListItemDto[],
  sessionId: string,
  currentId: string | null,
): ProxyPickerOption[] {
  return proxies
    .filter((p) => isSelectableProxy(p) || p.id === currentId)
    .map((p): ProxyPickerOption => {
      const tags = p.id === currentId ? ['atual'] : undefined;
      const off = unavailableText(p);
      if (off) {
        return {
          value: p.id,
          label: proxyOptionLabel(p),
          tone: 'off',
          badge: off,
          tags,
          disabled: true,
        };
      }
      const u = proxyUsageView(p, sessionId);
      return {
        value: p.id,
        label: proxyOptionLabel(p),
        tone: u.tone === 'unknown' ? 'none' : u.tone,
        badge: u.text,
        title: u.title,
        tags,
      };
    });
}

function AssignmentRow({
  session,
  proxies,
  assignment,
  onSaved,
  onError,
  onPickerOpen,
}: {
  session: SessionDto;
  proxies: ProxyListItemDto[];
  assignment?: ProxyAssignmentDto;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onPickerOpen: () => void;
}) {
  const pickerLabelId = useId();
  const noteId = useId();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ProxyMode>(assignment?.mode ?? 'NONE');
  const [rangeStart, setRangeStart] = useState(
    String(assignment?.rangeStart ?? ''),
  );
  const [rangeEnd, setRangeEnd] = useState(String(assignment?.rangeEnd ?? ''));
  const [strategy, setStrategy] = useState<ProxyStrategy>(
    assignment?.strategy ?? 'STICKY',
  );
  const [proxyId, setProxyId] = useState(assignment?.currentProxyId ?? '');
  // E28/D-051 — consentimento de compartilhar registrado NA ESCOLHA (o dono pegou um vermelho).
  // O valor herdado da atribuição salva não conta; repetir o próprio SINGLE nem precisa (gateway).
  const [consent, setConsent] = useState<ShareConsent | null>(null);
  const [saving, setSaving] = useState(false);

  // "dirty" = o formulário difere do que está persistido. Derivado das props (não de estado
  // transitório), então o botão "✓ Salvo" sobrevive ao re-mount disparado pelo refresh pós-save.
  const dirty =
    mode !== (assignment?.mode ?? 'NONE') ||
    proxyId !== (assignment?.currentProxyId ?? '') ||
    rangeStart !== String(assignment?.rangeStart ?? '') ||
    rangeEnd !== String(assignment?.rangeEnd ?? '') ||
    strategy !== (assignment?.strategy ?? 'STICKY');

  const chosen = proxies.find((p) => p.id === proxyId);
  const shareNote =
    mode === 'SINGLE' && chosen ? sharedNote(chosen, session.id) : null;

  async function save() {
    if (mode === 'SINGLE' && !proxyId) {
      onError(`Selecione um proxy para "${session.name}" antes de salvar.`);
      return;
    }
    if (mode === 'RANGE' && (!rangeStart || !rangeEnd)) {
      onError(`Informe a faixa (de/até) para "${session.name}".`);
      return;
    }
    // E28/D-051: compartilhar só se o dono ESCOLHEU um proxy que estava vermelho naquela hora. Um
    // verde que outra sessão pegou depois (inclusive outra linha desta tela) volta 400 "em uso".
    const share = mode === 'SINGLE' && shareFromConsent(proxyId, consent);
    setSaving(true);
    try {
      await api.proxies.setAssignment(session.id, {
        mode,
        rangeStart: rangeStart ? Number(rangeStart) : null,
        rangeEnd: rangeEnd ? Number(rangeEnd) : null,
        strategy,
        proxyId: proxyId || null,
        ...(share ? { allowSharedProxy: true } : {}),
      });
      onSaved(`Proxy de "${session.name}" atualizado — reinicie para aplicar`);
    } catch (e) {
      onError(inUseErrorText((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="min-w-40">
        <p className="text-sm font-medium">{session.name}</p>
        <p className="text-xs text-zinc-500">
          {session.phoneNumber ?? session.status}
        </p>
      </div>
      <Field label="Modo">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ProxyMode)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      {mode === 'SINGLE' && (
        // Fora de <label>: clicar numa opção da lista dentro do <label> reabriria o seletor.
        <div className="w-104 max-w-full space-y-1">
          {/* Clicar no rótulo foca o campo, como num <label>. */}
          <span
            id={pickerLabelId}
            onClick={() => pickerRef.current?.focus()}
            className="block text-xs text-zinc-400"
          >
            Proxy
          </span>
          <ProxyPicker
            ref={pickerRef}
            value={proxyId}
            options={assignmentOptions(
              proxies,
              session.id,
              assignment?.currentProxyId ?? null,
            )}
            onChange={(id, option) => {
              setProxyId(id);
              setConsent(consentFromPick(id, option.tone));
            }}
            labelledBy={pickerLabelId}
            describedBy={shareNote ? noteId : undefined}
            missingLabel="Proxy excluído do pool — escolha outro"
            onOpen={onPickerOpen}
            className="w-full"
          />
        </div>
      )}

      {mode === 'RANGE' && (
        <>
          <Field label="De (#)">
            <input
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </Field>
          <Field label="Até (#)">
            <input
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </Field>
        </>
      )}

      {(mode === 'RANGE' || mode === 'GLOBAL_ROUND_ROBIN') && (
        <Field label="Estratégia">
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as ProxyStrategy)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {STRATEGIES.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
        </Field>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          saving
            ? 'bg-emerald-700 text-white'
            : dirty
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'cursor-default border border-emerald-700/60 bg-transparent text-emerald-400'
        }`}
      >
        {saving ? 'Salvando…' : dirty ? 'Salvar' : '✓ Salvo'}
      </button>
      {shareNote && (
        <p id={noteId} className="basis-full text-xs text-amber-300">
          {shareNote}
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HealthResponse } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

function Dot({ up }: { up: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${up ? 'bg-emerald-500' : 'bg-red-500'}`}
    />
  );
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const tick = () =>
      api
        .health()
        .then(setHealth)
        .catch(() => setHealth(null));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">
          WhatsApp Gateway <span className="text-zinc-500">· painel</span>
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">
            {user?.name} ({user?.role})
          </span>
          <button
            onClick={signOut}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Saúde do sistema</h2>
            {health ? <Dot up={health.status === 'ok'} /> : <Dot up={false} />}
          </div>
          {health ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Status</dt>
                <dd className="font-medium">{health.status}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">PostgreSQL</dt>
                <dd className="flex items-center gap-2">
                  {health.checks.database ? 'ok' : 'falha'}
                  <Dot up={health.checks.database} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">Redis</dt>
                <dd className="flex items-center gap-2">
                  {health.checks.redis ? 'ok' : 'falha'}
                  <Dot up={health.checks.redis} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Uptime</dt>
                <dd>{health.uptimeSeconds}s</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">Sem conexão com o gateway…</p>
          )}
        </section>

        <Link
          to="/sessions"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Sessões →</h2>
          <p className="text-sm text-zinc-400">
            Criar instância, conectar por QR Code ou código de pareamento,
            gerenciar.
          </p>
        </Link>

        <Link
          to="/inbox"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Inbox →</h2>
          <p className="text-sm text-zinc-400">
            Enviar e receber mensagens de texto pelas sessões conectadas.
          </p>
        </Link>

        <Link
          to="/monitor"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Event Monitor →</h2>
          <p className="text-sm text-zinc-400">
            Stream de eventos em tempo real (SSE): mensagens, status, etc.
          </p>
        </Link>

        <Link
          to="/webhooks"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Webhooks →</h2>
          <p className="text-sm text-zinc-400">
            Entregar eventos a sistemas externos (HMAC SHA-512 + retries).
          </p>
        </Link>

        <Link
          to="/proxies"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Proxies →</h2>
          <p className="text-sm text-zinc-400">
            Pool com posição estável, faixas por instância, rotação e sync
            Webshare.
          </p>
        </Link>

        <Link
          to="/groups"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Grupos →</h2>
          <p className="text-sm text-zinc-400">
            Criar grupos, participantes (add/remover/admin), link de convite,
            sair.
          </p>
        </Link>

        <Link
          to="/contacts"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Contatos →</h2>
          <p className="text-sm text-zinc-400">
            Verificar números no WhatsApp, foto de perfil, bloquear e canais.
          </p>
        </Link>

        <Link
          to="/campaigns"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Campanhas →</h2>
          <p className="text-sm text-zinc-400">
            Disparo em massa com anti-ban: espaçamento aleatório, “digitando”,
            agendamento e progresso ao vivo.
          </p>
        </Link>

        <Link
          to="/health"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">Logs &amp; saúde →</h2>
          <p className="text-sm text-zinc-400">
            Métricas (Prometheus em /metrics), heap/uptime, sessões por status e
            timeline por sessão.
          </p>
        </Link>
      </main>
    </div>
  );
}

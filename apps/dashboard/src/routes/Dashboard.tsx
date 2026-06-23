import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HealthResponse } from '@contracts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useBranding } from '../lib/branding';

function Dot({ up }: { up: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${up ? 'bg-emerald-500' : 'bg-red-500'}`}
    />
  );
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { branding } = useBranding();
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
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          {branding.logoUrl && (
            <img src={branding.logoUrl} alt="" className="h-6 object-contain" />
          )}
          {branding.productName}{' '}
          <span className="text-zinc-500">· painel</span>
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
          to="/api-keys"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
        >
          <h2 className="mb-2 font-medium text-zinc-100">API keys →</h2>
          <p className="text-sm text-zinc-400">
            Chaves X-Api-Key para integrações (n8n etc.) chamarem a API sem o
            login do painel.
          </p>
        </Link>

        {user?.role === 'OWNER' && (
          <Link
            to="/users"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
          >
            <h2 className="mb-2 font-medium text-zinc-100">Usuários →</h2>
            <p className="text-sm text-zinc-400">
              Membros do time, papéis (RBAC) e assentos. Visível só para OWNER.
            </p>
          </Link>
        )}

        {user?.role === 'OWNER' && (
          <Link
            to="/license"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
          >
            <h2 className="mb-2 font-medium text-zinc-100">Licença →</h2>
            <p className="text-sm text-zinc-400">
              Status do licenciamento, instalar/remover licença e limites do
              plano. Visível só para OWNER.
            </p>
          </Link>
        )}

        {user?.role === 'OWNER' && (
          <Link
            to="/branding"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
          >
            <h2 className="mb-2 font-medium text-zinc-100">Marca →</h2>
            <p className="text-sm text-zinc-400">
              White-label: nome do produto, logo, cor do tema e favicon.
              Visível só para OWNER.
            </p>
          </Link>
        )}

        {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
          <Link
            to="/audit"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-700 hover:bg-zinc-900/80"
          >
            <h2 className="mb-2 font-medium text-zinc-100">Auditoria →</h2>
            <p className="text-sm text-zinc-400">
              Histórico de ações que alteram estado (quem, o quê, quando).
              OWNER e ADMIN.
            </p>
          </Link>
        )}

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

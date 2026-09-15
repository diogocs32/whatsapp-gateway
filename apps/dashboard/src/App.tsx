import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { useAuth } from './lib/auth';
import {
  ErrorBoundary,
  installPreloadErrorHandler,
} from './lib/error-boundary';

// UP-09: chunk removido por um deploy novo → recarrega uma vez em vez de tela branca.
installPreloadErrorHandler();

// Code-splitting por rota (React.lazy + import dinâmico — react.dev/reference/react/lazy):
// cada tela vira um chunk próprio do Vite em vez de um bundle único com as 16 rotas. O login e a
// primeira tela carregam só o próprio código; o resto baixa sob demanda (com cache imutável por
// hash — ver nginx.conf). As rotas exportam componentes NOMEADOS; o lazy exige default → mapeia.
const page = <K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  name: K,
) => lazy(() => load().then((m) => ({ default: m[name] })));

const Login = page(() => import('./routes/Login'), 'Login');
const Dashboard = page(() => import('./routes/Dashboard'), 'Dashboard');
const Sessions = page(() => import('./routes/Sessions'), 'Sessions');
const Inbox = page(() => import('./routes/Inbox'), 'Inbox');
const Atendimento = page(() => import('./routes/Atendimento'), 'Atendimento');
const Monitor = page(() => import('./routes/Monitor'), 'Monitor');
const Webhooks = page(() => import('./routes/Webhooks'), 'Webhooks');
const ApiKeys = page(() => import('./routes/ApiKeys'), 'ApiKeys');
const Users = page(() => import('./routes/Users'), 'Users');
const License = page(() => import('./routes/License'), 'License');
const Branding = page(() => import('./routes/Branding'), 'Branding');
const Audit = page(() => import('./routes/Audit'), 'Audit');
const Proxies = page(() => import('./routes/Proxies'), 'Proxies');
const Groups = page(() => import('./routes/Groups'), 'Groups');
const Contacts = page(() => import('./routes/Contacts'), 'Contacts');
const Campaigns = page(() => import('./routes/Campaigns'), 'Campaigns');
const Health = page(() => import('./routes/Health'), 'Health');

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">
      Carregando…
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <Loading />;
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/sessions"
            element={
              <Protected>
                <Sessions />
              </Protected>
            }
          />
          <Route
            path="/inbox"
            element={
              <Protected>
                <Inbox />
              </Protected>
            }
          />
          <Route
            path="/atendimento"
            element={
              <Protected>
                <Atendimento />
              </Protected>
            }
          />
          <Route
            path="/monitor"
            element={
              <Protected>
                <Monitor />
              </Protected>
            }
          />
          <Route
            path="/webhooks"
            element={
              <Protected>
                <Webhooks />
              </Protected>
            }
          />
          <Route
            path="/api-keys"
            element={
              <Protected>
                <ApiKeys />
              </Protected>
            }
          />
          <Route
            path="/users"
            element={
              <Protected>
                <Users />
              </Protected>
            }
          />
          <Route
            path="/license"
            element={
              <Protected>
                <License />
              </Protected>
            }
          />
          <Route
            path="/branding"
            element={
              <Protected>
                <Branding />
              </Protected>
            }
          />
          <Route
            path="/audit"
            element={
              <Protected>
                <Audit />
              </Protected>
            }
          />
          <Route
            path="/proxies"
            element={
              <Protected>
                <Proxies />
              </Protected>
            }
          />
          <Route
            path="/groups"
            element={
              <Protected>
                <Groups />
              </Protected>
            }
          />
          <Route
            path="/contacts"
            element={
              <Protected>
                <Contacts />
              </Protected>
            }
          />
          <Route
            path="/campaigns"
            element={
              <Protected>
                <Campaigns />
              </Protected>
            }
          />
          <Route
            path="/health"
            element={
              <Protected>
                <Health />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

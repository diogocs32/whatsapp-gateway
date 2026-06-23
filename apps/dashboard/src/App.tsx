import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import { Login } from './routes/Login';
import { Dashboard } from './routes/Dashboard';
import { Sessions } from './routes/Sessions';
import { Inbox } from './routes/Inbox';
import { Monitor } from './routes/Monitor';
import { Webhooks } from './routes/Webhooks';
import { ApiKeys } from './routes/ApiKeys';
import { Users } from './routes/Users';
import { License } from './routes/License';
import { Branding } from './routes/Branding';
import { Audit } from './routes/Audit';
import { Proxies } from './routes/Proxies';
import { Groups } from './routes/Groups';
import { Contacts } from './routes/Contacts';
import { Campaigns } from './routes/Campaigns';
import { Health } from './routes/Health';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">
        Carregando…
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
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
  );
}

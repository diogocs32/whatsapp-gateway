import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@contracts';
import { api, UNAUTHORIZED_EVENT } from './api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sessão em cookie httpOnly (item 19): o front não enxerga o token — pergunta ao servidor
    // se há sessão válida. 401 = deslogado.
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Cookie expirou no meio do uso (JWT de 12h): qualquer 401 de /api/* zera o user e o
    // <RequireAuth> redireciona ao /login — em vez de painel quebrado repetindo 401 no polling.
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const signIn = async (username: string, password: string) => {
    const res = await api.login(username, password); // o servidor seta o cookie httpOnly
    setUser(res.user);
  };

  const signOut = () => {
    void api.logout().catch(() => undefined); // limpa o cookie no servidor
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

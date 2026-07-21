import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@contracts';
import { api, setUnauthorizedHandler } from './api';

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
    // Quando a renovação silenciosa falhar (refresh expirado/revogado), o cliente HTTP chama isto:
    // limpamos o usuário e o <Protected> redireciona pro /login — sem logout abrupto no meio do uso.
    setUnauthorizedHandler(() => setUser(null));
    // Sessão em cookie httpOnly: o front não enxerga o token — pergunta ao servidor se há sessão
    // válida. Se o access expirou mas o refresh vale, o próprio /me se auto-renova (interceptor).
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
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

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { AuthUser } from '@contracts';
import { api, setUnauthorizedHandler } from './api';
import { clearRememberedLinkUrls } from './connect-link-memory';
import { isPublicPath } from './connect-path';
import { mediaCache } from './media';

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
  // E27/P-086: a página pública /conectar é aberta por quem NÃO tem login — nada de /me (nem de
  // refresh). O efeito depende deste booleano: ao navegar de /conectar para uma rota privada, ele
  // roda e confere a sessão (o BrowserRouter envolve este provider — main.tsx). Na rota pública o
  // `loading` NÃO muda: segue true até o /me da primeira rota privada (senão o <Protected> veria
  // loading=false + user=null e mandaria um operador logado para o /login). Nas voltas seguintes
  // o /me roda em segundo plano, sem piscar o "Carregando…".
  const publicRoute = isPublicPath(useLocation().pathname);

  useEffect(() => {
    // Quando a renovação silenciosa falhar (refresh expirado/revogado), o cliente HTTP chama isto:
    // limpamos o usuário e o <Protected> redireciona pro /login — sem logout abrupto no meio do uso.
    setUnauthorizedHandler(() => setUser(null));
    if (publicRoute) return () => setUnauthorizedHandler(null);
    let alive = true;
    // Sessão em cookie httpOnly: o front não enxerga o token — pergunta ao servidor se há sessão
    // válida. Se o access expirou mas o refresh vale, o próprio /me se auto-renova (interceptor).
    api
      .me()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      setUnauthorizedHandler(null);
    };
  }, [publicRoute]);

  // E23: mídia de conversa em memória (object URLs) não sobrevive à saída — privacidade e memória.
  // E27/P-086: nem a URL (com token) dos links de conexão gerados nesta aba.
  useEffect(() => {
    if (user) return;
    mediaCache.clear();
    clearRememberedLinkUrls();
  }, [user]);

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

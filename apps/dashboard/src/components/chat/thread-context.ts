import { createContext, useContext, type RefObject } from 'react';

// O que a conversa aberta oferece aos balões: o contêiner rolável (raiz do IntersectionObserver
// que carrega imagem ao aparecer) e "mantém no fim" (mídia que termina de carregar muda a altura —
// se o operador estava no fim, continua no fim).
export interface ThreadContextValue {
  scrollRef: RefObject<HTMLDivElement | null>;
  keepBottom: () => void;
}

export const ThreadContext = createContext<ThreadContextValue | null>(null);

export function useThread(): ThreadContextValue | null {
  return useContext(ThreadContext);
}

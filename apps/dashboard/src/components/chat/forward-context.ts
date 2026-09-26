import { createContext, useContext } from 'react';
import type { MessageDto } from '@contracts';

// Ações do encaminhar que a conversa aberta oferece aos balões (E25). Identidade ESTÁVEL (criada uma
// vez pelo ChatThread): mudar o valor re-renderizaria todos os balões memorizados. O que muda (modo
// seleção, mensagem marcada) chega ao balão por props primitivas. null = conversa sem encaminhar.
export interface ForwardActions {
  // ⌄ → "Encaminhar": entra no modo seleção com esta mensagem marcada.
  startSelect: (m: MessageDto) => void;
  // Clique numa mensagem no modo seleção: marca esta (só 1 por vez — decisão do dono) ou desmarca.
  select: (m: MessageDto) => void;
  // Atalho ↪ das mídias: direto para o diálogo "Encaminhar mensagem para".
  quickForward: (m: MessageDto) => void;
}

export const ForwardContext = createContext<ForwardActions | null>(null);

export function useForwardActions(): ForwardActions | null {
  return useContext(ForwardContext);
}

import { CloseIcon, ForwardIcon } from './icons';

// Rodapé do modo seleção (E25), no lugar da caixa de resposta — como no WhatsApp Web: ✕ sai, o
// contador diz o que está marcado e a seta ↪ abre "Encaminhar mensagem para". Só 1 mensagem por vez
// (decisão do dono na E25): clicar noutra troca a marcada.
export function SelectionBar({
  count,
  onCancel,
  onForward,
}: {
  count: number;
  onCancel: () => void;
  onForward: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar encaminhamento"
        title="Cancelar encaminhamento (Esc)"
        className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
      <span className="text-sm text-zinc-200" aria-live="polite">
        {count === 1 ? '1 selecionada' : 'Nenhuma selecionada'}
      </span>
      <span className="hidden truncate text-xs text-zinc-500 sm:inline">
        Clique noutra mensagem para trocar
      </span>
      {/* Foco aqui ao entrar no modo seleção (o ⌄ que abriu o menu sai de cena): Enter já encaminha. */}
      <button
        type="button"
        autoFocus
        onClick={onForward}
        disabled={count === 0}
        aria-label="Encaminhar"
        title="Encaminhar"
        className="ml-auto rounded-full p-2 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ForwardIcon className="h-5 w-6" />
      </button>
    </div>
  );
}

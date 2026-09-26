import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, ForwardIcon } from './icons';

// Menu ⌄ da mensagem (E25), como o do WhatsApp Web: a seta aparece no canto do balão ao passar o
// mouse (ou com foco do teclado; sem mouse — tela de toque —, sempre) e abre as ações da mensagem — hoje só
// "Encaminhar". Padrão "menu button" do WAI-ARIA APG: Enter/Espaço/↓ abrem com o foco no 1º item,
// Esc fecha e devolve o foco à seta, Tab/clique fora/rolagem fecham.
//
// O menu vai para o <body> em posição fixa: dentro do balão ele seria cortado pelo contêiner que rola
// (overflow) na borda da conversa. Abre para baixo, ou para cima quando não cabe.

export function MessageMenu({
  onForward,
  tone,
}: {
  onForward: () => void;
  tone: 'out' | 'in' | 'sticker';
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Posição medida antes da pintura (sem piscar no canto) + foco no 1º item.
  useLayoutEffect(() => {
    if (!open) return;
    const b = btnRef.current?.getBoundingClientRect();
    const m = menuRef.current;
    if (!b || !m) return;
    const gap = 4;
    const margin = 8;
    const w = m.offsetWidth;
    const h = m.offsetHeight;
    const left = Math.min(
      Math.max(b.right - w, margin),
      window.innerWidth - w - margin,
    );
    const below = b.bottom + gap;
    const top =
      below + h > window.innerHeight - margin
        ? Math.max(b.top - gap - h, margin)
        : below;
    m.style.left = `${left}px`;
    m.style.top = `${top}px`;
    m.style.visibility = 'visible';
    m.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Fechou com o foco dentro do menu (rolagem, redimensionar): o foco volta à seta — nunca some.
    const close = () => {
      // preventScroll: devolver o foco não pode rolar a conversa de volta (fechou POR rolagem).
      if (menuRef.current?.contains(document.activeElement))
        btnRef.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    // Rolar a conversa (ou a página) tira a seta do lugar — fecha, como o WhatsApp Web.
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [open]);

  const closeAndFocus = () => {
    setOpen(false);
    btnRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // não sair do modo seleção / não fechar outra coisa junto
      closeAndFocus();
    } else if (e.key === 'Tab') {
      // APG: o Tab segue a partir do botão (o menu mora no fim do <body>, num portal) — sem
      // preventDefault, o Tab nativo continua dali.
      btnRef.current?.focus();
      setOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      items[(i + d + items.length) % items.length]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1]?.focus();
    }
  };

  // Fundo da seta = cor do balão (cobre o fim da 1ª linha, como o degradê do WhatsApp Web).
  const bg =
    tone === 'sticker'
      ? 'rounded-full bg-black/50 text-zinc-100'
      : tone === 'out'
        ? 'rounded-bl-lg bg-linear-to-l from-emerald-800 from-60% to-emerald-800/0 pl-3 text-emerald-100'
        : 'rounded-bl-lg bg-linear-to-l from-zinc-800 from-60% to-zinc-800/0 pl-3 text-zinc-300';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Opções da mensagem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`absolute top-0.5 right-0.5 z-10 flex h-5 items-center pr-0.5 transition-opacity focus-visible:opacity-100 ${bg} ${
          open
            ? 'opacity-100'
            : 'opacity-0 group-hover/msg:opacity-100 group-has-[:focus-visible]/msg:opacity-100 not-pointer-fine:opacity-100'
        }`}
      >
        <ChevronDownIcon className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Opções da mensagem"
            onKeyDown={onMenuKey}
            style={{ position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
            className="z-50 min-w-44 rounded-md bg-zinc-800 py-1.5 text-sm text-zinc-100 shadow-xl ring-1 ring-black/50"
          >
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                setOpen(false);
                onForward();
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left outline-none hover:bg-zinc-700 focus:bg-zinc-700"
            >
              <ForwardIcon className="h-3.5 w-4 text-zinc-400" />
              Encaminhar
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { comboKey, initialActive } from '../../lib/combobox-keys';

// E28 (P-107, D-051) — seletor de proxy com cor: verde = livre, vermelho = já em uso por outra
// sessão (com quantas), cinza = sem proxy / uso indisponível / indisponível. O <select> nativo não
// serve: a MDN (<option>, "Styling with CSS") diz que o estilo da opção "depends on the browser and
// operating system" — no Chrome/Safari do macOS a lista é nativa e não pinta. Então é o combobox
// "select-only" do WAI-ARIA APG: o foco fica no campo (aria-activedescendant) e as teclas seguem
// `lib/combobox-keys.ts` (Tab fecha SEM escolher, de propósito). A lista vai para o <body> em
// posição fixa e fecha com clique fora/rolagem da página/redimensionar, como o MessageMenu.
// `onChange` recebe a OPÇÃO escolhida a cada escolha (mesmo repetida): é aí que a tela registra o
// consentimento de compartilhar (o dono escolheu um vermelho naquela hora).

export type ProxyPickerTone = 'free' | 'used' | 'none' | 'off';

export interface ProxyPickerOption {
  value: string; // id do proxy; '' = sem proxy
  label: string;
  tone: ProxyPickerTone;
  badge?: string; // "livre" · "em uso por 2 sessões" · "desativado"
  title?: string; // dica (nomes das sessões)
  tags?: string[]; // "sugerido" · "atual"
  disabled?: boolean;
}

const DOT: Record<ProxyPickerTone, string> = {
  free: 'bg-emerald-400',
  used: 'bg-red-400',
  none: 'bg-zinc-500',
  off: 'bg-zinc-600',
};
const TEXT: Record<ProxyPickerTone, string> = {
  free: 'text-emerald-300',
  used: 'text-red-300',
  none: 'text-zinc-200',
  off: 'text-zinc-500',
};
const BADGE: Record<ProxyPickerTone, string> = {
  free: 'bg-emerald-500/15 text-emerald-400',
  used: 'bg-red-500/15 text-red-400',
  none: 'bg-zinc-600/30 text-zinc-300',
  off: 'bg-zinc-600/30 text-zinc-400',
};

function Dot({ tone }: { tone: ProxyPickerTone }) {
  return (
    <span
      aria-hidden="true"
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[tone]}`}
    />
  );
}

function Badge({ tone, text }: { tone: ProxyPickerTone; text: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${BADGE[tone]}`}
    >
      {text}
    </span>
  );
}

export function ProxyPicker({
  value,
  options,
  onChange,
  labelledBy,
  describedBy,
  placeholder = 'selecione…',
  missingLabel,
  onOpen,
  ref,
  className = '',
}: {
  value: string;
  options: ProxyPickerOption[];
  onChange: (value: string, option: ProxyPickerOption) => void;
  labelledBy: string; // id do rótulo visível (o campo não fica dentro de <label>: clicar numa
  // opção dentro do <label> reabriria a lista)
  describedBy?: string;
  placeholder?: string; // valor '' sem opção '' (modo "Proxy fixo" ainda sem escolha)
  missingLabel?: string; // valor que não está nas opções (ex.: proxy excluído do pool)
  onOpen?: () => void; // abrir recarrega a lista (contagem fresca no clique)
  ref?: Ref<HTMLDivElement>; // foco programático (React 19: ref como prop)
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Destaque guardado pelo VALOR: a lista recarrega ao abrir e os índices podem mudar.
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const setBox = useCallback(
    (el: HTMLDivElement | null) => {
      boxRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const activeIndex =
    activeValue === null
      ? -1
      : options.findIndex((o) => o.value === activeValue);

  const valueAt = (i: number) => (i >= 0 ? options[i].value : null);

  function openWith(active: number) {
    onOpen?.();
    setActiveValue(valueAt(active));
    setOpen(true);
  }

  // Sempre avisa (mesmo valor): reescolher o mesmo vermelho registra o consentimento.
  function choose(i: number) {
    const o = options[i];
    if (!o || o.disabled) return;
    setOpen(false);
    onChange(o.value, o);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const r = comboKey({
      open,
      key: e.key,
      altKey: e.altKey,
      items: options,
      activeIndex,
      selectedIndex,
    });
    switch (r.kind) {
      case 'ignore':
        return;
      case 'open':
        e.preventDefault();
        openWith(r.active);
        return;
      case 'move':
        e.preventDefault();
        if (r.active >= 0) setActiveValue(options[r.active].value);
        return;
      case 'choose':
        e.preventDefault();
        choose(r.index);
        return;
      case 'close':
        if (r.prevent) {
          e.preventDefault();
          e.stopPropagation(); // Esc: não fechar outra coisa junto (diálogo, modo seleção)
        }
        setOpen(false); // Tab segue do campo, sem escolher
    }
  }

  // Posição medida antes da pintura (sem piscar no canto): abaixo do campo, ou acima se não couber.
  useLayoutEffect(() => {
    if (!open) return;
    const b = boxRef.current?.getBoundingClientRect();
    const m = listRef.current;
    if (!b || !m) return;
    const margin = 8;
    const gap = 4;
    m.style.minWidth = `${b.width}px`;
    m.style.maxWidth = `${Math.min(512, window.innerWidth - 2 * margin)}px`;
    m.style.maxHeight = '';
    const w = m.offsetWidth;
    const natural = m.scrollHeight;
    const spaceBelow = window.innerHeight - b.bottom - gap - margin;
    const spaceAbove = b.top - gap - margin;
    const below = natural <= spaceBelow || spaceBelow >= spaceAbove;
    const maxH = Math.max(Math.min(below ? spaceBelow : spaceAbove, 320), 120);
    m.style.maxHeight = `${maxH}px`;
    const h = Math.min(natural, maxH);
    m.style.left = `${Math.min(Math.max(b.left, margin), window.innerWidth - w - margin)}px`;
    m.style.top = `${below ? b.bottom + gap : Math.max(b.top - gap - h, margin)}px`;
    m.style.visibility = 'visible';
  }, [open, options.length]);

  // A opção destacada pelo teclado fica visível rolando SÓ a lista — o scrollIntoView também pode
  // rolar a página (tela baixa), e rolar a página fecha a lista. Mesmo cálculo do
  // `maintainScrollVisibility` do exemplo APG (a lista fixa é o offsetParent das opções).
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const list = listRef.current;
    const el = document.getElementById(`${listId}-o${activeIndex}`);
    if (!list || !el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
    else if (
      el.offsetTop + el.offsetHeight >
      list.scrollTop + list.clientHeight
    )
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
  }, [open, activeIndex, listId]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || boxRef.current?.contains(t)) return;
      close();
    };
    // Rolar a página tira o campo do lugar (a lista é fixa) — fecha; rolar a própria lista, não.
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
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

  const shown: Pick<ProxyPickerOption, 'label' | 'tone' | 'badge'> | null =
    selected ??
    (value && missingLabel ? { label: missingLabel, tone: 'off' } : null);

  return (
    <>
      <div
        ref={setBox}
        role="combobox"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listId}-o${activeIndex}` : undefined
        }
        title={selected?.title}
        onClick={() =>
          open
            ? setOpen(false)
            : openWith(initialActive(options, selectedIndex))
        }
        onKeyDown={onKeyDown}
        className={`flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none select-none focus:border-emerald-500 ${className}`}
      >
        {shown ? (
          <>
            <Dot tone={shown.tone} />
            <span className={`min-w-0 flex-1 truncate ${TEXT[shown.tone]}`}>
              {shown.label}
            </span>
            {shown.badge && <Badge tone={shown.tone} text={shown.badge} />}
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-zinc-400">
            {placeholder}
          </span>
        )}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            fill="currentColor"
            d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
          />
        </svg>
      </div>
      {open &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            // O foco fica no campo (aria-activedescendant): clicar em qualquer ponto da lista —
            // opção, margem, aviso de vazio — não o tira de lá (senão o teclado para de responder).
            onMouseDown={(e) => e.preventDefault()}
            style={{ position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
            // overscroll-contain: rolar além do fim da lista não rola a página (o que a fecharia).
            className="z-50 overflow-y-auto overscroll-contain rounded-lg bg-zinc-800 py-1 text-sm shadow-xl ring-1 ring-black/50"
          >
            {options.length === 0 && (
              <div className="px-3 py-2 text-zinc-500">
                Nenhum proxy para escolher
              </div>
            )}
            {options.map((o, i) => (
              <div
                key={o.value || '__none__'}
                id={`${listId}-o${i}`}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                title={o.title}
                onMouseMove={() => {
                  if (!o.disabled && activeValue !== o.value)
                    setActiveValue(o.value);
                }}
                onClick={() => choose(i)}
                className={`flex items-center gap-2 px-3 py-2 ${
                  o.disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                } ${i === activeIndex ? 'bg-zinc-700' : ''}`}
              >
                <span aria-hidden="true" className="w-3 text-emerald-400">
                  {o.value === value ? '✓' : ''}
                </span>
                <Dot tone={o.tone} />
                <span className={`min-w-0 flex-1 truncate ${TEXT[o.tone]}`}>
                  {o.label}
                </span>
                {o.tags?.map((t) => (
                  <span
                    key={t}
                    className="shrink-0 rounded bg-zinc-700 px-1.5 text-[11px] text-zinc-300"
                  >
                    {t}
                  </span>
                ))}
                {o.badge && <Badge tone={o.tone} text={o.badge} />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

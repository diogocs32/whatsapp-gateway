// Ícones do chat em SVG (E23). Glifos de texto como ↪/✓ viram emoji conforme a fonte do sistema
// (visto no macOS com a pilha de fontes do Tailwind, que inclui Apple Color Emoji) — SVG é
// previsível. Todos decorativos (aria-hidden): o texto acessível fica em quem os usa.

type IconProps = { className?: string };

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 11"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 6 5 9.5 12 1.5" />
    </svg>
  );
}

export function DoubleCheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 18 11"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 6 4.5 9.5 11.5 1.5" />
      <path d="M7.5 9.5 16.5 1.5" />
    </svg>
  );
}

export function ForwardIcon({
  className,
  double,
}: IconProps & { double?: boolean }) {
  return (
    <svg
      viewBox={double ? '0 0 22 14' : '0 0 16 14'}
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2.5 14 7l-4.5 4.5" />
      <path d="M14 7H7a5 5 0 0 0-5 5" />
      {double && <path d="M15.5 2.5 20 7l-4.5 4.5" />}
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 12 14" aria-hidden="true" className={className}>
      <path
        d="M1 1.2v11.6a.6.6 0 0 0 .9.5l9.4-5.8a.6.6 0 0 0 0-1L1.9.7a.6.6 0 0 0-.9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" />
    </svg>
  );
}

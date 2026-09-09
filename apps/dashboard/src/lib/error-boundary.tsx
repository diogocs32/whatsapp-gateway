import { Component, type ErrorInfo, type ReactNode } from 'react';

// UP-09 (auditoria 09/2026): falha de chunk após deploy (aba antiga pede um arquivo com hash
// que o bundle novo não tem) derrubava o painel inteiro em tela branca. Aqui: (1) o
// `vite:preloadError` recarrega a página UMA vez (guard em sessionStorage contra loop); (2) um
// erro de render em qualquer rota vira uma tela com ação, em vez de vazio.
const RELOAD_FLAG = 'cz:preload-reloaded';

export function installPreloadErrorHandler(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (sessionStorage.getItem(RELOAD_FLAG)) return; // já recarregou uma vez: não entra em loop
    sessionStorage.setItem(RELOAD_FLAG, '1');
    event.preventDefault();
    window.location.reload();
  });
  // Página carregou com sucesso → libera um futuro reload.
  window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_FLAG));
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('painel: erro de render', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const chunk =
      /Failed to fetch dynamically imported module|Loading chunk|import\(\)/i.test(
        this.state.error.message,
      );
    return (
      <div
        role="alert"
        className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-200"
      >
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="mb-2 text-lg font-semibold">
            {chunk ? 'O painel foi atualizado' : 'Algo quebrou nesta tela'}
          </h1>
          <p className="mb-4 text-sm text-zinc-400">
            {chunk
              ? 'Uma nova versão foi publicada enquanto esta aba estava aberta. Recarregue para continuar.'
              : this.state.error.message}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Recarregar
            </button>
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </div>
    );
  }
}

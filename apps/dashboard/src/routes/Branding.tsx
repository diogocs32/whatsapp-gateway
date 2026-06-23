import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useBranding } from '../lib/branding';

export function Branding() {
  const { signOut } = useAuth();
  const { branding, refresh } = useBranding();
  const [productName, setProductName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Preenche o form com o branding atual (e quando ele recarrega).
  useEffect(() => {
    setProductName(branding.productName);
    setPrimaryColor(branding.primaryColor);
    setLogoUrl(branding.logoUrl ?? '');
    setFaviconUrl(branding.faviconUrl ?? '');
  }, [branding]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    try {
      await api.branding.update({
        productName: productName.trim(),
        primaryColor,
        logoUrl: logoUrl.trim() || null,
        faviconUrl: faviconUrl.trim() || null,
      });
      refresh();
      setOk(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const field =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-zinc-200">
            ←
          </Link>
          <h1 className="text-lg font-semibold">
            Marca <span className="text-zinc-500">· white-label</span>
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Sair
        </button>
      </header>

      <main className="max-w-2xl p-6">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Nome do produto</span>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              maxLength={60}
              className={field}
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs text-zinc-400">Cor primária (tema)</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800"
              />
              <span className="font-mono text-sm text-zinc-400">
                {primaryColor}
              </span>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Logo (URL https)</span>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://… (deixe vazio para nenhum)"
              className={field}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Favicon (URL https)</span>
            <input
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://… (deixe vazio para nenhum)"
              className={field}
            />
          </label>

          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            Salvar
          </button>
          {ok && (
            <p className="text-sm text-emerald-400">
              Salvo! Nome, cor e favicon aplicam na hora; se algo não atualizar,
              recarregue (Ctrl+Shift+R).
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </main>
    </div>
  );
}

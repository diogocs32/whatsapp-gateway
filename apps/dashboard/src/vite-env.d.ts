/// <reference types="vite/client" />

// NÃO adicione import/export aqui — qualquer import quebra o augment global.
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

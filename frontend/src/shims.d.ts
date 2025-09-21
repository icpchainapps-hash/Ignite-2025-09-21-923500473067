// Minimal Vite env shim, avoids depending on 'vite/client' types.
interface ImportMetaEnv {
  // Add your own env keys here if you want stronger typing:
  // readonly VITE_API_URL?: string;
  // readonly VITE_ENV?: 'dev' | 'prod';
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
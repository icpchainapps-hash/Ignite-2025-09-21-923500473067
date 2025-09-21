// Minimal shim for "vite/client" so TS stops erroring if referenced anywhere.
export {};

interface ImportMetaEnv {
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
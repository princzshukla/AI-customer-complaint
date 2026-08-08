/// <reference types="vite/client" />

interface CustomImportMeta extends ImportMeta {
  env: ImportMetaEnv & Record<string, string | undefined>;
}

export const API_BASE_URL = (((import.meta as unknown as CustomImportMeta).env?.VITE_API_URL) || '').replace(/\/+$/, '');


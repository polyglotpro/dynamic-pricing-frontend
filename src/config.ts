const DEFAULT_API_BASE_URL = 'http://localhost:8000';

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return trimmed.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(
  (import.meta as any).env?.VITE_API_URL ?? DEFAULT_API_BASE_URL
);

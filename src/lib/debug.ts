const DEBUG_BACKEND_STORAGE_KEY = 'meraki_debug_backend';

export function isBackendDebugEnabled() {
  if (process.env.NEXT_PUBLIC_DEBUG_BACKEND === 'true') return true;
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEBUG_BACKEND_STORAGE_KEY) === 'true';
}

export function debugBackend(label: string, payload: unknown) {
  if (!isBackendDebugEnabled()) return;
  console.debug(`[Meraki backend] ${label}`, payload);
}

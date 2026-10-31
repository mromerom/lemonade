import { useSyncExternalStore } from 'react';

/**
 * Testing tools for the author: jump between lesson steps and fill sample answers.
 * Turned on by the switch in the page footer, or by ?dev=1 in the URL (?dev=0 turns
 * it off). Stored per browser; on by default in the Vite dev server.
 */
const KEY = 'lemonade:dev';
const EVENT = 'lemonade:dev-change';

function read(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('dev');
    if (param === '1' || param === '0') localStorage.setItem(KEY, param);
    const stored = localStorage.getItem(KEY);
    if (stored !== null) return stored === '1';
  } catch {
    // Storage blocked: fall through.
  }
  return Boolean(import.meta.env?.DEV);
}

export function setDevMode(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // Storage blocked: the switch only lasts for this page view.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useDevMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

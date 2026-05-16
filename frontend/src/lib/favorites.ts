// Gestione preferiti unificata: per utenti loggati va sul backend (sync cross-device),
// per ospiti resta in localStorage finché non fanno login.
import {
  addFavorite as apiAdd,
  getFavorites as apiList,
  getToken,
  removeFavorite as apiRemove,
  type ApiFavorite,
  type FavoriteType,
} from './api';

const LOCAL_KEY = 'tla:favorites';

type LocalFav = { markerType: FavoriteType; markerId: string };

function loadLocal(): LocalFav[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(list: LocalFav[]): void {
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export async function listFavorites(): Promise<LocalFav[]> {
  if (getToken()) {
    try {
      const remote = await apiList();
      return remote.map((f: ApiFavorite) => ({ markerType: f.markerType, markerId: f.markerId }));
    } catch {
      // se backend è down, fallback su localStorage
      return loadLocal();
    }
  }
  return loadLocal();
}

export async function toggleFavorite(markerType: FavoriteType, markerId: string): Promise<boolean> {
  const current = await listFavorites();
  const isFav = current.some((f) => f.markerType === markerType && f.markerId === markerId);
  if (getToken()) {
    if (isFav) {
      await apiRemove(markerType, markerId);
      return false;
    }
    await apiAdd(markerType, markerId);
    return true;
  }
  // localStorage path
  const next = isFav
    ? current.filter((f) => !(f.markerType === markerType && f.markerId === markerId))
    : [...current, { markerType, markerId }];
  saveLocal(next);
  // Notifica gli ascoltatori
  window.dispatchEvent(new CustomEvent('tla:favorites-changed'));
  return !isFav;
}

export function isFavorite(list: LocalFav[], markerType: FavoriteType, markerId: string): boolean {
  return list.some((f) => f.markerType === markerType && f.markerId === markerId);
}

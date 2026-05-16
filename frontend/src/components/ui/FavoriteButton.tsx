import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { listFavorites, toggleFavorite } from '../../lib/favorites';
import type { FavoriteType } from '../../lib/api';

interface Props {
  markerType: FavoriteType;
  markerId: string;
  compact?: boolean;
  /** Quando in un container con sfondo scuro (es. mappa) usa lo stile chiaro. */
  onLight?: boolean;
}

export function FavoriteButton({ markerType, markerId, compact = false, onLight = false }: Props) {
  const [favorited, setFavorited] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listFavorites().then((list) => {
      if (cancelled) return;
      setFavorited(list.some((f) => f.markerType === markerType && f.markerId === markerId));
    });
    const onChange = () => {
      listFavorites().then((list) => {
        setFavorited(list.some((f) => f.markerType === markerType && f.markerId === markerId));
      });
    };
    window.addEventListener('tla:favorites-changed', onChange);
    return () => { cancelled = true; window.removeEventListener('tla:favorites-changed', onChange); };
  }, [markerType, markerId]);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      const next = await toggleFavorite(markerType, markerId);
      setFavorited(next);
      window.dispatchEvent(new CustomEvent('tla:favorites-changed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`favorite-btn ${favorited ? 'is-favorited' : ''} ${compact ? 'compact' : ''} ${onLight ? 'on-light' : ''}`}
      onClick={handleClick}
      disabled={loading}
      aria-label={favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
      title={favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
    >
      <Heart
        size={compact ? 16 : 18}
        strokeWidth={2.2}
        fill={favorited ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
    </button>
  );
}

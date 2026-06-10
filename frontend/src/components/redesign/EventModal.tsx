import { useEffect, useCallback, CSSProperties } from 'react';
import {
  X, MapPin, Clock, Users, Heart, Bookmark,
  Music, Landmark, Dumbbell, UtensilsCrossed, Bike,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

/* ── category visuals ─────────────────────────────────── */

const CAT_GRADIENTS: Record<string, string> = {
  musica: 'linear-gradient(140deg,#db2777,#831843)',
  cultura: 'linear-gradient(140deg,#7c3aed,#4c1d95)',
  cibo: 'linear-gradient(140deg,#d97706,#7c2d12)',
  outdoor: 'linear-gradient(140deg,#0d9488,#134e4a)',
  sport: 'linear-gradient(140deg,#059669,#064e3b)',
  famiglia: 'linear-gradient(140deg,#0ea5e9,#075985)',
};

const CAT_ICONS: Record<string, string> = {
  musica: 'Music',
  cultura: 'Landmark',
  sport: 'Dumbbell',
  cibo: 'UtensilsCrossed',
  outdoor: 'Bike',
  famiglia: 'Users',
};

/* ── types ────────────────────────────────────────────── */

export interface EventData {
  id: string;
  title: string;
  description: string;
  place: string;
  dateTime: string;
  category: string;
  going: number;
  cap: number;
  isLiked: boolean;
  isSaved: boolean;
}

interface EventModalProps {
  event: EventData;
  onLike: () => void;
  onSave: () => void;
  onClose: () => void;
  onJoin: () => void;
}

/* ── component ────────────────────────────────────────── */

export function EventModal({ event, onLike, onSave, onClose, onJoin }: EventModalProps) {
  const gradient = CAT_GRADIENTS[event.category] || CAT_GRADIENTS.cultura;
  const iconName = CAT_ICONS[event.category] || 'Calendar';
  const CatIcon = (LucideIcons as any)[iconName] || LucideIcons.Calendar;

  /* close on Escape */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  /* close on scrim click */
  const handleScrim = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div className="modal-scrim" onClick={handleScrim}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={event.title}>
        {/* gradient media header */}
        <div className="modal-media" style={{ background: gradient } as CSSProperties}>
          <span className="modal-cat-badge">
            <CatIcon size={14} />
            {event.category}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="modal-body">
          <h2 className="modal-title">{event.title}</h2>
          <p className="modal-desc">{event.description}</p>

          <div className="modal-grid">
            <div className="modal-field">
              <MapPin size={15} />
              <span>{event.place}</span>
            </div>
            <div className="modal-field">
              <Clock size={15} />
              <span>{event.dateTime}</span>
            </div>
            <div className="modal-field">
              <Users size={15} />
              <span>{event.going}/{event.cap} partecipanti</span>
            </div>
            <div className="modal-field">
              <Heart size={15} />
              <span>{event.isLiked ? 'Ti piace' : 'Non ti piace ancora'}</span>
            </div>
          </div>

          {/* actions */}
          <div className="modal-actions">
            <button className="modal-btn modal-btn-primary" onClick={onJoin}>
              Partecipa
            </button>
            <button
              className={`modal-btn modal-btn-icon${event.isLiked ? ' active' : ''}`}
              onClick={onLike}
              aria-label={event.isLiked ? 'Rimuovi like' : 'Metti like'}
            >
              <Heart size={16} fill={event.isLiked ? 'currentColor' : 'none'} />
            </button>
            <button
              className={`modal-btn modal-btn-icon${event.isSaved ? ' active' : ''}`}
              onClick={onSave}
              aria-label={event.isSaved ? 'Rimuovi dai salvati' : 'Salva'}
            >
              <Bookmark size={16} fill={event.isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

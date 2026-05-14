import { type ReactNode } from 'react';
import { CardMapPreview, type CardMapPreviewProps } from '../map/CardMapPreview';

type InteractiveMapCardProps = {
  id: string;
  children: ReactNode;
  map: CardMapPreviewProps;
  className?: string;
  onSelect?: () => void;
};

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('a, button, input, select, textarea'));
}

export function InteractiveMapCard({ id, children, map, className = '', onSelect }: InteractiveMapCardProps) {
  return (
    <article
      className={`interactive-map-card ${className}`}
      data-card-id={id}
      tabIndex={0}
      role={onSelect ? 'button' : undefined}
      onClick={(event) => {
        if (!onSelect || isInteractiveElement(event.target)) return;
        onSelect();
      }}
      onKeyDown={(event) => {
        if (!onSelect || isInteractiveElement(event.target)) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <CardMapPreview {...map} />
      <div className="interactive-map-card-content">{children}</div>
    </article>
  );
}

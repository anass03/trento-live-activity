import { ReactNode, CSSProperties } from 'react';
import { useGlow } from './useGlow';

interface WidgetProps {
  title?: string;
  accent?: string;
  upd?: string;
  delay?: number;
  style?: CSSProperties;
  children: ReactNode;
}

export function Widget({ title, accent, upd, delay, style, children }: WidgetProps) {
  const onMove = useGlow();
  return (
    <div
      className="widget anim-in"
      style={{ '--accent': accent, animationDelay: `${delay || 0}ms`, ...style } as CSSProperties}
      onMouseMove={onMove}
    >
      <div className="widget-inner">
        {title && (
          <div className="widget-head">
            <div className="widget-title">
              <span className="title-accent">●</span>{title}
            </div>
            {upd && (
              <div className="upd">
                <span className="led live green" style={{ '--led-color': 'var(--green)' } as CSSProperties} />
                {upd}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

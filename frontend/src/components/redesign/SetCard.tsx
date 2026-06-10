import { ReactNode, CSSProperties } from 'react';
import * as LucideIcons from 'lucide-react';

interface SetCardProps {
  num: number;
  title: string;
  desc: string;
  icon: string;
  color?: string;
  full?: boolean;
  children: ReactNode;
}

export function SetCard({ num, title, desc, icon, color, full, children }: SetCardProps) {
  // Dynamic icon lookup from lucide-react
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Settings;
  return (
    <div
      className={`s-card anim-in${full ? ' s-full' : ''}`}
      style={{ '--sc': color || 'var(--accent)', animationDelay: `${num * 60}ms` } as CSSProperties}
    >
      <div className="s-card-head">
        <span className="s-card-ic"><IconComponent size={19} /></span>
        <div className="s-num-title">
          <div className="s-num">{String(num).padStart(2, '0')}</div>
          <div className="s-title">{title}</div>
          <div className="s-desc">{desc}</div>
        </div>
      </div>
      <div className="s-card-body">{children}</div>
    </div>
  );
}

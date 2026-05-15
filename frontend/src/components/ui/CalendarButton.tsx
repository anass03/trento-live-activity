import { useEffect, useRef, useState } from 'react';

interface CalendarButtonProps {
  icsUrl: string;
  icsFilename: string;
  googleUrl: string;
  label?: string;
}

export function CalendarButton({ icsUrl, icsFilename, googleUrl, label = 'Calendario' }: CalendarButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className="calendar-dropdown" ref={containerRef}>
      <button
        type="button"
        className="ghost-button compact-button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        📅 {label}
      </button>
      {open && (
        <div className="calendar-dropdown-menu" role="menu">
          <a
            href={icsUrl}
            download={icsFilename}
            className="calendar-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            🍎 Apple / Outlook
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="calendar-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            📅 Google Calendar
          </a>
        </div>
      )}
    </div>
  );
}

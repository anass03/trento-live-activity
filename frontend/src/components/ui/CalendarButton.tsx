import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

/** Convert an http(s) or relative ICS URL to a webcal:// URL.
 *  webcal:// is natively handled by Calendar on iOS/macOS — clicking it
 *  opens the app and proposes the event without any file download. */
function toWebcalUrl(icsUrl: string): string {
  const absolute = icsUrl.startsWith('http')
    ? icsUrl
    : `${window.location.origin}${icsUrl}`;
  return absolute.replace(/^https?:\/\//, 'webcal://');
}

interface CalendarButtonProps {
  icsUrl: string;
  icsFilename: string;
  googleUrl: string;
  label?: string;
}

export function CalendarButton({ icsUrl, icsFilename, googleUrl, label }: CalendarButtonProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('common.addToCalendar');
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    if (!buttonRef.current) { setOpen((v) => !v); return; }
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 220;
    // Anchor to the left of the button; flip to right edge if it would overflow
    const leftAnchor = rect.left + window.scrollX;
    const wouldOverflow = rect.left + menuWidth > window.innerWidth - 8;
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: wouldOverflow ? undefined : rect.left,
      right: wouldOverflow ? (window.innerWidth - rect.right) : undefined,
      zIndex: 9999,
      minWidth: menuWidth,
    });
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return undefined;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = buttonRef.current?.contains(target) ?? false;
      const insideMenu = menuRef.current?.contains(target) ?? false;
      if (!insideButton && !insideMenu) setOpen(false);
    }
    // Close on scroll so the menu doesn't drift away from the button
    function handleScroll() { setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <div className="calendar-dropdown">
        <button
          ref={buttonRef}
          type="button"
          className="ghost-button compact-button"
          onClick={openMenu}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          📅 {resolvedLabel}
        </button>
      </div>
      {open && createPortal(
        <div ref={menuRef} className="calendar-dropdown-menu" role="menu" style={menuStyle}>
          {/* webcal:// opens Calendar app natively on iOS/macOS without a download */}
          <a
            href={toWebcalUrl(icsUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="calendar-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            🍎 {t('common.calendarApple')}
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="calendar-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            📅 {t('common.calendarGoogle')}
          </a>
          {/* Fallback download for Outlook, Linux, and any other client */}
          <a
            href={icsUrl}
            download={icsFilename}
            className="calendar-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            💾 {t('common.calendarDownload')}
          </a>
        </div>,
        document.body,
      )}
    </>
  );
}

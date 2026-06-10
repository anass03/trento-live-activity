import type { Theme } from '../../lib/theme';

interface SetThemeProps {
  value: Theme;
  onChange: (theme: Theme) => void;
}

export function SetTheme({ value, onChange }: SetThemeProps) {
  return (
    <div className="s-theme-row" role="radiogroup">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'light'}
        className={`s-theme-btn${value === 'light' ? ' active' : ''}`}
        onClick={() => onChange('light')}
      >
        <span className="s-swatch s-swatch-light" />
        <span>Chiaro</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'dark'}
        className={`s-theme-btn${value === 'dark' ? ' active' : ''}`}
        onClick={() => onChange('dark')}
      >
        <span className="s-swatch s-swatch-dark" />
        <span>Scuro</span>
      </button>
    </div>
  );
}

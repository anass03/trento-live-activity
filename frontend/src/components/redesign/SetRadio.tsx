interface SetRadioOption {
  value: string;
  label: string;
}

interface SetRadioProps {
  options: SetRadioOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SetRadio({ options, value, onChange }: SetRadioProps) {
  return (
    <div className="s-radio-group" role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`s-radio-btn${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          <span className="s-radio-dot" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

import { SetToggle } from './SetToggle';

interface SetRowProps {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (value: boolean) => void;
}

export function SetRow({ label, sub, on, onChange }: SetRowProps) {
  return (
    <div className="s-row">
      <div>
        <div className="s-row-label">{label}</div>
        {sub && <div className="s-row-sub">{sub}</div>}
      </div>
      <SetToggle on={on} onChange={onChange} />
    </div>
  );
}

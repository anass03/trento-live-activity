interface SetToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
}

export function SetToggle({ on, onChange }: SetToggleProps) {
  return (
    <button
      className={`s-toggle${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    />
  );
}

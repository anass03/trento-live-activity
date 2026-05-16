import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input-wrapper">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-input-toggle"
        aria-label={visible ? 'Nascondi password' : 'Mostra password'}
        title={visible ? 'Nascondi password' : 'Mostra password'}
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}

interface AvatarData {
  initials: string;
  gradient: string;
}

interface AvatarsProps {
  avatars: AvatarData[];
  extra?: number;
}

export function Avatars({ avatars, extra }: AvatarsProps) {
  return (
    <div className="attendees">
      {avatars.map((av, i) => (
        <div key={i} className="av" style={{ background: av.gradient }}>{av.initials}</div>
      ))}
      {(extra ?? 0) > 0 && <div className="more">+{extra}</div>}
    </div>
  );
}

const AV = [
  { i: "GR", g: "linear-gradient(150deg,#2563eb,#7c3aed)" },
  { i: "SM", g: "linear-gradient(150deg,#db2777,#9d174d)" },
  { i: "LF", g: "linear-gradient(150deg,#0d9488,#0e7490)" },
  { i: "AB", g: "linear-gradient(150deg,#d97706,#b45309)" },
  { i: "MC", g: "linear-gradient(150deg,#059669,#047857)" },
  { i: "ET", g: "linear-gradient(150deg,#8b5cf6,#6d28d9)" },
];

export function Avatars({ ids, extra }: any) {
  return (
    <div className="attendees">
      {ids.map((idx: number, k: number) => (
        <div className="av" key={k} style={{ background: AV[idx].g }}>{AV[idx].i}</div>
      ))}
      {extra > 0 && <div className="more">+{extra}</div>}
    </div>
  );
}

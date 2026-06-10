/* ===========================================================
   Trento Live Activity — custom stylized city map (SVG art)
   Custom stylized city map
   =========================================================== */
import React from "react";

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TrentoMap = React.memo(function TrentoMap() {
  const W = 1440, H = 900;

  // ---- river (Adige): wavy vertical band on the west ----
  const river =
    "M 120,-20 C 220,140 150,300 230,440 C 300,560 200,720 270,920 " +
    "L 430,920 C 360,720 460,560 390,440 C 320,300 400,150 300,-20 Z";
  const riverCenter =
    "M 215,-20 C 305,150 235,300 315,440 C 385,560 285,720 355,920";

  // ---- procedural streets + blocks (city = east of river) ----
  const rng = mulberry32(73);
  const avenueX = [400, 492, 585, 678, 772, 866, 962, 1060, 1162, 1268, 1376];
  const crossY  = [60, 145, 232, 320, 408, 496, 584, 672, 760, 848];

  const avenues = avenueX.map((x, i) => {
    const w1 = (rng() - 0.5) * 28, w2 = (rng() - 0.5) * 34, w3 = (rng() - 0.5) * 24;
    return `M ${x + w1},-10 C ${x + w2},230 ${x + w3},460 ${x + w1 * 0.6},700 S ${x + w2 * 0.5},940 ${x + w3 * 0.4},940`;
  });
  const crossings = crossY.map((y) => {
    const startX = 350 + rng() * 30;
    const w1 = (rng() - 0.5) * 26, w2 = (rng() - 0.5) * 30;
    return `M ${startX},${y} C 640,${y + w1} 940,${y + w2} 1440,${y + w1 * 0.5}`;
  });

  // blocks between grid cells, brighter toward historic center (~705,450)
  const cx = 705, cy = 450, maxD = 720;
  const blocks: any[] = [];
  for (let i = 0; i < avenueX.length - 1; i++) {
    for (let j = 0; j < crossY.length - 1; j++) {
      const x0 = avenueX[i], x1 = avenueX[i + 1];
      const y0 = crossY[j], y1 = crossY[j + 1];
      const padX = 7 + rng() * 6, padY = 7 + rng() * 6;
      const bx = x0 + padX, by = y0 + padY;
      const bw = x1 - x0 - padX * 2, bh = y1 - y0 - padY * 2;
      const mx = bx + bw / 2, my = by + bh / 2;
      const d = Math.hypot(mx - cx, my - cy);
      const heat = Math.max(0, 1 - d / maxD);
      const op = 0.04 + heat * 0.10 + rng() * 0.02;
      const warm = heat > 0.45;
      blocks.push({ key: `b${i}-${j}`, bx, by, bw, bh, op, warm, r: 3 + rng() * 3 });
    }
  }

  // main illuminated roads (drawn glowing on top)
  const mainRoads = [
    "M 360,235 C 700,200 1050,210 1440,180",                 // east-west arterial
    "M 705,40 C 690,260 715,520 700,900",                    // central spine (Via Belenzani axis)
    "M 430,470 C 700,440 980,470 1300,430",                  // cross arterial
    "M 980,60 C 1010,360 980,640 1040,900",                  // ring east
  ];

  // parks (organic green areas)
  const parks = [
    { cx: 392, cy: 545, rx: 92, ry: 70, rot: -18 },   // Parco delle Albere
    { cx: 918, cy: 232, rx: 86, ry: 64, rot: 12 },    // Castello gardens
    { cx: 600, cy: 792, rx: 120, ry: 60, rot: 0 },    // Gocciadoro south
    { cx: 482, cy: 648, rx: 54, ry: 42, rot: 8 },     // small green
  ];

  // heatmap activity blobs
  const heatBlobs = [
    { x: 705, y: 450, r: 240, c: "rgba(236,72,153,0.18)" },   // Piazza Duomo
    { x: 648, y: 396, r: 180, c: "rgba(251,191,36,0.13)" },   // Belenzani / Manci
    { x: 907, y: 279, r: 170, c: "rgba(167,139,250,0.13)" },  // Castello
    { x: 475, y: 603, r: 160, c: "rgba(45,212,191,0.11)" },   // Albere
    { x: 763, y: 576, r: 150, c: "rgba(56,189,248,0.10)" },   // Fiera
  ];

  return (
    <svg className="map-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--map-bg0)" }} />
          <stop offset="55%" style={{ stopColor: "var(--map-bg1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--map-bg2)" }} />
        </linearGradient>
        <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--map-river0)" }} />
          <stop offset="50%" style={{ stopColor: "var(--map-river1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--map-river2)" }} />
        </linearGradient>
        <radialGradient id="parkGrad" cx="42%" cy="38%" r="65%">
          <stop offset="0%" style={{ stopColor: "var(--map-park0)" }} />
          <stop offset="70%" style={{ stopColor: "var(--map-park1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--map-park2)" }} />
        </radialGradient>
        <filter id="roadGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="blobBlur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="42" />
        </filter>
        <filter id="parkBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* base */}
      <rect x="0" y="0" width={W} height={H} fill="url(#mapBg)" />

      {/* heatmap activity zones */}
      <g filter="url(#blobBlur)" style={{ opacity: "var(--map-heat)" }}>
        {heatBlobs.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} />
        ))}
      </g>

      {/* parks */}
      <g filter="url(#parkBlur)">
        {parks.map((p, i) => (
          <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
            fill="url(#parkGrad)" transform={`rotate(${p.rot} ${p.cx} ${p.cy})`} />
        ))}
      </g>
      {/* park crisp rim */}
      {parks.map((p, i) => (
        <ellipse key={"pr" + i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
          fill="none" style={{ stroke: "var(--map-park-rim)" }} strokeWidth="1.2"
          transform={`rotate(${p.rot} ${p.cx} ${p.cy})`} />
      ))}

      {/* river */}
      <path d={river} fill="url(#riverGrad)" />
      <path d={river} fill="none" style={{ stroke: "var(--map-river-stroke)" }} strokeWidth="1.4" />
      <path d={riverCenter} fill="none" style={{ stroke: "var(--map-river-reflect)" }} strokeWidth="2.2"
        strokeLinecap="round" filter="url(#roadGlow)" opacity="0.5" />

      {/* city blocks */}
      <g>
        {blocks.map((b) => (
          <rect key={b.key} x={b.bx} y={b.by} width={b.bw} height={b.bh} rx={b.r}
            style={{ fill: b.warm ? "var(--map-block-warm)" : "var(--map-block)", stroke: "var(--map-block-stroke)" }}
            fillOpacity={b.op} strokeWidth="1" />
        ))}
      </g>

      {/* minor streets */}
      <g style={{ stroke: "var(--map-street)" }} strokeWidth="1.4" fill="none" strokeLinecap="round">
        {avenues.map((d, i) => <path key={"av" + i} d={d} />)}
        {crossings.map((d, i) => <path key={"cr" + i} d={d} />)}
      </g>

      {/* main illuminated roads */}
      <g fill="none" strokeLinecap="round" filter="url(#roadGlow)">
        {mainRoads.map((d, i) => (
          <React.Fragment key={"mr" + i}>
            <path d={d} style={{ stroke: "var(--map-road-soft)" }} strokeWidth="7" />
            <path d={d} style={{ stroke: "var(--map-road-bright)" }} strokeWidth="2" />
          </React.Fragment>
        ))}
      </g>

      {/* subtle node lights at major intersections */}
      <g>
        {[[705, 450], [648, 396], [907, 279], [475, 603], [763, 576], [1040, 432]].map((n, i) => (
          <circle key={"n" + i} cx={n[0]} cy={n[1]} r="2.4" style={{ fill: "var(--map-node)" }} filter="url(#roadGlow)" />
        ))}
      </g>
    </svg>
  );
});

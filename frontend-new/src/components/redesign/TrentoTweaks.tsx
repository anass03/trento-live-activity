/* ===========================================================
   Trento Live Activity — Tweaks
   =========================================================== */
import React from "react";
import { TweakColor, TweakRadio, TweakSection, TweakSlider, TweaksPanel, useTweaks } from "./TweaksPanel";


// Persisted defaults — the host rewrites this block on disk when tweaks change.
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "atmosfera": ["#38bdf8", "#a78bfa", "#2dd4bf"],
  "intensita": "Medio",
  "finitura": 55
}/*EDITMODE-END*/;

/* Four atmospheres. Each is a complete color-grade of the scene:
   a blend wash over the map + a scene background + UI accent swaps.
   (Category/data colours stay fixed so markers keep their meaning.) */
const MOODS = [
  {
    id: "alpina",
    palette: ["#38bdf8", "#a78bfa", "#2dd4bf"],
    accents: { cyan: "#38bdf8", teal: "#2dd4bf", violet: "#a78bfa", magenta: "#f472b6" },
    accentsDay: { cyan: "#2f8f5e", teal: "#3f9f6e", violet: "#6f8fa0", magenta: "#b07f95" },
    grade: { bg: "transparent", mode: "normal", op: 0 },
    scene:
      "radial-gradient(900px 700px at 18% 16%, rgba(56,189,248,0.10), transparent 60%)," +
      "radial-gradient(1000px 800px at 84% 8%, rgba(139,92,246,0.12), transparent 60%)," +
      "radial-gradient(1100px 900px at 72% 92%, rgba(236,72,153,0.08), transparent 60%)," +
      "linear-gradient(150deg, #030b18, #061328 52%, #020514)",
  },
  {
    id: "tramonto",
    palette: ["#fb923c", "#f472b6", "#fbbf24"],
    accents: { cyan: "#fb923c", teal: "#fbbf24", violet: "#f472b6", magenta: "#fb7185" },
    accentsDay: { cyan: "#c2703a", teal: "#cf9a3a", violet: "#b57890", magenta: "#c47a6a" },
    grade: {
      bg: "linear-gradient(135deg, #fb7a18 0%, #ec4899 55%, #f59e0b 100%)",
      mode: "color", op: 0.55,
    },
    scene:
      "radial-gradient(900px 700px at 20% 16%, rgba(251,146,60,0.13), transparent 60%)," +
      "radial-gradient(1000px 800px at 84% 10%, rgba(244,63,94,0.13), transparent 60%)," +
      "radial-gradient(1100px 900px at 70% 92%, rgba(251,191,36,0.07), transparent 60%)," +
      "linear-gradient(150deg, #150a0c, #1d0e12 52%, #0c0608)",
  },
  {
    id: "aurora",
    palette: ["#a78bfa", "#22d3ee", "#34d399"],
    accents: { cyan: "#22d3ee", teal: "#2dd4bf", violet: "#a78bfa", magenta: "#e879f9" },
    accentsDay: { cyan: "#3a93b5", teal: "#3f9f7e", violet: "#7d6fc0", magenta: "#b06fc0" },
    grade: {
      bg: "linear-gradient(135deg, #8b5cf6 0%, #22d3ee 52%, #10b981 100%)",
      mode: "color", op: 0.55,
    },
    scene:
      "radial-gradient(900px 700px at 18% 14%, rgba(139,92,246,0.16), transparent 60%)," +
      "radial-gradient(1000px 800px at 84% 8%, rgba(34,211,238,0.14), transparent 60%)," +
      "radial-gradient(1100px 900px at 72% 92%, rgba(16,185,129,0.10), transparent 60%)," +
      "linear-gradient(150deg, #060616, #0a1226 52%, #04040f)",
  },
  {
    id: "nebbia",
    palette: ["#94a3b8", "#7dd3fc", "#cbd5e1"],
    accents: { cyan: "#7dd3fc", teal: "#94a3b8", violet: "#a5b4cb", magenta: "#cbd5e1" },
    accentsDay: { cyan: "#6f93a8", teal: "#8fb99a", violet: "#94a0b0", magenta: "#a8b5bd" },
    grade: { bg: "rgb(150,160,175)", mode: "saturation", op: 0.78 },
    scene:
      "radial-gradient(1000px 800px at 30% 12%, rgba(148,163,184,0.10), transparent 62%)," +
      "radial-gradient(900px 800px at 82% 10%, rgba(125,211,252,0.06), transparent 60%)," +
      "linear-gradient(150deg, #0a0f17, #0e141d 55%, #07090e)",
  },
];

const GLOW_LEVELS = { Sobrio: 0.16, Medio: 0.42, Neon: 0.95 };

const DAY_SCENE =
  "radial-gradient(circle at 18% 20%, rgba(201,234,212,0.65), transparent 34%)," +
  "radial-gradient(circle at 82% 16%, rgba(220,239,243,0.70), transparent 36%)," +
  "radial-gradient(circle at 72% 84%, rgba(143,185,154,0.35), transparent 38%)," +
  "linear-gradient(135deg, #f6faf7, #eef7f0 52%, #e7f1ea)";

export function TrentoTweaks({ theme }) {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    const root = document.documentElement;
    const isDay = theme === "day";
    const mood = MOODS.find((m) => JSON.stringify(m.palette) === JSON.stringify(t.atmosfera)) || MOODS[0];
    const acc = isDay ? mood.accentsDay : mood.accents;

    root.style.setProperty("--cyan", acc.cyan);
    root.style.setProperty("--teal", acc.teal);
    root.style.setProperty("--violet", acc.violet);
    root.style.setProperty("--magenta", acc.magenta);
    root.style.setProperty("--accent", acc.cyan);
    root.style.setProperty("--scene-bg", isDay ? DAY_SCENE : mood.scene);
    root.style.setProperty("--grade-bg", mood.grade.bg);
    root.style.setProperty("--grade-mode", mood.grade.mode);
    root.style.setProperty("--grade-op", String(mood.grade.op * (isDay ? 0.85 : 1)));

    root.style.setProperty("--glow", String(GLOW_LEVELS[t.intensita] ?? 0.42));

    const f = Math.max(0, Math.min(1, t.finitura / 100));
    if (isDay) {
      root.style.setProperty("--glass-1", `rgba(255,255,255,${(0.5 + 0.42 * f).toFixed(3)})`);
      root.style.setProperty("--glass-2", `rgba(238,247,241,${(0.42 + 0.46 * f).toFixed(3)})`);
    } else {
      root.style.setProperty("--glass-1", `rgba(18,32,56,${(0.45 + 0.5 * f).toFixed(3)})`);
      root.style.setProperty("--glass-2", `rgba(9,18,35,${(0.34 + 0.54 * f).toFixed(3)})`);
    }
    root.style.setProperty("--panel-blur", `${(26 - 15 * f).toFixed(1)}px`);
  }, [t, theme]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Atmosfera" />
      <TweakColor
        label="Mood cromatico"
        value={t.atmosfera}
        options={MOODS.map((m) => m.palette)}
        onChange={(v) => setTweak("atmosfera", v)}
      />
      <div style={{ fontSize: 10.5, color: "rgba(41,38,27,.5)", marginTop: -2 }}>
        Alpina · Tramonto · Aurora · Nebbia
      </div>

      <TweakSection label="Luce" />
      <TweakRadio
        label="Intensità neon"
        value={t.intensita}
        options={["Sobrio", "Medio", "Neon"]}
        onChange={(v) => setTweak("intensita", v)}
      />

      <TweakSection label="Pannelli" />
      <TweakSlider
        label="Finitura vetro"
        value={t.finitura}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => setTweak("finitura", v)}
      />
      <div style={{ fontSize: 10.5, color: "rgba(41,38,27,.5)", marginTop: -2, display: "flex", justifyContent: "space-between" }}>
        <span>Etereo</span><span>Solido</span>
      </div>
    </TweaksPanel>
  );
}

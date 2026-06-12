/* ===========================================================
   Trento Live Activity — icon set (simple line icons)
   window.Icon  +  window.WxIcon
   =========================================================== */
const Icon = ({ name, size, style }) => {
  const s = size || 18;
  const common = {
    width: s, height: s, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round",
    strokeLinejoin: "round", style,
  };
  const P = {
    grid:     <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    landmark: <><path d="M3 21h18" /><path d="M5 21V10l7-5 7 5v11" /><path d="M9 21v-6h6v6" /></>,
    music:    <><circle cx="6" cy="18" r="2.5" /><circle cx="17" cy="16" r="2.5" /><path d="M8.5 18V6l11-2v10" /></>,
    run:      <><circle cx="13" cy="4.5" r="1.8" /><path d="M5 21l3-5 3.5-2 1-4 3 3 3 1" /><path d="M8 11l3-2 3 1" /></>,
    food:     <><path d="M5 3v7a2 2 0 0 0 2 2v9" /><path d="M9 3v9" /><path d="M5 3v4" /><path d="M9 3v4" /><path d="M18 3c-1.5 0-3 2-3 5s1 4 1 4v9" /><path d="M18 3v18" /></>,
    bike:     <><circle cx="6" cy="17" r="3.2" /><circle cx="18" cy="17" r="3.2" /><path d="M6 17l4-7h5l-3 7" /><path d="M10 10l-1.5-3H6" /><circle cx="15" cy="5" r="1" /></>,
    family:   <><circle cx="9" cy="6" r="2.4" /><circle cx="16" cy="7" r="2" /><path d="M5 21v-4a4 4 0 0 1 8 0v4" /><path d="M14 21v-3a3.5 3.5 0 0 1 6 0v3" /></>,
    warn:     <><path d="M12 3l9 16H3z" /><path d="M12 10v4" /><path d="M12 17h.01" /></>,
    cone:     <><path d="M10.5 4.5L6 19h12l-4.5-14.5a1.5 1.5 0 0 0-3 0z" /><path d="M4 19h16" /><path d="M8.2 11h7.6" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18" /><path d="M8 2.5v4" /><path d="M16 2.5v4" /></>,
    cloud:    <><path d="M7 17a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17.5 17z" /><path d="M9 20l-1 2" /><path d="M14 20l-1 2" /></>,
    bus:      <><rect x="4" y="4" width="16" height="13" rx="2.5" /><path d="M4 11h16" /><circle cx="8" cy="20" r="1.4" /><circle cx="16" cy="20" r="1.4" /><path d="M4 17v1.5" /><path d="M20 17v1.5" /></>,
    home:     <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    map:      <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14" /><path d="M15 6v14" /></>,
    star:     <><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9z" /></>,
    search:   <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    bell:     <><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z" /><path d="M10.5 20a2 2 0 0 0 3 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7.6 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1.1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1.1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>,
    pin:      <><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    arrow:    <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
    chevron:  <><path d="M9 6l6 6-6 6" /></>,
    clock:    <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    locate:   <><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M2 12h3" /><path d="M19 12h3" /></>,
    plus:     <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus:    <><path d="M5 12h14" /></>,
    cube:     <><path d="M12 2.5l8 4.5v9l-8 4.5-8-4.5v-9z" /><path d="M12 2.5v19" /><path d="M4 7l8 4.5L20 7" /></>,
    layers:   <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
    compass:  <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
    wind:     <><path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5" /><path d="M3 12h16a2.5 2.5 0 1 1-2.5 2.5" /><path d="M3 16h8a2 2 0 1 1-2 2" /></>,
    drop:     <><path d="M12 3s6 6.4 6 10.5A6 6 0 0 1 6 13.5C6 9.4 12 3 12 3z" /></>,
    arrowUp:  <><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>,
    arrowDown:<><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></>,
    activity: <><path d="M3 12h4l2.5-7 5 14 2.5-7H21" /></>,
    sun:      <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.5" /><path d="M12 19v2.5" /><path d="M2.5 12H5" /><path d="M19 12h2.5" /><path d="M5 5l1.8 1.8" /><path d="M17.2 17.2L19 19" /><path d="M19 5l-1.8 1.8" /><path d="M6.8 17.2L5 19" /></>,
    moon:     <><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></>,
    users:    <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.8" /><path d="M17.5 14.4A5.5 5.5 0 0 1 20.5 19.4" /></>,
    x:        <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
    ticket:   <><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" /><path d="M14 6v12" /></>,
    heart:    <><path d="M12 20.3l-1.4-1.3C5.4 14.4 2.5 11.7 2.5 8.4 2.5 5.9 4.4 4 6.9 4c1.5 0 2.9.7 3.8 1.8L12 7l1.3-1.2A5 5 0 0 1 17.1 4C19.6 4 21.5 5.9 21.5 8.4c0 3.3-2.9 6-8.1 10.6z" /></>,
    comment:  <><path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20.5l1.9-5.3A8 8 0 1 1 21 11.5z" /></>,
    share:    <><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="5.5" r="2.4" /><circle cx="18" cy="18.5" r="2.4" /><path d="M8.1 10.9l7.8-4" /><path d="M8.1 13.1l7.8 4" /></>,
    bookmark: <><path d="M6 4.5h12a1 1 0 0 1 1 1v15l-7-4.4L5 20.5v-15a1 1 0 0 1 1-1z" /></>,
    flame:    <><path d="M12 3c1.2 3-2.2 4.2-2.2 7.2a2.2 2.2 0 0 0 4.4 0c0-.8.3-1.4.3-1.4C16.2 11 17.5 13.2 17.5 15.3a5.5 5.5 0 0 1-11 0C6.5 11 12 8.5 12 3z" /></>,
    image:    <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="10" r="1.8" /><path d="M21 15.5l-5-5-8 8" /></>,
    funnel:   <><path d="M3 5h18l-7 8.2V20l-4-2.2v-4.6z" /></>,
    trending: <><path d="M3 16.5l6-6 4 4 8-8" /><path d="M21 6.5v5h-5" /></>,
    send:     <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>,
    chevronL: <><path d="M15 6l-6 6 6 6" /></>,
    shield:   <><path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z" /></>,
    shieldCheck: <><path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z" /><path d="M9 11.5l2 2 4-4" /></>,
    check:    <><path d="M5 12.5l4.5 4.5L19 7" /></>,
    euro:     <><path d="M16.5 7A5.5 5.5 0 1 0 16.5 17" /><path d="M4.5 10.5h8" /><path d="M4.5 13.5h7" /></>,
    leaf:     <><path d="M5 19c0-7.5 6-13 14-13 0 8-5.5 14-13 14a6 6 0 0 1-1-1z" /><path d="M5 19c3-3.2 6.5-5.3 9.5-6.3" /></>,
    gauge:    <><path d="M4.5 17a8 8 0 1 1 15 0z" /><path d="M12 13l3.5-3" /></>,
    sparkle:  <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>,
    mountain: <><path d="M3 19l6-10 4 6 2-3.2L21 19z" /><path d="M9 9l2.3 3.4" /></>,
  };
  return <svg {...common}>{P[name] || null}</svg>;
};

/* sun-behind-cloud weather glyph */
const WxIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none">
    <defs>
      <radialGradient id="wxsun" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#fbbf24" />
      </radialGradient>
      <linearGradient id="wxcloud" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="22" r="11" fill="url(#wxsun)" />
    {[...Array(8)].map((_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={24 + Math.cos(a) * 14} y1={22 + Math.sin(a) * 14} x2={24 + Math.cos(a) * 18} y2={22 + Math.sin(a) * 18} stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" />;
    })}
    <path d="M22 44a8 8 0 0 1 1-15.9 11 11 0 0 1 21 3A7 7 0 0 1 43 44z" fill="url(#wxcloud)" stroke="#cbd5e1" strokeWidth="1" />
  </svg>
);

Object.assign(window, { Icon, WxIcon });

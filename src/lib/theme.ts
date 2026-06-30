const COLOR_MAP: Record<string, { primary: string; accent: string; ring: string; neon: string }> = {
  green:  { primary: "145 100% 50%", accent: "145 80% 42%", ring: "145 100% 50%", neon: "145 100% 50%" },
  cyan:   { primary: "180 100% 50%", accent: "180 80% 42%", ring: "180 100% 50%", neon: "180 100% 50%" },
  purple: { primary: "270 100% 65%", accent: "270 80% 55%", ring: "270 100% 65%", neon: "270 100% 65%" },
  orange: { primary: "25 100% 55%",  accent: "25 80% 48%",  ring: "25 100% 55%",  neon: "25 100% 55%"  },
  pink:   { primary: "330 100% 60%", accent: "330 80% 52%", ring: "330 100% 60%", neon: "330 100% 60%" },
};

export const applyTheme = (colorId: string) => {
  const root = document.documentElement;
  const c = COLOR_MAP[colorId] ?? COLOR_MAP.green;
  root.style.setProperty("--primary", c.primary);
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--ring", c.ring);
  root.style.setProperty("--neon-glow", c.neon);
  root.style.setProperty("--sidebar-primary", c.primary);
  root.style.setProperty("--sidebar-ring", c.ring);
};

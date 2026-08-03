// OKLCH component triples (L C H), matching the Claude Design handoff palette
const COLOR_MAP: Record<string, { primary: string; hover: string; accent: string; ring: string; neon: string }> = {
  green:  { primary: "0.72 0.14 150", hover: "0.8 0.14 150", accent: "0.6 0.13 150", ring: "0.72 0.14 150", neon: "0.72 0.14 150" },
  cyan:   { primary: "0.75 0.13 200", hover: "0.82 0.13 200", accent: "0.62 0.12 200", ring: "0.75 0.13 200", neon: "0.75 0.13 200" },
  purple: { primary: "0.68 0.17 300", hover: "0.76 0.17 300", accent: "0.56 0.16 300", ring: "0.68 0.17 300", neon: "0.68 0.17 300" },
  orange: { primary: "0.75 0.15 60",  hover: "0.82 0.15 60",  accent: "0.62 0.14 60",  ring: "0.75 0.15 60",  neon: "0.75 0.15 60"  },
  pink:   { primary: "0.72 0.18 340", hover: "0.8 0.18 340",  accent: "0.6 0.17 340",  ring: "0.72 0.18 340", neon: "0.72 0.18 340" },
};

export const applyTheme = (colorId: string) => {
  const root = document.documentElement;
  const c = COLOR_MAP[colorId] ?? COLOR_MAP.green;
  root.style.setProperty("--primary", c.primary);
  root.style.setProperty("--primary-hover", c.hover);
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--ring", c.ring);
  root.style.setProperty("--neon-glow", c.neon);
  root.style.setProperty("--sidebar-primary", c.primary);
  root.style.setProperty("--sidebar-ring", c.ring);
};

export type ThemeMode = "dark" | "light";
const MODE_STORAGE_KEY = "myfitflow-theme-mode";

export const getStoredMode = (): ThemeMode =>
  (localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null) ?? "dark";

export const applyMode = (mode: ThemeMode) => {
  const root = document.documentElement;
  if (mode === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  localStorage.setItem(MODE_STORAGE_KEY, mode);
};

// Call once, before first paint, to avoid a flash of the wrong mode.
export const initMode = () => applyMode(getStoredMode());

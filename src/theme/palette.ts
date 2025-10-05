import type { CSSProperties } from "react";

type SurfaceSet = {
  base: string;
  raised: string;
  glass: string;
};

type BoundarySet = {
  background: string;
  border: string;
};

type NeutralScale = {
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

type AccentSet = {
  info: string;
  success: string;
  warn: string;
  critical: string;
};

type PrimarySet = {
  base: string;
  bright: string;
  muted: string;
};

export interface ThemePalette {
  name: string;
  background: string;
  foreground: string;
  surface: SurfaceSet;
  header: BoundarySet;
  footer: BoundarySet;
  borders: {
    subtle: string;
    strong: string;
  };
  neutrals: NeutralScale;
  accent: AccentSet;
  primary: PrimarySet;
  flux: string;
  iris: string;
  focusRing: string;
  gradient: {
    warmSpot: string;
    emberSpot: string;
  };
}

const hexToRgb = (hex: string) => {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) {
    throw new Error(`Expected 6-digit hex value, received ${hex}`);
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
};

export const sunrisePalette: ThemePalette = {
  name: "sunrise",
  background: "#FF6500",
  foreground: "#FFF7EC",
  surface: {
    base: "#FF7C26",
    raised: "#FF923F",
    glass: "#FFA85D",
  },
  header: {
    background: "#FF6500",
    border: "#FFD07A",
  },
  footer: {
    background: "#FF6500",
    border: "#FFD07A",
  },
  borders: {
    subtle: "#FFC58F",
    strong: "#FFE4B8",
  },
  neutrals: {
    100: "#FFF3E3",
    200: "#FFE1C2",
    300: "#FFCDA1",
    400: "#FFB57A",
    500: "#FF9A56",
    600: "#FF8131",
    700: "#F26416",
    800: "#D65105",
    900: "#993200",
  },
  accent: {
    info: "#26B5FF",
    success: "#16C98C",
    warn: "#FFD05A",
    critical: "#FF4D69",
  },
  primary: {
    base: "#F26B1A",
    bright: "#F23E01",
    muted: "#FEFBF4",
  },
  flux: "#FFC93C",
  iris: "#FF7FC1",
  focusRing: "#FDF0CF",
  gradient: {
    warmSpot: "#F26B1A",
    emberSpot: "#F23E01",
  },
};

export const paletteCssVariables = (palette: ThemePalette): CSSProperties => {
  const cssVariables: Record<string, string> = {
    "--color-background": hexToRgb(palette.background),
    "--color-foreground": hexToRgb(palette.foreground),
    "--color-surface-base": hexToRgb(palette.surface.base),
    "--color-surface-raised": hexToRgb(palette.surface.raised),
    "--color-surface-glass": hexToRgb(palette.surface.glass),
    "--color-header-bg": hexToRgb(palette.header.background),
    "--color-header-border": hexToRgb(palette.header.border),
    "--color-footer-bg": hexToRgb(palette.footer.background),
    "--color-footer-border": hexToRgb(palette.footer.border),
    "--color-border-subtle": hexToRgb(palette.borders.subtle),
    "--color-border-strong": hexToRgb(palette.borders.strong),
    "--color-primary": hexToRgb(palette.primary.base),
    "--color-primary-bright": hexToRgb(palette.primary.bright),
    "--color-primary-muted": hexToRgb(palette.primary.muted),
    "--color-accent-info": hexToRgb(palette.accent.info),
    "--color-accent-success": hexToRgb(palette.accent.success),
    "--color-accent-warn": hexToRgb(palette.accent.warn),
    "--color-accent-critical": hexToRgb(palette.accent.critical),
    "--color-flux": hexToRgb(palette.flux),
    "--color-iris": hexToRgb(palette.iris),
    "--color-focus-ring": hexToRgb(palette.focusRing),
    "--color-gradient-warm": hexToRgb(palette.gradient.warmSpot),
    "--color-gradient-ember": hexToRgb(palette.gradient.emberSpot),
  };

  Object.entries(palette.neutrals).forEach(([step, value]) => {
    cssVariables[`--color-neutral-${step}`] = hexToRgb(value);
  });

  return cssVariables as CSSProperties;
};

export const activeThemeVariables = paletteCssVariables(sunrisePalette);

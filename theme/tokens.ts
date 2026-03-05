/**
 * theme/tokens.ts
 *
 * Semantic design token system for BrainExtension.
 * Provides a cohesive, premium design language inspired by
 * Apple HIG, Linear, and Material 3.
 *
 * Dark mode: pure black + white monochrome — calm, focused, elegant.
 * Light mode: pure white + black monochrome — clean, crisp, minimal.
 */

export type ThemeMode = 'light' | 'dark';

export interface AppTokens {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: {
    /** Base full-screen background */
    screen: string;
    /** Elevated card / surface background */
    surface: string;
    /** Secondary elevated surface */
    elevated: string;
    /** Input field background */
    input: string;
    /** Subtle tinted surface (badge, tag) */
    subtle: string;
    /** Gradient stops for LinearGradient (top → bottom) */
    gradient: [string, string, string];
  };

  // ── Text ─────────────────────────────────────────────────────────────────
  text: {
    primary: string;
    secondary: string;
    muted: string;
    onPrimary: string;
    placeholder: string;
    /** Ultra-subtle text for decorative elements */
    ghost: string;
  };

  // ── Semantic / Brand ─────────────────────────────────────────────────────
  primary: {
    default: string;
    accent: string;
    shadow: string;
    focusBorder: string;
    /** Soft background tint for primary elements */
    tint: string;
  };

  // ── Status ───────────────────────────────────────────────────────────────
  status: {
    error: string;
    errorSubtle: string;
    success: string;
    successSubtle: string;
    warning: string;
    warningSubtle: string;
    info: string;
    infoSubtle: string;
  };

  // ── Borders ───────────────────────────────────────────────────────────────
  border: {
    default: string;
    subtle: string;
    /** Stronger border for focused/active elements */
    strong: string;
  };

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadow: {
    card: { color: string; offset: { width: number; height: number }; opacity: number; radius: number; elevation: number };
    elevated: { color: string; offset: { width: number; height: number }; opacity: number; radius: number; elevation: number };
    glow: { color: string; offset: { width: number; height: number }; opacity: number; radius: number; elevation: number };
  };

  // ── Spacing (8-pt grid) ──────────────────────────────────────────────────
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    '3xl': number;
  };

  // ── Typography ────────────────────────────────────────────────────────────
  typography: {
    display: number;
    h1: number;
    h2: number;
    h3: number;
    body: number;
    label: number;
    caption: number;
    micro: number;
    letterSpacing: {
      tight: number;
      normal: number;
      wide: number;
      extraWide: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };

  // ── Shape ────────────────────────────────────────────────────────────────
  shape: {
    pill: number;
    card: number;
    cardLg: number;
    input: number;
    circle: number;
    button: number;
    /** Small interactive element radius */
    sm: number;
  };

  // ── Animation durations (ms) ─────────────────────────────────────────────
  animation: {
    fast: number;
    normal: number;
    slow: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token maps
// ─────────────────────────────────────────────────────────────────────────────

const darkTokens: AppTokens = {
  background: {
    screen: '#000000',
    surface: '#0F0F0F',
    elevated: '#1A1A1A',
    input: 'rgba(255, 255, 255, 0.06)',
    subtle: 'rgba(255, 255, 255, 0.05)',
    gradient: ['#000000', '#050505', '#0F0F0F'],
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.68)',
    muted: 'rgba(255, 255, 255, 0.38)',
    onPrimary: '#000000',
    placeholder: 'rgba(255, 255, 255, 0.22)',
    ghost: 'rgba(255, 255, 255, 0.12)',
  },
  primary: {
    default: '#FFFFFF',
    accent: '#E0E0E0',
    shadow: 'rgba(255, 255, 255, 0.12)',
    focusBorder: '#FFFFFF',
    tint: 'rgba(255, 255, 255, 0.06)',
  },
  status: {
    error: '#f87171',
    errorSubtle: 'rgba(248, 113, 113, 0.10)',
    success: '#4ade80',
    successSubtle: 'rgba(74, 222, 128, 0.08)',
    warning: '#fbbf24',
    warningSubtle: 'rgba(251, 191, 36, 0.08)',
    info: '#60a5fa',
    infoSubtle: 'rgba(96, 165, 250, 0.08)',
  },
  border: {
    default: 'rgba(255, 255, 255, 0.10)',
    subtle: 'rgba(255, 255, 255, 0.05)',
    strong: 'rgba(255, 255, 255, 0.20)',
  },
  shadow: {
    card: { color: '#000', offset: { width: 0, height: 2 }, opacity: 0.3, radius: 8, elevation: 3 },
    elevated: { color: '#000', offset: { width: 0, height: 8 }, opacity: 0.4, radius: 24, elevation: 12 },
    glow: { color: '#fff', offset: { width: 0, height: 0 }, opacity: 0.06, radius: 20, elevation: 0 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, '3xl': 64 },
  typography: {
    display: 48,
    h1: 34,
    h2: 26,
    h3: 20,
    body: 16,
    label: 14,
    caption: 12,
    micro: 10,
    letterSpacing: { tight: -0.5, normal: 0, wide: 0.8, extraWide: 1.5 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 },
  },
  shape: { pill: 24, card: 20, cardLg: 28, input: 16, circle: 9999, button: 16, sm: 10 },
  animation: { fast: 150, normal: 300, slow: 500 },
};

const lightTokens: AppTokens = {
  background: {
    screen: '#FFFFFF',
    surface: '#F7F7F7',
    elevated: '#EFEFEF',
    input: 'rgba(0, 0, 0, 0.03)',
    subtle: 'rgba(0, 0, 0, 0.03)',
    gradient: ['#FFFFFF', '#FAFAFA', '#F7F7F7'],
  },
  text: {
    primary: '#000000',
    secondary: 'rgba(0, 0, 0, 0.62)',
    muted: 'rgba(0, 0, 0, 0.38)',
    onPrimary: '#FFFFFF',
    placeholder: 'rgba(0, 0, 0, 0.22)',
    ghost: 'rgba(0, 0, 0, 0.08)',
  },
  primary: {
    default: '#000000',
    accent: '#222222',
    shadow: 'rgba(0, 0, 0, 0.10)',
    focusBorder: '#000000',
    tint: 'rgba(0, 0, 0, 0.04)',
  },
  status: {
    error: '#dc2626',
    errorSubtle: 'rgba(220, 38, 38, 0.06)',
    success: '#16a34a',
    successSubtle: 'rgba(22, 163, 74, 0.06)',
    warning: '#d97706',
    warningSubtle: 'rgba(217, 119, 6, 0.06)',
    info: '#2563eb',
    infoSubtle: 'rgba(37, 99, 235, 0.06)',
  },
  border: {
    default: 'rgba(0, 0, 0, 0.08)',
    subtle: 'rgba(0, 0, 0, 0.04)',
    strong: 'rgba(0, 0, 0, 0.16)',
  },
  shadow: {
    card: { color: '#000', offset: { width: 0, height: 1 }, opacity: 0.06, radius: 6, elevation: 2 },
    elevated: { color: '#000', offset: { width: 0, height: 4 }, opacity: 0.08, radius: 16, elevation: 8 },
    glow: { color: '#000', offset: { width: 0, height: 0 }, opacity: 0.04, radius: 12, elevation: 0 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, '3xl': 64 },
  typography: {
    display: 48,
    h1: 34,
    h2: 26,
    h3: 20,
    body: 16,
    label: 14,
    caption: 12,
    micro: 10,
    letterSpacing: { tight: -0.5, normal: 0, wide: 0.8, extraWide: 1.5 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 },
  },
  shape: { pill: 24, card: 20, cardLg: 28, input: 16, circle: 9999, button: 16, sm: 10 },
  animation: { fast: 150, normal: 300, slow: 500 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Public accessor – the only entry point components should use
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the read-only token map for the given theme mode.
 * Components call this with the value from:
 *   const mode = useSelector((s: RootState) => s.theme.mode)
 *   const t = getTokens(mode)
 */
export function getTokens(mode: ThemeMode): Readonly<AppTokens> {
  return mode === 'dark' ? darkTokens : lightTokens;
}

/**
 * Convenience hook-compatible getter.  Import and call directly.
 *
 * @example
 * const mode = useSelector((s: RootState) => s.theme.mode);
 * const t = getTokens(mode);
 * // t.primary.default → '#8b5cf6' in dark mode
 */
export default getTokens;

/**
 * theme/tokens.ts
 *
 * READ-ONLY semantic token mapper.
 *
 * IMPORTANT: This file does NOT create or override the app theme.
 * It reads the existing Redux theme mode ('light' | 'dark') and maps
 * it to the color/typography/spacing values already present in the app.
 *
 * All values in this file were extracted from existing screens:
 *   - screens/Onboarding/Onboarding1.tsx
 *   - screens/Onboarding/Onboarding2.tsx
 *   - screens/Onboarding/Onboarding3.tsx
 *   - screens/LoadingScreen.tsx
 *   - screens/HomeScreen.tsx
 *   - App.tsx (StatusBar background)
 *
 * DO NOT add new colors here without first confirming they exist
 * in the app's existing visual language.
 */

export type ThemeMode = 'light' | 'dark';

export interface AppTokens {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: {
    /** Base full-screen background (non-gradient fallback) */
    screen: string;
    /** Card / surface background */
    surface: string;
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
    onPrimary: string; // text placed on top of a primary-colored background
    placeholder: string;
  };

  // ── Semantic / Brand ─────────────────────────────────────────────────────
  primary: {
    /** CTA button fill, focused ring, accent icon */
    default: string;
    /** Accent text, highlighted labels */
    accent: string;
    /** Shadow / glow colour for primary elements */
    shadow: string;
    /** Border ring on focused inputs */
    focusBorder: string;
  };

  // ── Status ───────────────────────────────────────────────────────────────
  status: {
    error: string;
    errorSubtle: string;
    success: string;
    successSubtle: string;
  };

  // ── Borders ───────────────────────────────────────────────────────────────
  border: {
    default: string;
    subtle: string;
  };

  // ── Spacing (8-pt grid, consistent with app) ─────────────────────────────
  spacing: {
    xs: number;   // 4
    sm: number;   // 8
    md: number;   // 16
    lg: number;   // 24
    xl: number;   // 32
    xxl: number;  // 48
  };

  // ── Typography (mirrors existing screen font sizes) ───────────────────────
  typography: {
    display: number;  // 52 – hero heading (Onboarding1)
    h1: number;       // 36
    h2: number;       // 28
    h3: number;       // 22
    body: number;     // 17 – body copy (Onboarding1 subtitle)
    label: number;    // 14
    caption: number;  // 11 – badge text (Onboarding1)
    letterSpacing: {
      wide: number;   // 1.5 – badge letter-spacing
      normal: number; // 0
    };
  };

  // ── Shape ────────────────────────────────────────────────────────────────
  shape: {
    /** Small pill / chip radius */
    pill: number;
    /** Standard card radius */
    card: number;
    /** Input field radius */
    input: number;
    /** Full circle */
    circle: number;
    /** Button radius */
    button: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token maps – ALL values sourced from existing screens (listed above)
// ─────────────────────────────────────────────────────────────────────────────

const darkTokens: AppTokens = {
  background: {
    screen: '#000000',                         // Pure black minimalistic
    surface: '#111111',                        // Near-black surface
    input: 'rgba(255, 255, 255, 0.06)',
    subtle: 'rgba(255, 255, 255, 0.08)',       // Subtle grey tint
    gradient: ['#000000', '#0a0a0a', '#111111'], // Minimal dark gradient
  },
  text: {
    primary: '#FFFFFF',                        // Pure white
    secondary: 'rgba(255, 255, 255, 0.70)',    // Soft white
    muted: 'rgba(255, 255, 255, 0.40)',        // Muted grey
    onPrimary: '#000000',                      // Black text on white buttons
    placeholder: 'rgba(255, 255, 255, 0.25)',
  },
  primary: {
    default: '#FFFFFF',                        // White as primary accent
    accent: '#E0E0E0',                         // Light grey accent
    shadow: 'rgba(255, 255, 255, 0.15)',
    focusBorder: '#FFFFFF',
  },
  status: {
    error: '#f87171',
    errorSubtle: 'rgba(248, 113, 113, 0.12)',
    success: '#4ade80',
    successSubtle: 'rgba(74, 222, 128, 0.10)',
  },
  border: {
    default: 'rgba(255, 255, 255, 0.12)',
    subtle: 'rgba(255, 255, 255, 0.06)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  typography: {
    display: 52,
    h1: 36,
    h2: 28,
    h3: 22,
    body: 17,
    label: 14,
    caption: 11,
    letterSpacing: { wide: 1.5, normal: 0 },
  },
  shape: { pill: 20, card: 16, input: 14, circle: 9999, button: 32 },
};

const lightTokens: AppTokens = {
  background: {
    screen: '#FFFFFF',                         // Pure white
    surface: '#F5F5F5',                        // Light grey surface
    input: 'rgba(0, 0, 0, 0.04)',
    subtle: 'rgba(0, 0, 0, 0.05)',             // Subtle tint
    gradient: ['#FFFFFF', '#FAFAFA', '#F5F5F5'], // Minimal light gradient
  },
  text: {
    primary: '#000000',                        // Pure black
    secondary: 'rgba(0, 0, 0, 0.65)',          // Soft black
    muted: 'rgba(0, 0, 0, 0.40)',              // Muted grey
    onPrimary: '#FFFFFF',                      // White text on black buttons
    placeholder: 'rgba(0, 0, 0, 0.25)',
  },
  primary: {
    default: '#000000',                        // Black as primary accent
    accent: '#333333',                         // Dark grey accent
    shadow: 'rgba(0, 0, 0, 0.15)',
    focusBorder: '#000000',
  },
  status: {
    error: '#dc2626',
    errorSubtle: 'rgba(220, 38, 38, 0.08)',
    success: '#16a34a',
    successSubtle: 'rgba(22, 163, 74, 0.08)',
  },
  border: {
    default: 'rgba(0, 0, 0, 0.10)',
    subtle: 'rgba(0, 0, 0, 0.05)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  typography: {
    display: 52,
    h1: 36,
    h2: 28,
    h3: 22,
    body: 17,
    label: 14,
    caption: 11,
    letterSpacing: { wide: 1.5, normal: 0 },
  },
  shape: { pill: 20, card: 16, input: 14, circle: 9999, button: 32 },
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

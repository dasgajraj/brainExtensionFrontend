/**
 * components/ui/Icons.tsx
 *
 * Centralised SVG icon library.
 * Every icon uses a consistent stroke-based design (Feather-style).
 * Props: size (default 22), color (string).
 */

import React from 'react';
import Svg, { Path, Circle, Line, Polyline, Rect, G } from 'react-native-svg';

// Shared stroke props — consistent weight & caps
const SP = {
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
};

interface IconProps {
  size?: number;
  color: string;
}

/* ── Navigation ──────────────────────────────────────────────────────────── */

export function IconHome({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={color} {...SP} />
      <Polyline points="9 22 9 12 15 12 15 22" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconUser({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} {...SP} />
      <Circle cx="12" cy="7" r="4" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconMenu({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} {...SP} />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} {...SP} />
      <Line x1="3" y1="18" x2="15" y2="18" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconArrowLeft({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19 12H5" stroke={color} {...SP} />
      <Path d="M12 19l-7-7 7-7" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconX({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} {...SP} />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconChevronRight({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="9 18 15 12 9 6" stroke={color} {...SP} />
    </Svg>
  );
}

/* ── Feature Icons ───────────────────────────────────────────────────────── */

export function IconBrain({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C8.5 2 6 4.5 6 7c0 1.5.5 2.8 1.5 3.8C6.5 12 6 13.5 6 15c0 3.5 2.5 7 6 7s6-3.5 6-7c0-1.5-.5-3-1.5-4.2C17.5 9.8 18 8.5 18 7c0-2.5-2.5-5-6-5z" stroke={color} {...SP} />
      <Path d="M12 2v20" stroke={color} {...SP} strokeWidth={1.5} />
      <Path d="M8 6c2 1 4 1 4 1" stroke={color} {...SP} strokeWidth={1.5} />
      <Path d="M8 16c2-1 4-1 4-1" stroke={color} {...SP} strokeWidth={1.5} />
      <Path d="M16 6c-2 1-4 1-4 1" stroke={color} {...SP} strokeWidth={1.5} />
      <Path d="M16 16c-2-1-4-1-4-1" stroke={color} {...SP} strokeWidth={1.5} />
    </Svg>
  );
}

export function IconBot({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="8" width="18" height="12" rx="3" stroke={color} {...SP} />
      <Circle cx="9" cy="14" r="1.5" fill={color} />
      <Circle cx="15" cy="14" r="1.5" fill={color} />
      <Path d="M12 8V5" stroke={color} {...SP} />
      <Circle cx="12" cy="4" r="1" fill={color} />
      <Path d="M9.5 17.5h5" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconClipboard({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke={color} {...SP} />
      <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconGlobe({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={color} {...SP} />
      <Line x1="2" y1="12" x2="22" y2="12" stroke={color} {...SP} />
      <Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconEye({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} {...SP} />
      <Circle cx="12" cy="12" r="3" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconStar({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconNetwork({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="5" r="3" stroke={color} {...SP} />
      <Circle cx="5" cy="19" r="3" stroke={color} {...SP} />
      <Circle cx="19" cy="19" r="3" stroke={color} {...SP} />
      <Line x1="12" y1="8" x2="5" y2="16" stroke={color} {...SP} />
      <Line x1="12" y1="8" x2="19" y2="16" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconFolder({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke={color} {...SP} />
    </Svg>
  );
}

/* ── Action Icons ────────────────────────────────────────────────────────── */

export function IconSend({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22 2L11 13" stroke={color} {...SP} />
      <Path d="M22 2l-7 20-4-9-9-4 20-7z" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconSun({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="5" stroke={color} {...SP} />
      <Line x1="12" y1="1" x2="12" y2="3" stroke={color} {...SP} />
      <Line x1="12" y1="21" x2="12" y2="23" stroke={color} {...SP} />
      <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} {...SP} />
      <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} {...SP} />
      <Line x1="1" y1="12" x2="3" y2="12" stroke={color} {...SP} />
      <Line x1="21" y1="12" x2="23" y2="12" stroke={color} {...SP} />
      <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} {...SP} />
      <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconMoon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconLogOut({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={color} {...SP} />
      <Polyline points="16 17 21 12 16 7" stroke={color} {...SP} />
      <Line x1="21" y1="12" x2="9" y2="12" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconShield({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconWifi({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.55a11 11 0 0114.08 0" stroke={color} {...SP} />
      <Path d="M1.42 9a16 16 0 0121.16 0" stroke={color} {...SP} />
      <Path d="M8.53 16.11a6 6 0 016.95 0" stroke={color} {...SP} />
      <Circle cx="12" cy="20" r="1" fill={color} />
    </Svg>
  );
}

export function IconPower({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18.36 6.64a9 9 0 11-12.72 0" stroke={color} {...SP} />
      <Line x1="12" y1="2" x2="12" y2="12" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconTerminal({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="4 17 10 11 4 5" stroke={color} {...SP} />
      <Line x1="12" y1="19" x2="20" y2="19" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconMail({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} {...SP} />
      <Polyline points="22,6 12,13 2,6" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconSettings({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="3" stroke={color} {...SP} />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconZap({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" stroke={color} {...SP} />
    </Svg>
  );
}

export function IconActivity({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} {...SP} />
    </Svg>
  );
}

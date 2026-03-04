/**
 * NeuralGraphScreen — Knowledge-graph style interactive neural map
 *
 * Inspired by Obsidian + Neo4j knowledge graph visualizations.
 * Large colored circular nodes with type icons, multi-colored curved
 * edges with strength labels, full pan/zoom/tap interaction.
 */

import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ActivityIndicator, Animated, PanResponder,
  Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Svg, {
  Circle, Line, G, Text as SvgText, Path, Rect,
} from 'react-native-svg';
import { RootState } from '../../redux/RootReducer';
import { getTokens } from '../../theme/tokens';
import {
  getGraph, GraphNode, GraphLink,
} from '../../api/brain.api';

type T = ReturnType<typeof getTokens>;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GRAPH_W = SCREEN_W;
const GRAPH_H = SCREEN_H - 140;

/* ── Edge color palette (rotating like reference graph) ──────────────── */
const EDGE_PALETTE_DARK = [
  'rgba(244,114,182,0.7)',   // pink
  'rgba(196,181,253,0.7)',   // purple
  'rgba(110,231,183,0.65)',  // green
  'rgba(251,191,36,0.65)',   // yellow
  'rgba(103,232,249,0.6)',   // cyan
  'rgba(252,165,165,0.65)',  // red
  'rgba(167,139,250,0.7)',   // indigo
];
const EDGE_PALETTE_LIGHT = [
  'rgba(219,39,119,0.55)',   // pink
  'rgba(124,58,237,0.55)',   // purple
  'rgba(5,150,105,0.55)',    // green
  'rgba(217,119,6,0.55)',    // yellow
  'rgba(8,145,178,0.55)',    // cyan
  'rgba(220,38,38,0.5)',     // red
  'rgba(99,102,241,0.55)',   // indigo
];

/* ── Node color schemes per type ─────────────────────────────────────── */
function getNodeColors(isDark: boolean) {
  return {
    memory: {
      fill: isDark ? '#c084fc' : '#a855f7',
      ring: isDark ? '#7c3aed' : '#6d28d9',
      bg:   isDark ? 'rgba(192,132,252,0.15)' : 'rgba(168,85,247,0.12)',
      text: isDark ? '#f5f3ff' : '#ffffff',
      label: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(30,27,75,0.8)',
    },
    file: {
      fill: isDark ? '#fbbf24' : '#f59e0b',
      ring: isDark ? '#d97706' : '#b45309',
      bg:   isDark ? 'rgba(251,191,36,0.15)' : 'rgba(245,158,11,0.12)',
      text: isDark ? '#1c1917' : '#ffffff',
      label: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(30,27,75,0.8)',
    },
    answer: {
      fill: isDark ? '#6ee7b7' : '#34d399',
      ring: isDark ? '#059669' : '#047857',
      bg:   isDark ? 'rgba(110,231,183,0.15)' : 'rgba(52,211,153,0.12)',
      text: isDark ? '#1c1917' : '#ffffff',
      label: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(30,27,75,0.8)',
    },
  };
}

/* ── Force Simulation ────────────────────────────────────────────────── */
export interface SimNode extends GraphNode {
  x: number; y: number; vx: number; vy: number; radius: number;
}

function runForceSimulation(
  rawNodes: GraphNode[],
  links: GraphLink[],
  W: number, H: number,
  iterations = 220,
): SimNode[] {
  if (!rawNodes.length) return [];

  // Count connections per node for sizing
  const connMap = new Map<string, number>();
  links.forEach(l => {
    if (l.source !== l.target) {
      connMap.set(l.source, (connMap.get(l.source) || 0) + 1);
      connMap.set(l.target, (connMap.get(l.target) || 0) + 1);
    }
  });

  const nodes: SimNode[] = rawNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / rawNodes.length;
    const spread = Math.min(W, H) * 0.32;
    const conns = connMap.get(n.id) || 0;
    // Bigger nodes: base 18, scale with connections
    const r = Math.max(16, Math.min(18 + conns * 1.8 + n.val * 0.5, 30));
    return {
      ...n,
      x: W / 2 + spread * Math.cos(angle) + (Math.random() - 0.5) * 40,
      y: H / 2 + spread * Math.sin(angle) + (Math.random() - 0.5) * 40,
      vx: 0, vy: 0,
      radius: r,
    };
  });

  // Bigger k for more spread (larger nodes need more space)
  const k = Math.sqrt((W * H) / Math.max(nodes.length, 1)) * 1.2;
  const temp0 = Math.min(W, H) * 0.18;
  const idMap = new Map<string, number>();
  nodes.forEach((n, i) => idMap.set(n.id, i));

  for (let iter = 0; iter < iterations; iter++) {
    const cooling = 1 - iter / iterations;
    const temp = temp0 * cooling;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      let fx = 0, fy = 0;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const minDist = nodes[i].radius + nodes[j].radius + 30;
        const f = (k * k) / d + (d < minDist ? (minDist - d) * 2 : 0);
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }
      nodes[i].vx += fx;
      nodes[i].vy += fy;
    }

    // Attraction along edges
    links.forEach(l => {
      const si = idMap.get(l.source);
      const ti = idMap.get(l.target);
      if (si == null || ti == null || si === ti) return;
      const a = nodes[si], b = nodes[ti];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const ideal = a.radius + b.radius + 60;
      const f = ((d - ideal) / k) * (0.4 + l.strength * 0.02);
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    });

    // Centre gravity
    nodes.forEach(n => {
      n.vx += (W / 2 - n.x) * 0.04;
      n.vy += (H / 2 - n.y) * 0.04;
    });

    // Apply + damp
    nodes.forEach(n => {
      const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy) || 1;
      const clip = Math.min(spd, Math.max(temp, 0.5));
      n.x += (n.vx / spd) * clip;
      n.y += (n.vy / spd) * clip;
      n.vx *= 0.45;
      n.vy *= 0.45;
      const pad = n.radius + 25;
      n.x = Math.max(pad, Math.min(W - pad, n.x));
      n.y = Math.max(pad, Math.min(H - pad, n.y));
    });
  }
  return nodes;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function computeNodeStats(id: string, links: GraphLink[]) {
  let inbound = 0, outbound = 0, selfLoop = 0;
  links.forEach(l => {
    if (l.source === id && l.target === id) { selfLoop += l.strength; return; }
    if (l.source === id) outbound += l.strength;
    if (l.target === id) inbound += l.strength;
  });
  return { inbound, outbound, selfLoop, total: inbound + outbound };
}

function truncLabel(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trim() + '...';
}

// Build quadratic bezier path for curved edges
function curvedEdgePath(
  x1: number, y1: number, x2: number, y2: number, curveOffset: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular offset
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * curveOffset;
  const cy = my + ny * curveOffset;
  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
}

// Get midpoint of quadratic bezier
function bezierMidpoint(
  x1: number, y1: number, x2: number, y2: number, curveOffset: number,
): { x: number; y: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  // Midpoint of quadratic bezier at t=0.5
  const qx = 0.25 * x1 + 0.5 * (mx + nx * curveOffset) + 0.25 * x2;
  const qy = 0.25 * y1 + 0.5 * (my + ny * curveOffset) + 0.25 * y2;
  return { x: qx, y: qy };
}

/* ── Node Detail Sheet ───────────────────────────────────────────────── */
function NodeSheet({ node, links, allNodes, t, isDark, onClose }: {
  node: SimNode | null; links: GraphLink[]; allNodes: SimNode[];
  t: T; isDark: boolean; onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (node) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
    }
  }, [node, slideAnim, fadeAnim]);

  if (!node) return null;

  const nc = getNodeColors(isDark);
  const stats = computeNodeStats(node.id, links);
  const isMemory = node.type === 'memory';
  const colors = isMemory ? nc.memory : nc.file;

  // Find connected nodes with names
  const connections = useMemo(() => {
    const conns: { id: string; label: string; strength: number; direction: string }[] = [];
    const seen = new Set<string>();
    links.forEach(l => {
      if (l.source === node.id && l.target !== node.id && !seen.has(l.target)) {
        seen.add(l.target);
        const target = allNodes.find(n => n.id === l.target);
        if (target) conns.push({ id: l.target, label: target.label, strength: l.strength, direction: 'out' });
      }
      if (l.target === node.id && l.source !== node.id && !seen.has(l.source)) {
        seen.add(l.source);
        const source = allNodes.find(n => n.id === l.source);
        if (source) conns.push({ id: l.source, label: source.label, strength: l.strength, direction: 'in' });
      }
    });
    return conns.sort((a, b) => b.strength - a.strength);
  }, [node.id, links, allNodes]);

  return (
    <Animated.View style={[sheetSt.backdrop, { opacity: fadeAnim }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[sheetSt.container, {
        backgroundColor: t.background.screen,
        borderColor: t.border.default,
        transform: [{ translateY: slideAnim }],
      }]}>
        <View style={[sheetSt.handle, { backgroundColor: t.border.default }]} />

        {/* Type badge + close */}
        <View style={sheetSt.topRow}>
          <View style={[sheetSt.typePill, { backgroundColor: colors.bg }]}>
            <View style={[sheetSt.typeDot, { backgroundColor: colors.fill }]} />
            <Text style={[sheetSt.typeLabel, { color: colors.fill }]}>
              {isMemory ? 'Memory' : 'File'}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onClose}
            style={[sheetSt.closeBtn, { backgroundColor: t.background.input }]}>
            <Text style={[sheetSt.closeTxt, { color: t.text.muted }]}>X</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[sheetSt.nodeLabel, { color: t.text.primary }]} numberOfLines={2}>
          {node.label}
        </Text>

        {/* Stats */}
        <View style={[sheetSt.statsWrap, { borderColor: t.border.subtle }]}>
          {[
            { val: connections.length, lbl: 'Connections', clr: colors.fill },
            { val: stats.inbound, lbl: 'Inbound', clr: isDark ? '#c4b5fd' : '#7c3aed' },
            { val: stats.outbound, lbl: 'Outbound', clr: isDark ? '#fbbf24' : '#d97706' },
            { val: node.val, lbl: 'Weight', clr: isDark ? '#6ee7b7' : '#059669' },
          ].map(s => (
            <View key={s.lbl} style={sheetSt.statCell}>
              <Text style={[sheetSt.statVal, { color: s.clr }]}>{s.val}</Text>
              <Text style={[sheetSt.statLbl, { color: t.text.muted }]}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
          {/* Connected nodes list */}
          {connections.length > 0 && (
            <View style={[sheetSt.section, { borderColor: t.border.subtle }]}>
              <Text style={[sheetSt.sectionTitle, { color: t.text.muted }]}>Connections</Text>
              {connections.slice(0, 6).map((c, i) => (
                <View key={c.id} style={[sheetSt.connRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.border.subtle }]}>
                  <View style={[sheetSt.connDir, {
                    backgroundColor: c.direction === 'out'
                      ? (isDark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.1)')
                      : (isDark ? 'rgba(196,181,253,0.15)' : 'rgba(124,58,237,0.1)'),
                  }]}>
                    <Text style={[sheetSt.connDirText, {
                      color: c.direction === 'out'
                        ? (isDark ? '#fbbf24' : '#d97706')
                        : (isDark ? '#c4b5fd' : '#7c3aed'),
                    }]}>{c.direction === 'out' ? 'OUT' : 'IN'}</Text>
                  </View>
                  <Text style={[sheetSt.connLabel, { color: t.text.secondary }]} numberOfLines={1}>
                    {truncLabel(c.label, 30)}
                  </Text>
                  <View style={[sheetSt.connStr, { backgroundColor: t.background.input }]}>
                    <Text style={[sheetSt.connStrText, { color: t.text.muted }]}>{c.strength}</Text>
                  </View>
                </View>
              ))}
              {connections.length > 6 && (
                <Text style={[sheetSt.moreText, { color: t.text.muted }]}>
                  +{connections.length - 6} more
                </Text>
              )}
            </View>
          )}

          {/* Content preview */}
          <View style={[sheetSt.preview, { backgroundColor: t.background.input, borderColor: t.border.subtle }]}>
            <Text style={[sheetSt.previewLbl, { color: t.text.muted }]}>Content</Text>
            <Text style={[sheetSt.previewTxt, { color: t.text.secondary }]}>
              {node.fullText.length > 280 ? node.fullText.slice(0, 280) + '...' : node.fullText}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}
const sheetSt = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  container: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0,
    paddingHorizontal: 22, paddingTop: 10, paddingBottom: 34,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  typeDot: { width: 7, height: 7, borderRadius: 4 },
  typeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 13, fontWeight: '700' },
  nodeLabel: { fontSize: 17, fontWeight: '700', lineHeight: 23, marginBottom: 16, letterSpacing: -0.2 },
  statsWrap: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16, marginBottom: 16 },
  statCell: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 9, letterSpacing: 0.6, marginTop: 3, textTransform: 'uppercase' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  connRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  connDir: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  connDirText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  connLabel: { flex: 1, fontSize: 12, letterSpacing: -0.1 },
  connStr: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  connStrText: { fontSize: 10, fontWeight: '700' },
  moreText: { fontSize: 11, marginTop: 4 },
  preview: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 10 },
  previewLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  previewTxt: { fontSize: 13, lineHeight: 20 },
});

/* ── Force Graph Canvas — Blueprint / Architectural Style ─────────── */
function ForceGraph({ simNodes, links, selectedId, onNodeTap, onBgTap, isDark }: {
  simNodes: SimNode[];
  links: GraphLink[];
  selectedId: string | null;
  onNodeTap: (n: SimNode) => void;
  onBgTap: () => void;
  isDark: boolean;
}) {
  const nc = getNodeColors(isDark);
  const edgePalette = isDark ? EDGE_PALETTE_DARK : EDGE_PALETTE_LIGHT;
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1.0);
  const lastPinchDist = useRef<number | null>(null);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  // Blueprint grid colors
  const gridColor = isDark ? 'rgba(100,120,180,0.06)' : 'rgba(80,100,160,0.05)';
  const gridMajor = isDark ? 'rgba(100,120,180,0.12)' : 'rgba(80,100,160,0.09)';

  // Node card dimensions — blueprint style
  const NODE_W = 110;
  const NODE_H = 44;
  const NODE_HEADER_H = 16;

  function pDist(touches: any[]): number {
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { touches } = e.nativeEvent;
      if (touches.length === 1) {
        lastPinchDist.current = null;
        lastPanPos.current = { x: touches[0].pageX, y: touches[0].pageY };
        touchStartRef.current = { x: touches[0].pageX, y: touches[0].pageY, time: Date.now() };
      } else if (touches.length === 2) {
        lastPinchDist.current = pDist(touches);
        lastPanPos.current = null;
        touchStartRef.current = null;
      }
    },
    onPanResponderMove: (e) => {
      const { touches } = e.nativeEvent;
      if (touches.length === 2) {
        const nd = pDist(touches);
        if (lastPinchDist.current != null) {
          scaleRef.current = Math.max(0.2, Math.min(5, scaleRef.current * (nd / lastPinchDist.current)));
        }
        lastPinchDist.current = nd;
        const mx = (touches[0].pageX + touches[1].pageX) / 2;
        const my = (touches[0].pageY + touches[1].pageY) / 2;
        if (lastPanPos.current) {
          panRef.current.x += mx - lastPanPos.current.x;
          panRef.current.y += my - lastPanPos.current.y;
        }
        lastPanPos.current = { x: mx, y: my };
        touchStartRef.current = null;
        setTransform({ x: panRef.current.x, y: panRef.current.y, scale: scaleRef.current });
      } else if (touches.length === 1 && lastPanPos.current) {
        panRef.current.x += touches[0].pageX - lastPanPos.current.x;
        panRef.current.y += touches[0].pageY - lastPanPos.current.y;
        lastPanPos.current = { x: touches[0].pageX, y: touches[0].pageY };
        setTransform({ x: panRef.current.x, y: panRef.current.y, scale: scaleRef.current });
      }
    },
    onPanResponderRelease: (e) => {
      const { touches, changedTouches } = e.nativeEvent;
      if (touchStartRef.current && changedTouches.length === 1 && touches.length === 0) {
        const elapsed = Date.now() - touchStartRef.current.time;
        const moved = Math.sqrt(
          (changedTouches[0].pageX - touchStartRef.current.x) ** 2 +
          (changedTouches[0].pageY - touchStartRef.current.y) ** 2,
        );
        if (elapsed < 280 && moved < 16) {
          const gx = (changedTouches[0].pageX - panRef.current.x) / scaleRef.current;
          const gy = (changedTouches[0].pageY - panRef.current.y) / scaleRef.current;
          let hit: SimNode | null = null;
          let best = 999;
          simNodes.forEach(n => {
            // Hit test against rectangular node card
            const hw = NODE_W / 2 + 12;
            const hh = NODE_H / 2 + 12;
            if (Math.abs(n.x - gx) < hw && Math.abs(n.y - gy) < hh) {
              const d = Math.sqrt((n.x - gx) ** 2 + (n.y - gy) ** 2);
              if (d < best) { best = d; hit = n; }
            }
          });
          if (hit) onNodeTap(hit); else onBgTap();
        }
      }
      lastPanPos.current = null;
      lastPinchDist.current = null;
      touchStartRef.current = null;
    },
  }), [simNodes, onNodeTap, onBgTap]);

  const maxStr = useMemo(() => Math.max(1, ...links.filter(l => l.source !== l.target).map(l => l.strength)), [links]);

  // Connected set when node selected
  const connectedIds = useMemo(() => {
    if (!selectedId) return null;
    const s = new Set<string>([selectedId]);
    links.forEach(l => {
      if (l.source === selectedId && l.target !== selectedId) s.add(l.target);
      if (l.target === selectedId && l.source !== selectedId) s.add(l.source);
    });
    return s;
  }, [selectedId, links]);

  // Dedupe edges for rendering (combine A->B and B->A, skip self)
  const renderEdges = useMemo(() => {
    const edgeMap = new Map<string, { src: string; tgt: string; totalStr: number; count: number }>();
    links.forEach(l => {
      if (l.source === l.target) return;
      const key = [l.source, l.target].sort().join('|');
      const existing = edgeMap.get(key);
      if (existing) {
        existing.totalStr += l.strength;
        existing.count += 1;
      } else {
        edgeMap.set(key, { src: l.source, tgt: l.target, totalStr: l.strength, count: 1 });
      }
    });
    return Array.from(edgeMap.values());
  }, [links]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const step = 40;
    const majorStep = step * 4;
    for (let x = 0; x <= GRAPH_W + 200; x += step) {
      const isMajor = x % majorStep === 0;
      lines.push(
        <Line key={`gx-${x}`} x1={x} y1={-200} x2={x} y2={GRAPH_H + 200}
          stroke={isMajor ? gridMajor : gridColor} strokeWidth={isMajor ? 0.8 : 0.4} />,
      );
    }
    for (let y = 0; y <= GRAPH_H + 200; y += step) {
      const isMajor = y % majorStep === 0;
      lines.push(
        <Line key={`gy-${y}`} x1={-200} y1={y} x2={GRAPH_W + 200} y2={y}
          stroke={isMajor ? gridMajor : gridColor} strokeWidth={isMajor ? 0.8 : 0.4} />,
      );
    }
    return lines;
  }, [gridColor, gridMajor]);

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} {...panResponder.panHandlers}>
      <Svg width={GRAPH_W} height={GRAPH_H}>
        <G transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>

          {/* ── Blueprint grid ── */}
          {gridLines}

          {/* ── Edges (straight structural lines with endpoint dots) ── */}
          {renderEdges.map((edge, i) => {
            const src = simNodes.find(n => n.id === edge.src);
            const tgt = simNodes.find(n => n.id === edge.tgt);
            if (!src || !tgt) return null;

            const isConnected = !selectedId ||
              edge.src === selectedId || edge.tgt === selectedId;
            const normStr = edge.totalStr / maxStr;
            const strokeW = isConnected
              ? 1.2 + normStr * 2
              : 0.5;
            const opacity = isConnected ? 0.5 + normStr * 0.4 : 0.06;
            const color = edgePalette[i % edgePalette.length];
            const dimColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

            // Calculate connection points — edge of the rectangular cards
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const angle = Math.atan2(dy, dx);
            // Source exit point (edge of rect)
            const srcEx = Math.abs(Math.cos(angle)) * NODE_W / 2 > Math.abs(Math.sin(angle)) * NODE_H / 2
              ? { x: src.x + Math.sign(Math.cos(angle)) * NODE_W / 2, y: src.y + (Math.sign(Math.cos(angle)) * NODE_W / 2) * Math.tan(angle) }
              : { x: src.x + (Math.sign(Math.sin(angle)) * NODE_H / 2) / Math.tan(angle), y: src.y + Math.sign(Math.sin(angle)) * NODE_H / 2 };
            // Target entry point (edge of rect)
            const tgtEx = Math.abs(Math.cos(angle)) * NODE_W / 2 > Math.abs(Math.sin(angle)) * NODE_H / 2
              ? { x: tgt.x - Math.sign(Math.cos(angle)) * NODE_W / 2, y: tgt.y - (Math.sign(Math.cos(angle)) * NODE_W / 2) * Math.tan(angle) }
              : { x: tgt.x - (Math.sign(Math.sin(angle)) * NODE_H / 2) / Math.tan(angle), y: tgt.y - Math.sign(Math.sin(angle)) * NODE_H / 2 };

            const midX = (srcEx.x + tgtEx.x) / 2;
            const midY = (srcEx.y + tgtEx.y) / 2;

            return (
              <G key={`edge-${i}`}>
                {/* Main connector line */}
                <Line
                  x1={srcEx.x} y1={srcEx.y}
                  x2={tgtEx.x} y2={tgtEx.y}
                  stroke={isConnected ? color : dimColor}
                  strokeWidth={strokeW}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                />
                {/* Connection dots at endpoints */}
                {isConnected && (
                  <>
                    <Circle cx={srcEx.x} cy={srcEx.y} r={2.5}
                      fill={color} fillOpacity={opacity} />
                    <Circle cx={tgtEx.x} cy={tgtEx.y} r={2.5}
                      fill={color} fillOpacity={opacity} />
                  </>
                )}
                {/* Strength label on edge */}
                {isConnected && edge.totalStr > 2 && (
                  <>
                    <Rect
                      x={midX - 12} y={midY - 8}
                      width={24} height={16}
                      rx={4}
                      fill={isDark ? 'rgba(10,10,20,0.92)' : 'rgba(255,255,255,0.95)'}
                      stroke={isConnected ? color : 'transparent'}
                      strokeWidth={0.5}
                      strokeOpacity={0.4}
                    />
                    <SvgText
                      x={midX} y={midY + 4}
                      textAnchor="middle"
                      fontSize={8}
                      fontWeight="700"
                      fill={isConnected ? color : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')}
                    >
                      {edge.totalStr}
                    </SvgText>
                  </>
                )}
              </G>
            );
          })}

          {/* ── Nodes (rectangular blueprint cards) ── */}
          {simNodes.map(node => {
            const nodeType = node.type === 'memory' ? 'memory' : node.type === 'file' ? 'file' : 'answer';
            const colors = nc[nodeType];
            const isSelected = node.id === selectedId;
            const isDimmed = selectedId != null && !(connectedIds?.has(node.id));

            const typeLabel = nodeType === 'memory' ? 'MEM' : nodeType === 'file' ? 'FILE' : 'ANS';
            const x = node.x - NODE_W / 2;
            const y = node.y - NODE_H / 2;

            const cardBg = isDimmed
              ? (isDark ? 'rgba(20,20,30,0.4)' : 'rgba(240,240,250,0.5)')
              : (isDark ? 'rgba(15,15,25,0.92)' : 'rgba(255,255,255,0.96)');
            const borderClr = isDimmed
              ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
              : (isSelected ? colors.fill : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'));

            return (
              <G key={node.id}>
                {/* Selection highlight glow */}
                {isSelected && (
                  <Rect
                    x={x - 4} y={y - 4}
                    width={NODE_W + 8} height={NODE_H + 8}
                    rx={8}
                    fill="none" stroke={colors.fill}
                    strokeWidth={1.5} strokeOpacity={0.3}
                    strokeDasharray="4,3"
                  />
                )}

                {/* Card body */}
                <Rect
                  x={x} y={y}
                  width={NODE_W} height={NODE_H}
                  rx={6}
                  fill={cardBg}
                  stroke={borderClr}
                  strokeWidth={isSelected ? 1.5 : 0.8}
                />

                {/* Header bar (colored stripe at top) */}
                <Rect
                  x={x} y={y}
                  width={NODE_W} height={NODE_HEADER_H}
                  rx={6}
                  fill={isDimmed ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : colors.fill}
                  fillOpacity={isDimmed ? 0.3 : 0.85}
                />
                {/* Bottom half of header (square corners overlap) */}
                <Rect
                  x={x} y={y + 6}
                  width={NODE_W} height={NODE_HEADER_H - 6}
                  fill={isDimmed ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : colors.fill}
                  fillOpacity={isDimmed ? 0.3 : 0.85}
                />

                {/* Type label in header */}
                <SvgText
                  x={x + 8} y={y + NODE_HEADER_H - 4}
                  fontSize={7.5}
                  fontWeight="800"
                  letterSpacing={1}
                  fill={isDimmed
                    ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
                    : colors.text}
                >
                  {typeLabel}
                </SvgText>

                {/* Connection count badge in header */}
                <SvgText
                  x={x + NODE_W - 8} y={y + NODE_HEADER_H - 4}
                  textAnchor="end"
                  fontSize={7}
                  fontWeight="700"
                  fill={isDimmed
                    ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
                    : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.8)')}
                >
                  w:{node.val}
                </SvgText>

                {/* Node label in body area */}
                <SvgText
                  x={x + NODE_W / 2} y={y + NODE_HEADER_H + (NODE_H - NODE_HEADER_H) / 2 + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="600"
                  fill={isDimmed
                    ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)')
                    : colors.label}
                >
                  {truncLabel(node.label, 16)}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

/* ── Legend ───────────────────────────────────────────────────────────── */
function GraphLegend({ memCount, fileCount, linkCount, isDark, t }: {
  memCount: number; fileCount: number; linkCount: number; isDark: boolean; t: T;
}) {
  const nc = getNodeColors(isDark);
  return (
    <View style={[lgSt.wrap, { backgroundColor: (isDark ? 'rgba(10,10,15,0.9)' : 'rgba(255,255,255,0.92)'), borderColor: t.border.subtle }]}>
      {[
        { color: nc.memory.fill, letter: 'MEM', label: `${memCount} memories` },
        { color: nc.file.fill, letter: 'FILE', label: `${fileCount} files` },
        { color: isDark ? 'rgba(196,181,253,0.5)' : 'rgba(124,58,237,0.4)', letter: null, label: `${linkCount} links` },
      ].map((item, i) => (
        <View key={i} style={lgSt.item}>
          {item.letter ? (
            <View style={[lgSt.legendRect, { backgroundColor: isDark ? 'rgba(15,15,25,0.9)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}>
              <View style={[lgSt.legendRectHeader, { backgroundColor: item.color }]} />
              <Text style={lgSt.legendRectLetter}>{item.letter[0]}</Text>
            </View>
          ) : (
            <View style={[lgSt.legendLine, { backgroundColor: item.color }]} />
          )}
          <Text style={[lgSt.label, { color: t.text.muted }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
const lgSt = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 9,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendRect: { width: 20, height: 16, borderRadius: 3, borderWidth: 0.6, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  legendRectHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 7, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  legendRectLetter: { fontSize: 7, fontWeight: '800', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  legendLine: { width: 14, height: 2, borderRadius: 1 },
  label: { fontSize: 10, fontWeight: '600' },
});

/* ── Stats Bar ───────────────────────────────────────────────────────── */
function StatsBar({ nodes, links, isDark, t }: {
  nodes: SimNode[]; links: GraphLink[]; isDark: boolean; t: T;
}) {
  const totalStr = links.reduce((s, l) => s + l.strength, 0);
  const selfLoops = links.filter(l => l.source === l.target).length;
  const uniqueEdges = links.filter(l => l.source !== l.target).length;
  return (
    <View style={[sbSt.wrap, { borderColor: t.border.subtle, backgroundColor: isDark ? 'rgba(10,10,15,0.9)' : 'rgba(255,255,255,0.92)' }]}>
      {[
        { val: nodes.length, lbl: 'Nodes' },
        { val: uniqueEdges, lbl: 'Edges' },
        { val: selfLoops, lbl: 'Self' },
        { val: totalStr, lbl: 'Total W' },
      ].map(s => (
        <View key={s.lbl} style={sbSt.cell}>
          <Text style={[sbSt.val, { color: t.text.primary }]}>{s.val}</Text>
          <Text style={[sbSt.lbl, { color: t.text.muted }]}>{s.lbl}</Text>
        </View>
      ))}
    </View>
  );
}
const sbSt = StyleSheet.create({
  wrap: {
    flexDirection: 'row', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8, paddingHorizontal: 14, gap: 6,
  },
  cell: { flex: 1, alignItems: 'center' },
  val: { fontSize: 13, fontWeight: '800' },
  lbl: { fontSize: 8, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 },
});

/* ── Main Screen ─────────────────────────────────────────────────────── */
interface NeuralGraphScreenProps { onBack: () => void; }

export default function NeuralGraphScreen({ onBack }: NeuralGraphScreenProps) {
  const themeMode = useSelector((s: RootState) => s.theme.mode);
  const isDark = themeMode === 'dark';
  const t = getTokens(themeMode);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const graphFade = useRef(new Animated.Value(0)).current;

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setSelectedNode(null);
    setHasResult(false);
    graphFade.setValue(0);
    try {
      const res = await getGraph();
      const nodes = runForceSimulation(res.data.nodes, res.data.links, GRAPH_W, GRAPH_H);
      setSimNodes(nodes);
      setLinks(res.data.links);
      setHasResult(true);
      Animated.timing(graphFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Failed to load neural graph.');
    } finally {
      setLoading(false);
    }
  }, [graphFade]);

  const memCount = useMemo(() => simNodes.filter(n => n.type === 'memory').length, [simNodes]);
  const fileCount = useMemo(() => simNodes.filter(n => n.type === 'file').length, [simNodes]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background.screen }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.background.screen} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border.subtle }]}>
        <TouchableOpacity
          style={[styles.backBtn, {
            backgroundColor: t.background.elevated,
            ...Platform.select({
              ios: { shadowColor: t.shadow.card.color, shadowOffset: { width: 0, height: 1 }, shadowOpacity: t.shadow.card.opacity * 0.5, shadowRadius: 3 },
              android: { elevation: 2 },
            }),
          }]}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}>
          <Text style={[styles.backIcon, { color: t.text.primary }]}>{'<-'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text.primary }]}>Neural Graph</Text>
          <Text style={[styles.subtitle, { color: t.text.muted }]}>knowledge map</Text>
        </View>
        {hasResult && (
          <View style={[styles.badge, { backgroundColor: t.primary.default + '18' }]}>
            <View style={[styles.badgeDot, { backgroundColor: t.status.success }]} />
            <Text style={[styles.badgeText, { color: t.text.secondary }]}>
              {simNodes.length} nodes
            </Text>
          </View>
        )}
      </View>

      {/* Canvas */}
      <View style={[styles.canvas, { backgroundColor: t.background.screen }]}>
        {!hasResult ? (
          <View style={styles.emptyWrap}>
            {/* Blueprint diagram illustration */}
            <View style={{ width: 160, height: 110, marginBottom: 28 }}>
              <Svg width={160} height={110}>
                {/* Mini grid */}
                {[0, 40, 80, 120, 160].map(x => (
                  <Line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={110}
                    stroke={isDark ? 'rgba(100,120,180,0.08)' : 'rgba(80,100,160,0.06)'} strokeWidth={0.5} />
                ))}
                {[0, 40, 80].map(y => (
                  <Line key={`gy-${y}`} x1={0} y1={y} x2={160} y2={y}
                    stroke={isDark ? 'rgba(100,120,180,0.08)' : 'rgba(80,100,160,0.06)'} strokeWidth={0.5} />
                ))}
                {/* Demo connector lines */}
                <Line x1={55} y1={28} x2={105} y2={28} stroke={isDark ? 'rgba(196,181,253,0.4)' : 'rgba(124,58,237,0.3)'} strokeWidth={1.2} />
                <Line x1={55} y1={28} x2={80} y2={78} stroke={isDark ? 'rgba(244,114,182,0.4)' : 'rgba(219,39,119,0.3)'} strokeWidth={1.2} />
                <Line x1={130} y1={28} x2={105} y2={78} stroke={isDark ? 'rgba(110,231,183,0.4)' : 'rgba(5,150,105,0.3)'} strokeWidth={1.2} />
                {/* Node 1 — Memory card */}
                <Rect x={5} y={12} width={50} height={32} rx={4} fill={isDark ? 'rgba(15,15,25,0.9)' : '#fff'}
                  stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} strokeWidth={0.8} />
                <Rect x={5} y={12} width={50} height={12} rx={4} fill={isDark ? '#c084fc' : '#a855f7'} fillOpacity={0.85} />
                <Rect x={5} y={18} width={50} height={6} fill={isDark ? '#c084fc' : '#a855f7'} fillOpacity={0.85} />
                <SvgText x={10} y={21} fontSize={6} fontWeight="800" fill="#fff">MEM</SvgText>
                <SvgText x={30} y={38} textAnchor="middle" fontSize={7} fontWeight="600" fill={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}>node_a</SvgText>
                {/* Node 2 — File card */}
                <Rect x={105} y={12} width={50} height={32} rx={4} fill={isDark ? 'rgba(15,15,25,0.9)' : '#fff'}
                  stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} strokeWidth={0.8} />
                <Rect x={105} y={12} width={50} height={12} rx={4} fill={isDark ? '#fbbf24' : '#f59e0b'} fillOpacity={0.85} />
                <Rect x={105} y={18} width={50} height={6} fill={isDark ? '#fbbf24' : '#f59e0b'} fillOpacity={0.85} />
                <SvgText x={110} y={21} fontSize={6} fontWeight="800" fill={isDark ? '#1c1917' : '#fff'}>FILE</SvgText>
                <SvgText x={130} y={38} textAnchor="middle" fontSize={7} fontWeight="600" fill={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}>node_b</SvgText>
                {/* Node 3 — Answer card */}
                <Rect x={55} y={62} width={50} height={32} rx={4} fill={isDark ? 'rgba(15,15,25,0.9)' : '#fff'}
                  stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} strokeWidth={0.8} />
                <Rect x={55} y={62} width={50} height={12} rx={4} fill={isDark ? '#6ee7b7' : '#34d399'} fillOpacity={0.85} />
                <Rect x={55} y={68} width={50} height={6} fill={isDark ? '#6ee7b7' : '#34d399'} fillOpacity={0.85} />
                <SvgText x={60} y={71} fontSize={6} fontWeight="800" fill={isDark ? '#1c1917' : '#fff'}>ANS</SvgText>
                <SvgText x={80} y={88} textAnchor="middle" fontSize={7} fontWeight="600" fill={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}>node_c</SvgText>
                {/* Endpoint dots */}
                <Circle cx={55} cy={28} r={2} fill={isDark ? 'rgba(196,181,253,0.6)' : 'rgba(124,58,237,0.5)'} />
                <Circle cx={105} cy={28} r={2} fill={isDark ? 'rgba(196,181,253,0.6)' : 'rgba(124,58,237,0.5)'} />
                <Circle cx={80} cy={78} r={2} fill={isDark ? 'rgba(244,114,182,0.6)' : 'rgba(219,39,119,0.5)'} />
              </Svg>
            </View>
            <Text style={[styles.emptyTitle, { color: t.text.primary }]}>Neural Graph</Text>
            <Text style={[styles.emptyBody, { color: t.text.muted }]}>
              Search to visualise how your memories and files connect semantically. Tap any node to explore its connections.
            </Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: graphFade }}>
            <ForceGraph
              simNodes={simNodes}
              links={links}
              selectedId={selectedNode?.id ?? null}
              onNodeTap={setSelectedNode}
              onBgTap={() => setSelectedNode(null)}
              isDark={isDark}
            />
          </Animated.View>
        )}

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={[styles.loadingCard, { backgroundColor: t.background.screen, borderColor: t.border.default }]}>
              <ActivityIndicator size="large" color={t.primary.default} />
              <Text style={[styles.loadingText, { color: t.text.secondary }]}>
                Computing graph layout...
              </Text>
            </View>
          </View>
        )}

        {/* Legend (top) */}
        {hasResult && !selectedNode && (
          <View style={styles.legendPos} pointerEvents="none">
            <GraphLegend memCount={memCount} fileCount={fileCount}
              linkCount={links.filter(l => l.source !== l.target).length}
              isDark={isDark} t={t} />
          </View>
        )}

        {/* Stats bar (bottom) */}
        {hasResult && !selectedNode && (
          <View style={styles.statsPos} pointerEvents="none">
            <StatsBar nodes={simNodes} links={links} isDark={isDark} t={t} />
          </View>
        )}
      </View>

      {/* Node detail sheet */}
      {selectedNode && (
        <NodeSheet node={selectedNode} links={links}
          allNodes={simNodes} t={t} isDark={isDark}
          onClose={() => setSelectedNode(null)} />
      )}

      {/* FAB */}
      {!selectedNode && (
        <View style={styles.fabWrap}>
          {errorMsg !== '' && (
            <Text style={[styles.errorText, { color: t.status.error }]}>{errorMsg}</Text>
          )}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: t.primary.default, opacity: loading ? 0.6 : 1 }]}
            onPress={loadGraph} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <View style={styles.fabRow}>
                <ActivityIndicator color={t.text.onPrimary} size="small" />
                <Text style={[styles.fabText, { color: t.text.onPrimary }]}>Loading...</Text>
              </View>
            ) : (
              <Text style={[styles.fabText, { color: t.text.onPrimary }]}>
                {hasResult ? 'Refresh Graph' : 'Load Graph'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 10, letterSpacing: 0.8, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  canvas: { flex: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center', letterSpacing: -0.4 },
  emptyBody: { fontSize: 14, lineHeight: 22, textAlign: 'center' },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  loadingCard: {
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 30, alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 10,
  },
  loadingText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },

  legendPos: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center' },
  statsPos: { position: 'absolute', bottom: 6, left: 18, right: 18, alignItems: 'center' },

  fabWrap: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 6 },
  fab: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, paddingVertical: 16,
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  fabText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  fabRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorText: { fontSize: 13, marginBottom: 8, textAlign: 'center' },
});

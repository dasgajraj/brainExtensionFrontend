/**
 * NeuralGraphScreen — Semantic memory graph explorer
 *
 * Calls GET /brain/graph with a query body.
 * The API returns nodes (memories & files) and their semantic connection links.
 * This screen visualises the graph as an interactive node list with connection
 * strength indicators, allowing users to understand how their memories relate
 * to a given query.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { getTokens } from '../../theme/tokens';
import {
  getGraph, GraphRequest, GraphNode, GraphLink,
} from '../../api/brain.api';

type T = ReturnType<typeof getTokens>;

// ─── Mode options ─────────────────────────────────────────────────────────────
const MODES = ['study', 'explore', 'general', 'research', 'review'];
const LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];

// ─── Compute per-node link stats ──────────────────────────────────────────────
interface NodeStats { inbound: number; outbound: number; total: number; selfLoop: number; }
function computeNodeLinks(id: string, links: GraphLink[]): NodeStats {
  let inbound = 0, outbound = 0, selfLoop = 0;
  links.forEach(l => {
    if (l.source === id && l.target === id) { selfLoop += l.strength; return; }
    if (l.source === id) { outbound += l.strength; }
    if (l.target === id) { inbound += l.strength; }
  });
  return { inbound, outbound, selfLoop, total: inbound + outbound };
}

// ─── Strength ring ────────────────────────────────────────────────────────────
function StrengthRing({ value, max, color, t }: { value: number; max: number; color: string; t: T }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const filled = Math.round(pct * 10);
  return (
    <View style={ringStyles.wrap}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View
          key={i}
          style={[
            ringStyles.seg,
            { backgroundColor: i < filled ? color : t.border.subtle },
          ]}
        />
      ))}
      <Text style={[ringStyles.label, { color: t.text.muted }]}>{value}</Text>
    </View>
  );
}
const ringStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8 },
  seg: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 10, fontWeight: '700', marginLeft: 6 },
});

// ─── Node Card ────────────────────────────────────────────────────────────────
function NodeCard({ node, stats, maxStrength, index, t }: {
  node: GraphNode;
  stats: NodeStats;
  maxStrength: number;
  index: number;
  t: T;
}) {
  const [expanded, setExpanded] = useState(false);

  const isMemory = node.type === 'memory';
  const typeColor = isMemory ? t.primary.default : '#f59e0b';
  const typeBg = isMemory ? t.primary.default + '18' : '#f59e0b18';

  return (
    <TouchableOpacity
      style={[nodeStyles.card, { backgroundColor: t.background.surface, borderColor: t.border.default, borderLeftColor: typeColor }]}
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.87}>
      {/* ── Top row ── */}
      <View style={nodeStyles.topRow}>
        <View style={[nodeStyles.typeBadge, { backgroundColor: typeBg }]}>
          <Text style={[nodeStyles.typeText, { color: typeColor }]}>
            {isMemory ? 'Memory' : 'File'}
          </Text>
        </View>
        <View style={[nodeStyles.groupBadge, { backgroundColor: t.background.input }]}>
          <Text style={[nodeStyles.groupText, { color: t.text.muted }]}>{node.group}</Text>
        </View>
        <Text style={[nodeStyles.rankText, { color: t.text.muted }]}>#{index + 1}</Text>
        <Text style={[nodeStyles.chevron, { color: t.text.muted }]}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {/* ── Label ── */}
      <Text style={[nodeStyles.label, { color: t.text.primary }]} numberOfLines={expanded ? undefined : 2}>
        {node.label}
      </Text>

      {/* ── Connection strength bar ── */}
      <StrengthRing value={stats.total} max={maxStrength} color={typeColor} t={t} />

      {/* ── Expanded: connection breakdown + full text ── */}
      {expanded && (
        <>
          {/* Stats row */}
          <View style={[nodeStyles.statsRow, { borderTopColor: t.border.subtle }]}>
            <View style={nodeStyles.statItem}>
              <Text style={[nodeStyles.statVal, { color: t.primary.accent }]}>{stats.inbound}</Text>
              <Text style={[nodeStyles.statLabel, { color: t.text.muted }]}>Inbound</Text>
            </View>
            <View style={[nodeStyles.statDivider, { backgroundColor: t.border.subtle }]} />
            <View style={nodeStyles.statItem}>
              <Text style={[nodeStyles.statVal, { color: '#f59e0b' }]}>{stats.outbound}</Text>
              <Text style={[nodeStyles.statLabel, { color: t.text.muted }]}>Outbound</Text>
            </View>
            <View style={[nodeStyles.statDivider, { backgroundColor: t.border.subtle }]} />
            <View style={nodeStyles.statItem}>
              <Text style={[nodeStyles.statVal, { color: '#10b981' }]}>{stats.selfLoop}</Text>
              <Text style={[nodeStyles.statLabel, { color: t.text.muted }]}>Self-ref</Text>
            </View>
            <View style={[nodeStyles.statDivider, { backgroundColor: t.border.subtle }]} />
            <View style={nodeStyles.statItem}>
              <Text style={[nodeStyles.statVal, { color: t.text.secondary }]}>{node.val}</Text>
              <Text style={[nodeStyles.statLabel, { color: t.text.muted }]}>Weight</Text>
            </View>
          </View>

          {/* Full text preview */}
          <View style={[nodeStyles.fullTextWrap, { backgroundColor: t.background.input, borderColor: t.border.subtle }]}>
            <Text style={[nodeStyles.fullTextLabel, { color: t.primary.accent }]}>Content Preview</Text>
            <Text style={[nodeStyles.fullText, { color: t.text.secondary }]}>
              {node.fullText.length > 380 ? node.fullText.slice(0, 380) + '…' : node.fullText}
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}
const nodeStyles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, borderLeftWidth: 3,
    padding: 14, marginBottom: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  groupBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  groupText: { fontSize: 10, letterSpacing: 0.3 },
  rankText: { marginLeft: 'auto' as any, fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 10 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, marginTop: 14,
    paddingTop: 12, justifyContent: 'space-between', alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: 26 },
  fullTextWrap: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12 },
  fullTextLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.3,
    textTransform: 'uppercase', marginBottom: 8,
  },
  fullText: { fontSize: 12, lineHeight: 20 },
});

// ─── Chip selector ────────────────────────────────────────────────────────────
function ChipRow({ options, selected, onSelect, t }: {
  options: string[]; selected: string; onSelect: (v: string) => void; t: T;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}
      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[
            chipStyles.chip,
            selected === opt
              ? { backgroundColor: t.primary.default, borderColor: t.primary.default }
              : { backgroundColor: t.background.surface, borderColor: t.border.default },
          ]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.8}>
          <Text style={[chipStyles.label, { color: selected === opt ? t.text.onPrimary : t.text.secondary }]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const chipStyles = StyleSheet.create({
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  label: { fontSize: 13, fontWeight: '600' },
});

// ─── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ nodes, links, t }: { nodes: number; links: number; t: T }) {
  const memCount = nodes; // simplification — server returns totals
  return (
    <View style={[statBarStyles.wrap, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
      <View style={statBarStyles.item}>
        <Text style={[statBarStyles.val, { color: t.primary.accent }]}>{nodes}</Text>
        <Text style={[statBarStyles.lab, { color: t.text.muted }]}>Nodes</Text>
      </View>
      <View style={[statBarStyles.div, { backgroundColor: t.border.subtle }]} />
      <View style={statBarStyles.item}>
        <Text style={[statBarStyles.val, { color: '#10b981' }]}>{links}</Text>
        <Text style={[statBarStyles.lab, { color: t.text.muted }]}>Links</Text>
      </View>
      <View style={[statBarStyles.div, { backgroundColor: t.border.subtle }]} />
      <View style={statBarStyles.item}>
        <Text style={[statBarStyles.val, { color: '#f59e0b' }]}>
          {nodes > 0 ? (links / nodes).toFixed(1) : '—'}
        </Text>
        <Text style={[statBarStyles.lab, { color: t.text.muted }]}>Avg Links</Text>
      </View>
      <View style={[statBarStyles.div, { backgroundColor: t.border.subtle }]} />
      <View style={statBarStyles.item}>
        <Text style={[statBarStyles.val, { color: '#a78bfa' }]}>
          {nodes > 0 ? Math.round((memCount / nodes) * 100) : 0}%
        </Text>
        <Text style={[statBarStyles.lab, { color: t.text.muted }]}>Coverage</Text>
      </View>
    </View>
  );
}
const statBarStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1,
    padding: 16, marginBottom: 16, alignItems: 'center',
  },
  item: { flex: 1, alignItems: 'center' },
  val: { fontSize: 20, fontWeight: '800' },
  lab: { fontSize: 10, letterSpacing: 0.5, marginTop: 3 },
  div: { width: 1, height: 32 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
interface NeuralGraphScreenProps { onBack: () => void; }

export default function NeuralGraphScreen({ onBack }: NeuralGraphScreenProps) {
  const themeMode = useSelector((s: RootState) => s.theme.mode);
  const t = getTokens(themeMode);

  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('English');
  const [mode, setMode] = useState('study');
  const [workspaceId, setWorkspaceId] = useState('General');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [totalStats, setTotalStats] = useState({ totalNodes: 0, totalLinks: 0 });
  const [hasResult, setHasResult] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) { setErrorMsg('Enter a query to explore the neural graph.'); return; }
    setLoading(true);
    setErrorMsg('');
    setHasResult(false);
    try {
      const req: GraphRequest = {
        query: q,
        targetLanguage: language,
        mode,
        workspaceId: workspaceId.trim() || 'General',
      };
      const res = await getGraph(req);

      // Sort nodes by total connection strength descending
      const sorted = [...res.data.nodes].sort((a, b) => {
        const aStats = computeNodeLinks(a.id, res.data.links);
        const bStats = computeNodeLinks(b.id, res.data.links);
        return bStats.total - aStats.total;
      });

      setNodes(sorted);
      setLinks(res.data.links);
      setTotalStats(res.stats);
      setHasResult(true);

      // Fade in results
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Failed to load neural graph.');
    } finally {
      setLoading(false);
    }
  }, [query, language, mode, workspaceId, fadeAnim]);

  // Compute max connection strength for relative ring display
  const maxStrength = nodes.reduce((max, n) => {
    const s = computeNodeLinks(n.id, links);
    return Math.max(max, s.total);
  }, 1);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background.screen }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: t.border.subtle }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
          onPress={onBack} activeOpacity={0.8}>
          <Text style={[styles.backIcon, { color: t.text.primary }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text.primary }]}>Neural Graph</Text>
          <Text style={[styles.subtitle, { color: t.text.muted }]}>semantic memory explorer</Text>
        </View>
        {hasResult && (
          <View style={[styles.liveBadge, { backgroundColor: t.primary.default + '20', borderColor: t.primary.default + '50' }]}>
            <View style={[styles.liveDot, { backgroundColor: t.primary.accent }]} />
            <Text style={[styles.liveText, { color: t.primary.accent }]}>Live</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── What is Neural Graph ── */}
        <View style={[styles.explainCard, { backgroundColor: t.primary.default + '12', borderColor: t.primary.default + '35' }]}>
          <Text style={[styles.explainTitle, { color: t.primary.accent }]}>What is the Neural Graph?</Text>
          <Text style={[styles.explainBody, { color: t.text.secondary }]}>
            The Neural Graph maps semantic connections between your stored memories and files. Enter any query and the Brain OS finds all related nodes — memories you've saved, documents you've uploaded — and shows how strongly they connect to each other and your query.{'\n\n'}
            <Text style={{ fontWeight: '700', color: t.text.primary }}>Inbound links</Text>
            {' '}mean other memories reference this one.{' '}
            <Text style={{ fontWeight: '700', color: t.text.primary }}>Outbound links</Text>
            {' '}mean this memory references others.{' '}
            <Text style={{ fontWeight: '700', color: t.text.primary }}>Self-ref strength</Text>
            {' '}is how many times the brain reinforced this memory internally.
          </Text>
        </View>

        {/* ── Query input ── */}
        <Text style={[styles.label, { color: t.text.muted }]}>Query</Text>
        <View style={[styles.inputWrap, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <TextInput
            style={[styles.input, { color: t.text.primary }]}
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. What is inflation?"
            placeholderTextColor={t.text.placeholder}
            multiline
            returnKeyType="done"
          />
        </View>

        {/* ── Workspace ── */}
        <Text style={[styles.label, { color: t.text.muted }]}>Workspace ID</Text>
        <View style={[styles.inputWrap, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <TextInput
            style={[styles.input, { color: t.text.primary }]}
            value={workspaceId}
            onChangeText={setWorkspaceId}
            placeholder="e.g. Economics_101"
            placeholderTextColor={t.text.placeholder}
            autoCapitalize="none"
          />
        </View>

        {/* ── Mode chips ── */}
        <Text style={[styles.label, { color: t.text.muted }]}>Mode</Text>
        <ChipRow options={MODES} selected={mode} onSelect={setMode} t={t} />

        {/* ── Language chips ── */}
        <Text style={[styles.label, { color: t.text.muted, marginTop: 14 }]}>Target Language</Text>
        <ChipRow options={LANGUAGES} selected={language} onSelect={setLanguage} t={t} />

        {/* ── Error ── */}
        {errorMsg !== '' && (
          <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
            <Text style={[styles.errorText, { color: t.status.error }]}>⚠  {errorMsg}</Text>
          </View>
        )}

        {/* ── Search button ── */}
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: t.primary.default, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSearch}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={t.text.onPrimary} />
              <Text style={[styles.searchBtnText, { color: t.text.onPrimary, marginLeft: 10 }]}>Mapping connections…</Text>
            </View>
          ) : (
            <Text style={[styles.searchBtnText, { color: t.text.onPrimary }]}>Explore Neural Graph  →</Text>
          )}
        </TouchableOpacity>

        {/* ── Results ── */}
        {hasResult && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Stats bar */}
            <StatBar nodes={totalStats.totalNodes} links={totalStats.totalLinks} t={t} />

            {/* Section heading */}
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: t.text.primary }]}>
                Connected Nodes
              </Text>
              <View style={[styles.countBadge, { backgroundColor: t.primary.default + '20' }]}>
                <Text style={[styles.countText, { color: t.primary.accent }]}>{nodes.length}</Text>
              </View>
            </View>
            <Text style={[styles.sectionSub, { color: t.text.muted }]}>
              Sorted by total connection strength · tap to expand
            </Text>

            {/* Node cards */}
            {nodes.map((node, i) => (
              <NodeCard
                key={node.id}
                node={node}
                stats={computeNodeLinks(node.id, links)}
                maxStrength={maxStrength}
                index={i}
                t={t}
              />
            ))}
          </Animated.View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: 1, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 20, lineHeight: 22 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 10, letterSpacing: 0.8, marginTop: 1 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: '700' },

  scroll: { padding: 16 },

  // Explain card
  explainCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 22,
  },
  explainTitle: {
    fontSize: 13, fontWeight: '800', letterSpacing: 0.4, marginBottom: 10,
  },
  explainBody: { fontSize: 13, lineHeight: 22 },

  // Inputs
  label: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },
  inputWrap: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  input: { fontSize: 14, minHeight: 40 },

  // Error
  errorBox: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 14,
  },
  errorText: { fontSize: 13, lineHeight: 20 },

  // Button
  searchBtn: {
    borderRadius: 14, padding: 15, alignItems: 'center',
    marginTop: 20, marginBottom: 16,
  },
  searchBtnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  // Results section
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  countBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  countText: { fontSize: 12, fontWeight: '800' },
  sectionSub: { fontSize: 11, marginBottom: 14, letterSpacing: 0.2 },
});

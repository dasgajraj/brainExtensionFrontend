import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/RootReducer';
import { getTokens } from '../theme/tokens';
import { getBrainResult, BrainRequest } from '../api/brain.api';
import {
  getHistory,
  removeFromHistory,
  clearHistory,
  BrainHistoryItem,
} from '../services/brainHistory.service';

type T = ReturnType<typeof getTokens>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    }) + '  ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function processingDuration(created: string, updated: string): string {
  try {
    const ms = new Date(updated).getTime() - new Date(created).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  } catch {
    return '—';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScreenHeader({ onBack, t }: { onBack: () => void; t: T }) {
  return (
    <View style={[headerStyles.wrap, { borderBottomColor: t.border.subtle }]}>
      <TouchableOpacity
        style={[headerStyles.back, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
        onPress={onBack}
        activeOpacity={0.8}>
        <Text style={[headerStyles.backIcon, { color: t.text.primary }]}>←</Text>
      </TouchableOpacity>
      <View style={headerStyles.mid}>
        <Text style={[headerStyles.title, { color: t.text.primary }]}>Brain Result</Text>
        <Text style={[headerStyles.sub, { color: t.text.muted }]}>Fetch by Request ID</Text>
      </View>
      <View style={headerStyles.back} />
    </View>
  );
}
const headerStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  backIcon: { fontSize: 20, lineHeight: 22 },
  mid: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 11, marginTop: 1 },
});

function SectionLabel({ text, t }: { text: string; t: T }) {
  return (
    <Text style={[{ color: t.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 }]}>
      {text}
    </Text>
  );
}

function MetaRow({ label, value, valueColor, mono, t }: {
  label: string; value: string; valueColor?: string; mono?: boolean; t: T;
}) {
  return (
    <View style={[metaRowStyles.row, { borderBottomColor: t.border.subtle }]}>
      <Text style={[metaRowStyles.label, { color: t.text.muted }]}>{label}</Text>
      <Text
        style={[metaRowStyles.value, { color: valueColor ?? t.text.primary, fontFamily: mono ? 'monospace' : undefined }]}
        numberOfLines={mono ? 3 : 1}
        ellipsizeMode="middle"
        selectable>
        {value}
      </Text>
    </View>
  );
}
const metaRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1 },
  label: { fontSize: 13, flex: 1 },
  value: { fontSize: 13, fontWeight: '600', flex: 1.6, textAlign: 'right' },
});

function ConfidenceBar({ value, t }: { value: number; t: T }) {
  const pct = Math.min(Math.max(value, 0), 1);
  const color = pct >= 0.7 ? t.status.success : pct >= 0.4 ? '#f59e0b' : t.status.error;
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={[confStyles.label, { justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', marginBottom: 6 }]}>
        <Text style={[confStyles.labelText, { color: t.text.muted }]}>Router Confidence</Text>
        <Text style={[confStyles.pct, { color }]}>{(pct * 100).toFixed(0)}%</Text>
      </View>
      <View style={[confStyles.track, { backgroundColor: t.border.subtle }]}>
        <View style={[confStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const confStyles = StyleSheet.create({
  label: {},
  labelText: { fontSize: 13 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  pct: { fontSize: 13, fontWeight: '700' },
});

function StatusBadge({ status, t }: { status: string; t: T }) {
  const isDone = status === 'done';
  const isPending = status === 'pending' || status === 'processing';
  const bg = isDone ? t.status.successSubtle : isPending ? t.primary.default + '1A' : t.status.errorSubtle;
  const border = isDone ? t.status.success : isPending ? t.primary.default : t.status.error;
  const textColor = isDone ? t.status.success : isPending ? t.primary.accent : t.status.error;
  const icon = isDone ? '✓' : isPending ? '⏳' : '✗';
  return (
    <View style={[badge.wrap, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[badge.text, { color: textColor }]}>{icon}  {status.toUpperCase()}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start' },
  text: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
});

// ─── History Row ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function HistoryRow({
  item,
  isActive,
  onPress,
  onDelete,
  t,
}: {
  item: BrainHistoryItem;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
  t: T;
}) {
  const modeColor: Record<string, string> = {
    study: t.status.success,
    creative: '#a78bfa',
    default: t.text.muted,
  };
  return (
    <TouchableOpacity
      style={[
        histStyles.row,
        {
          backgroundColor: isActive ? t.primary.default + '18' : t.background.surface,
          borderColor: isActive ? t.primary.default : t.border.default,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}>
      {/* Left accent bar */}
      <View style={[histStyles.accent, { backgroundColor: isActive ? t.primary.default : t.border.subtle }]} />

      <View style={histStyles.body}>
        {/* Query preview */}
        <Text style={[histStyles.queryText, { color: t.text.primary }]} numberOfLines={2}>
          {item.query}
        </Text>

        {/* Meta row */}
        <View style={histStyles.metaRow}>
          {/* Lobe badge */}
          <View style={[histStyles.lobeBadge, { backgroundColor: t.primary.default + '1A' }]}>
            <Text style={[histStyles.lobeBadgeText, { color: t.primary.accent }]}>🧠 {item.selectedLobe}</Text>
          </View>
          {/* Mode badge */}
          <View style={[histStyles.modeBadge, { backgroundColor: (modeColor[item.mode] ?? t.text.muted) + '22' }]}>
            <Text style={[histStyles.modeBadgeText, { color: modeColor[item.mode] ?? t.text.muted }]}>{item.mode}</Text>
          </View>
          <Text style={[histStyles.time, { color: t.text.muted }]}>{timeAgo(item.askedAt)}</Text>
        </View>

        {/* Request ID */}
        <Text style={[histStyles.reqId, { color: t.text.muted }]} numberOfLines={1}>
          #{item.requestId}
        </Text>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={[histStyles.deleteBtn, { backgroundColor: t.status.errorSubtle }]}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}>
        <Text style={[histStyles.deleteIcon, { color: t.status.error }]}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const histStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accent: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  queryText: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  lobeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  lobeBadgeText: { fontSize: 10, fontWeight: '700' },
  modeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  modeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  time: { fontSize: 10, marginLeft: 'auto' },
  reqId: { fontSize: 10, fontFamily: 'monospace' },
  deleteBtn: { borderRadius: 8, padding: 8, margin: 10 },
  deleteIcon: { fontSize: 12, fontWeight: '700' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

interface BrainResultScreenProps {
  onBack: () => void;
  /** Optional — pre-fill the ID (e.g. passed from BrainAskScreen) */
  prefillId?: string;
}

export default function BrainResultScreen({ onBack, prefillId }: BrainResultScreenProps) {
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const t = getTokens(themeMode);

  const [requestId, setRequestId] = useState(prefillId ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrainRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ── History state ───────────────────────────────────────────────────────
  const [history, setHistory] = useState<BrainHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    console.log('📚 [BrainResultScreen] loadHistory — reading @brain_ask_history from AsyncStorage');
    const items = await getHistory();
    console.log(`✅ [BrainResultScreen] loadHistory — loaded ${items.length} item(s)`);
    setHistory(items);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleDeleteHistoryItem = async (id: string) => {
    console.log('🗑️ [BrainResultScreen] handleDeleteHistoryItem — removing id:', id);
    const updated = await removeFromHistory(id);
    setHistory(updated);
    // clear result panel if it matched the deleted item
    if (requestId === id) {
      setRequestId('');
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleClearAllHistory = () => {
    console.log('🧹 [BrainResultScreen] handleClearAllHistory — user triggered clear all');
    Alert.alert(
      'Clear History',
      'Remove all saved Brain Ask questions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
          },
        },
      ],
    );
  };

  const handleSelectHistory = (item: BrainHistoryItem) => {
    console.log('📌 [BrainResultScreen] handleSelectHistory — prefilling id from history', { requestId: item.requestId, query: item.query.slice(0, 60) });
    setRequestId(item.requestId);
    setResult(null);
    setErrorMsg('');
  };

  const handleFetch = async () => {
    console.log('📊 [BrainResultScreen] handleFetch — GET /brain/result/:id', { requestId });
    const id = requestId.trim();
    if (!id) {
      setErrorMsg('Please enter a Request ID.');
      return;
    }
    setLoading(true);
    setResult(null);
    setErrorMsg('');
    try {
      const res = await getBrainResult(id);
      console.log('✅ [BrainResultScreen] handleFetch — success', { status: res.request.status, lobe: res.request.selectedLobe });
      setResult(res.request);
    } catch (err: any) {
      console.error('❌ [BrainResultScreen] handleFetch — error', err);
      setErrorMsg(err?.message ?? 'Failed to fetch result. Check the Request ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    console.log('[BrainResultScreen] handleClear — clearing result and input');
    setRequestId('');
    setResult(null);
    setErrorMsg('');
  };

  const duration = result ? processingDuration(result.createdAt, result.updatedAt) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background.screen }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />
      <ScreenHeader onBack={onBack} t={t} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ══ HISTORY ══ */}
        {history.length > 0 && (
          <>
            <View style={styles.histSectionHeader}>
              <Text style={[styles.histSectionTitle, { color: t.text.primary }]}>Saved Questions</Text>
              <TouchableOpacity onPress={handleClearAllHistory} activeOpacity={0.7}>
                <Text style={[styles.histClearAll, { color: t.status.error }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {history.map(item => (
              <HistoryRow
                key={item.requestId}
                item={item}
                isActive={requestId === item.requestId}
                onPress={() => handleSelectHistory(item)}
                onDelete={() => handleDeleteHistoryItem(item.requestId)}
                t={t}
              />
            ))}
          </>
        )}

        {/* ── Request ID Input ── */}
        <SectionLabel text="Request ID" t={t} />
        <View style={[styles.inputRow, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <Text style={[styles.hashIcon, { color: t.text.muted }]}>#</Text>
          <TextInput
            style={[styles.idInput, { color: t.text.primary }]}
            value={requestId}
            onChangeText={v => { setRequestId(v); setErrorMsg(''); }}
            placeholder="e.g. 69283596f087338a7e26098d"
            placeholderTextColor={t.text.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleFetch}
          />
          {requestId.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.clearIcon, { color: t.text.muted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Hint ── */}
        <Text style={[styles.hint, { color: t.text.muted }]}>
          Enter the Request ID returned from POST /brain/ask
        </Text>

        {/* ── Fetch Button ── */}
        <TouchableOpacity
          style={[styles.fetchBtn, { backgroundColor: t.primary.default, opacity: loading ? 0.7 : 1 }]}
          onPress={handleFetch}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color={t.text.onPrimary} />
          ) : (
            <Text style={[styles.fetchBtnText, { color: t.text.onPrimary }]}>🔍  Fetch Result</Text>
          )}
        </TouchableOpacity>

        {/* ── Error ── */}
        {errorMsg !== '' && (
          <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
            <Text style={[styles.errorText, { color: t.status.error }]}>⚠  {errorMsg}</Text>
          </View>
        )}

        {/* ══ RESULT ══ */}
        {result && (
          <>
            {/* ── Status + Duration ── */}
            <SectionLabel text="Status" t={t} />
            <View style={[styles.statusRow]}>
              <StatusBadge status={result.status} t={t} />
              {duration && (
                <View style={[styles.durationBadge, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
                  <Text style={[styles.durationIcon]}>⚡</Text>
                  <Text style={[styles.durationText, { color: t.text.secondary }]}>{duration}</Text>
                </View>
              )}
            </View>

            {/* ── IDs ── */}
            <SectionLabel text="Identifiers" t={t} />
            <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
              <MetaRow label="Request ID" value={result._id} mono t={t} />
              <MetaRow label="User ID" value={result.userId} mono t={t} />
            </View>

            {/* ── Query ── */}
            <SectionLabel text="Query" t={t} />
            <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
              <View style={styles.queryWrap}>
                <Text style={[styles.queryLabel, { color: t.text.muted }]}>Input</Text>
                <Text style={[styles.queryText, { color: t.text.primary }]} selectable>
                  {result.query}
                </Text>
              </View>
            </View>

            {/* ── Routing ── */}
            <SectionLabel text="Brain Routing" t={t} />
            <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
              <MetaRow label="Input Type" value={result.inputType} t={t} />
              <MetaRow label="Requested Lobe" value={result.lobe} t={t} />
              <MetaRow
                label="Selected Lobe"
                value={result.selectedLobe}
                valueColor={t.primary.accent}
                t={t}
              />
              <View style={[metaRowStyles.row, { borderBottomColor: t.border.subtle }]}>
                <Text style={[metaRowStyles.label, { color: t.text.muted }]}>Router Reason</Text>
                <Text style={[styles.routerReason, { color: t.text.secondary }]} numberOfLines={3}>
                  {result.routerReason}
                </Text>
              </View>
              <View style={{ paddingVertical: 12 }}>
                <ConfidenceBar value={result.routerConfidence} t={t} />
              </View>
            </View>

            {/* ── Metadata ── */}
            <SectionLabel text="Request Metadata" t={t} />
            <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
              <MetaRow label="Mode" value={result.mode} t={t} />
              <MetaRow label="Target Language" value={result.targetLanguage} t={t} />
              <MetaRow label="Workspace" value={result.workspaceId} t={t} />
              <MetaRow label="Created" value={formatDateTime(result.createdAt)} t={t} />
              <MetaRow label="Updated" value={formatDateTime(result.updatedAt)} t={t} />
            </View>

            {/* ── Output ── */}
            {result.output && result.status === 'done' && (
              <>
                <SectionLabel text="Brain Response" t={t} />
                <View style={[styles.outputCard, { backgroundColor: t.background.surface, borderColor: t.primary.default + '40' }]}>
                  {/* lobe chip */}
                  <View style={styles.lobeRow}>
                    <View style={[styles.lobeBadge, { backgroundColor: t.primary.default + '1A', borderColor: t.primary.default + '50' }]}>
                      <Text style={[styles.lobeBadgeText, { color: t.primary.accent }]}>
                        🧠 {result.selectedLobe} lobe
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.outputText, { color: t.text.primary }]} selectable>
                    {result.output}
                  </Text>
                </View>
              </>
            )}

            {/* ── Error output ── */}
            {result.error && (
              <>
                <SectionLabel text="Processing Error" t={t} />
                <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
                  <Text style={[styles.errorText, { color: t.status.error }]}>{result.error}</Text>
                </View>
              </>
            )}

            {/* ── Re-fetch ── */}
            <TouchableOpacity
              style={[styles.refetchBtn, { borderColor: t.border.default }]}
              onPress={handleFetch}
              activeOpacity={0.8}>
              <Text style={[styles.refetchText, { color: t.primary.accent }]}>↻  Refresh Result</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 2,
    gap: 8,
  },
  hashIcon: { fontSize: 18, fontWeight: '700' },
  idInput: { flex: 1, fontSize: 14, paddingVertical: 12, fontFamily: 'monospace' },
  clearIcon: { fontSize: 16, paddingHorizontal: 4 },

  hint: { fontSize: 11, marginTop: 6, marginBottom: 4, marginLeft: 4 },

  // Fetch button
  fetchBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 20, justifyContent: 'center', flexDirection: 'row' },
  fetchBtnText: { fontSize: 16, fontWeight: '700' },

  // Error
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16 },
  errorText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },

  // Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, gap: 5 },
  durationIcon: { fontSize: 13 },
  durationText: { fontSize: 13, fontWeight: '600' },

  // Cards
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginBottom: 4 },

  // Query
  queryWrap: { paddingVertical: 14 },
  queryLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  queryText: { fontSize: 15, lineHeight: 23, fontWeight: '500' },

  // Router
  routerReason: { fontSize: 12, flex: 1.6, textAlign: 'right', lineHeight: 17 },

  // Output
  outputCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  lobeRow: { marginBottom: 12 },
  lobeBadge: { alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  lobeBadgeText: { fontSize: 12, fontWeight: '700' },
  outputText: { fontSize: 14, lineHeight: 23 },

  // Refetch
  refetchBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 16, flexDirection: 'row', justifyContent: 'center' },
  refetchText: { fontSize: 14, fontWeight: '600' },

  // History section
  histSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 16 },
  histSectionTitle: { fontSize: 17, fontWeight: '700' },
  histClearAll: { fontSize: 13, fontWeight: '600' },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { getTokens } from '../../theme/tokens';
import { getBrainResult, BrainRequest } from '../../api/brain.api';
import {
  getHistory,
  removeFromHistory,
  clearHistory,
  BrainHistoryItem,
} from '../../services/brainHistory.service';
import { MarkdownText } from '../../utils/markdownRenderer';
import { IconX, IconBrain } from '../../components/ui/Icons';

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
        style={[
          headerStyles.back,
          {
            backgroundColor: t.background.elevated,
            ...Platform.select({
              ios: { shadowColor: t.shadow.card.color, shadowOffset: { width: 0, height: 1 }, shadowOpacity: t.shadow.card.opacity * 0.5, shadowRadius: 3 },
              android: { elevation: 2 },
            }),
          },
        ]}
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.75}>
        <Text style={[headerStyles.backIcon, { color: t.text.primary }]}>←</Text>
      </TouchableOpacity>
      <View style={headerStyles.mid}>
        <Text style={[headerStyles.title, { color: t.text.primary }]}>Brain Result</Text>
        <Text style={[headerStyles.sub, { color: t.text.muted }]}>Fetch by Request ID</Text>
      </View>
      <View style={headerStyles.spacer} />
    </View>
  );
}
const headerStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  spacer: { width: 40, height: 40 },
  backIcon: { fontSize: 20, lineHeight: 22 },
  mid: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sub: { fontSize: 11, marginTop: 2, letterSpacing: 0.2 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 13, flex: 1, letterSpacing: 0.1 },
  value: { fontSize: 13, fontWeight: '600', flex: 1.6, textAlign: 'right', letterSpacing: -0.1 },
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
  const icon = isDone ? 'DONE' : isPending ? 'WAIT' : 'FAIL';
  return (
    <View style={[badge.wrap, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[badge.text, { color: textColor }]}>{icon}  {status.toUpperCase()}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 7, alignSelf: 'flex-start' },
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
            <Text style={[histStyles.lobeBadgeText, { color: t.primary.accent }]}>{item.selectedLobe}</Text>
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
        <IconX size={14} color={t.status.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const histStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accent: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  queryText: { fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  lobeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  lobeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  modeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  modeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  time: { fontSize: 10, marginLeft: 'auto', letterSpacing: 0.2 },
  reqId: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.3 },
  deleteBtn: { borderRadius: 10, padding: 9, margin: 10 },
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
  const [showAllHistory, setShowAllHistory] = useState(false);

  // ── History state ───────────────────────────────────────────────────────
  const [history, setHistory] = useState<BrainHistoryItem[]>([]);

  // ── Auto-poll when result is still processing ───────────────────────────
  const autoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPollCountRef = useRef(0);
  const AUTO_POLL_INTERVAL_MS = 20_000; // 20 s
  const AUTO_POLL_MAX = 5;              // max 5 auto-polls per result

  const stopAutoPoll = useCallback(() => {
    if (autoPollRef.current) {
      clearInterval(autoPollRef.current);
      autoPollRef.current = null;
    }
  }, []);

  // Start auto-polling whenever a result comes back as "processing"
  useEffect(() => {
    stopAutoPoll();
    if (result?.status !== 'processing') return;
    autoPollCountRef.current = 0;
    console.log('⏳ [BrainResultScreen] result is processing — starting auto-poll every 20 s (max 5)');
    autoPollRef.current = setInterval(async () => {
      autoPollCountRef.current += 1;
      if (autoPollCountRef.current > AUTO_POLL_MAX) {
        console.warn('⏰ [BrainResultScreen] auto-poll max reached, stopping');
        stopAutoPoll();
        return;
      }
      const id = requestId.trim();
      if (!id) { stopAutoPoll(); return; }
      console.log(`🔃 [BrainResultScreen] auto-poll #${autoPollCountRef.current}/${AUTO_POLL_MAX} — id=${id}`);
      try {
        const res = await getBrainResult(id);
        if (res.request.status !== 'processing') {
          console.log(`🏁 [BrainResultScreen] auto-poll — terminal status: ${res.request.status}`);
          stopAutoPoll();
        }
        setResult(res.request);
      } catch (e) {
        console.warn('⚠️ [BrainResultScreen] auto-poll error (silent)', e);
      }
    }, AUTO_POLL_INTERVAL_MS);
    return stopAutoPoll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.status]);

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
    console.log('📌 [BrainResultScreen] handleSelectHistory — fetching id from history', { requestId: item.requestId, query: item.query.slice(0, 60) });
    setRequestId(item.requestId);
    setResult(null);
    setErrorMsg('');
    fetchById(item.requestId);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchById = useCallback(async (id: string) => {
    const trimmedId = id.trim();
    if (!trimmedId) return;
    console.log('📊 [BrainResultScreen] fetchById — GET /brain/result/:id', { id: trimmedId });
    stopAutoPoll();
    setLoading(true);
    setResult(null);
    setErrorMsg('');
    try {
      const res = await getBrainResult(trimmedId);
      console.log('✅ [BrainResultScreen] fetchById — success', { status: res.request.status, lobe: res.request.selectedLobe });
      setResult(res.request);
    } catch (err: any) {
      console.error('❌ [BrainResultScreen] fetchById — error', err);
      setErrorMsg(err?.message ?? 'Failed to fetch result. Check the Request ID.');
    } finally {
      setLoading(false);
    }
  }, [stopAutoPoll]);

  // Auto-fetch when navigated from BrainAskScreen with a prefillId
  useEffect(() => {
    if (prefillId) {
      console.log('🚀 [BrainResultScreen] prefillId auto-fetch —', prefillId);
      fetchById(prefillId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetch = () => fetchById(requestId);

  const handleClear = () => {
    console.log('🧹 [BrainResultScreen] handleClear — clearing result and input');
    stopAutoPoll();
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

        {/* ── Compact Search Bar (TOP) ── */}
        <View style={[styles.searchBar, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <Text style={[styles.hashIcon, { color: t.text.muted }]}>#</Text>
          <TextInput
            style={[styles.idInput, { color: t.text.primary }]}
            value={requestId}
            onChangeText={v => { setRequestId(v); setErrorMsg(''); }}
            placeholder="Paste Request ID…"
            placeholderTextColor={t.text.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleFetch}
          />
          {loading ? (
            <ActivityIndicator size="small" color={t.primary.accent} />
          ) : requestId.length > 0 ? (
            <TouchableOpacity
              style={[styles.searchGoBtn, { backgroundColor: t.primary.default }]}
              onPress={handleFetch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}>
              <Text style={[styles.searchGoBtnText, { color: t.text.onPrimary }]}>Go</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Error ── */}
        {errorMsg !== '' && (
          <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
            <Text style={[styles.errorText, { color: t.status.error }]}>{errorMsg}</Text>
          </View>
        )}

        {/* ── History section (max 2 by default, show more toggle) ── */}
        {history.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <View style={[styles.histSectionHeader]}>
              <Text style={[styles.histSectionTitle, { color: t.text.primary }]}>Recent Questions</Text>
              {history.length > 2 && (
                <TouchableOpacity onPress={() => setShowAllHistory(p => !p)} activeOpacity={0.7}>
                  <Text style={[styles.histClearAll, { color: t.primary.accent }]}>
                    {showAllHistory ? 'Show less' : `+${history.length - 2} more`}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleClearAllHistory} activeOpacity={0.7} style={{ marginLeft: 12 }}>
                <Text style={[styles.histClearAll, { color: t.status.error }]}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {(showAllHistory ? history : history.slice(0, 2)).map(item => (
              <HistoryRow
                key={item.requestId}
                item={item}
                isActive={item.requestId === requestId}
                onPress={() => handleSelectHistory(item)}
                onDelete={() => handleDeleteHistoryItem(item.requestId)}
                t={t}
              />
            ))}
          </View>
        )}

        {/* ── Empty state ── */}
        {!result && !loading && history.length === 0 && errorMsg === '' && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { color: t.text.muted }]}>[ ]</Text>
            <Text style={[styles.emptyTitle, { color: t.text.primary }]}>No result yet</Text>
            <Text style={[styles.emptyHint, { color: t.text.muted }]}>
              Paste a Request ID above, or go to Brain Ask to send a new question.
            </Text>
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
                  <Text style={[styles.durationIcon, { color: t.text.muted }]}>+</Text>
                  <Text style={[styles.durationText, { color: t.text.secondary }]}>{duration}</Text>
                </View>
              )}
            </View>

            {/* ── Context Chips ── */}
            <View style={styles.contextChipsRow}>
              {result.workspaceId ? (
                <View style={[styles.contextChip, { backgroundColor: t.primary.default + '18', borderColor: t.primary.default + '50' }]}>
                  <Text style={[styles.contextChipLabel, { color: t.text.muted }]}>workspace</Text>
                  <Text style={[styles.contextChipValue, { color: t.primary.accent }]}>{result.workspaceId}</Text>
                </View>
              ) : null}
              {result.mode ? (
                <View style={[styles.contextChip, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
                  <Text style={[styles.contextChipLabel, { color: t.text.muted }]}>mode</Text>
                  <Text style={[styles.contextChipValue, { color: t.text.primary }]}>{result.mode}</Text>
                </View>
              ) : null}
              <View style={[styles.contextChip, { backgroundColor: t.primary.default + '18', borderColor: t.primary.default + '50' }]}>
                <Text style={[styles.contextChipLabel, { color: t.text.muted }]}>lobe</Text>
                <Text style={[styles.contextChipValue, { color: t.primary.accent }]}>{result.selectedLobe}</Text>
              </View>
            </View>

            {/* ── IDs ── */}
            <SectionLabel text="Request ID" t={t} />
            <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
              <MetaRow label="Request ID" value={result._id} mono t={t} />
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
              <View style={[styles.routerReasonWrap, { borderBottomColor: t.border.subtle }]}>
                <Text style={[metaRowStyles.label, { color: t.text.muted }]}>Router Reason</Text>
                <View style={[styles.routerReasonChip, { backgroundColor: t.background.screen, borderColor: t.border.default }]}>
                  <Text style={[styles.routerReasonText, { color: t.text.secondary }]}>
                    {result.routerReason}
                  </Text>
                </View>
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
                  <View style={styles.outputCardHeader}>
                    <View style={[styles.lobeBadge, { backgroundColor: t.primary.default + '1A', borderColor: t.primary.default + '50' }]}>
                      <Text style={[styles.lobeBadgeText, { color: t.primary.accent }]}>
                        {result.selectedLobe} lobe
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.copyBtn, { borderColor: t.border.default, backgroundColor: t.background.screen }]}
                      onPress={() => {
                        Clipboard.setString(result.output ?? '');
                        Alert.alert('Copied', 'Response copied to clipboard.');
                      }}
                      activeOpacity={0.7}>
                      <Text style={[styles.copyBtnText, { color: t.text.muted }]}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                  <MarkdownText content={result.output} t={t} fontSize={15} lineHeight={26} />
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
  scroll: { paddingHorizontal: 18, paddingBottom: 36 },

  // Search bar (compact)
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    marginBottom: 14,
  },
  hashIcon: { fontSize: 18, fontWeight: '700' },
  idInput: { flex: 1, fontSize: 14, paddingVertical: 12, fontFamily: 'monospace' },
  searchGoBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  searchGoBtnText: { fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 28 },
  emptyIcon: { fontSize: 44, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, letterSpacing: -0.3 },
  emptyHint: { fontSize: 14, lineHeight: 22, textAlign: 'center' },

  // Error
  errorBox: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 14 },
  errorText: { fontSize: 13, lineHeight: 20, fontWeight: '500' },

  // Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 7, gap: 6 },
  durationIcon: { fontSize: 13 },
  durationText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },

  // Cards
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, marginBottom: 4 },

  // Query
  queryWrap: { paddingVertical: 16 },
  queryLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 },
  queryText: { fontSize: 15, lineHeight: 24, fontWeight: '500' },

  // Context chips
  contextChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, marginBottom: 14 },
  contextChip: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 92 },
  contextChipLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  contextChipValue: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize', letterSpacing: -0.1 },

  // Router reason
  routerReasonWrap: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  routerReasonChip: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  routerReasonText: { fontSize: 13, lineHeight: 21 },

  // Output
  outputCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 18, marginBottom: 4 },
  outputCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  lobeBadge: { alignSelf: 'flex-start', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 5 },
  lobeBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  outputText: { fontSize: 15, lineHeight: 26 },
  copyBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  copyBtnText: { fontSize: 12, fontWeight: '600' },

  // Refetch
  refetchBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 18, flexDirection: 'row', justifyContent: 'center' },
  refetchText: { fontSize: 14, fontWeight: '600' },

  // History section
  histSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 18 },
  histSectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  histClearAll: { fontSize: 13, fontWeight: '600' },
});

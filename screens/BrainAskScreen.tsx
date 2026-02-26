import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import {
  askBrain,
  getBrainResult,
  BrainAskResponse,
  BrainRequest,
} from '../api/brain.api';

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi', 'Gujarati'];
const MODES = ['default', 'study', 'creative'];
const MODE_ICONS: Record<string, string> = { default: '⚙️', study: '📚', creative: '✨' };
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

type Step = 'form' | 'submitted' | 'done' | 'error';
type T = ReturnType<typeof getTokens>;

interface BrainAskScreenProps {
  onBack: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScreenHeader({ title, onBack, t }: { title: string; onBack: () => void; t: T }) {
  return (
    <View style={[hdrStyles.wrap, { borderBottomColor: t.border.subtle }]}>
      <TouchableOpacity
        style={[hdrStyles.back, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
        onPress={onBack}
        activeOpacity={0.8}>
        <Text style={[hdrStyles.backIcon, { color: t.text.primary }]}>←</Text>
      </TouchableOpacity>
      <Text style={[hdrStyles.title, { color: t.text.primary }]}>{title}</Text>
      <View style={hdrStyles.back} />
    </View>
  );
}
const hdrStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  backIcon: { fontSize: 20, lineHeight: 22 },
  title: { fontSize: 17, fontWeight: '700' },
});

function SectionLabel({ text, t }: { text: string; t: T }) {
  return (
    <Text style={[{ color: t.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 }]}>
      {text}
    </Text>
  );
}

function Field({ label, children, t }: { label: string; children: React.ReactNode; t: T }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[fieldStyles.label, { color: t.text.secondary }]}>{label}</Text>
      {children}
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
});

function InfoChip({ label, value, color, t }: { label: string; value: string | number; color?: string; t: T }) {
  return (
    <View style={[chipStyles.wrap, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
      <Text style={[chipStyles.label, { color: t.text.muted }]}>{label}</Text>
      <Text style={[chipStyles.value, { color: color ?? t.text.primary }]}>{value}</Text>
    </View>
  );
}
const chipStyles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, margin: 4, alignItems: 'center', minWidth: 80 },
  label: { fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
});

function ConfidenceBar({ value, t }: { value: number; t: T }) {
  const pct = Math.min(Math.max(value, 0), 1);
  const color = pct >= 0.7 ? t.status.success : pct >= 0.4 ? '#f59e0b' : t.status.error;
  return (
    <View style={{ marginVertical: 4 }}>
      <View style={[confStyles.track, { backgroundColor: t.border.subtle }]}>
        <View style={[confStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[confStyles.pct, { color }]}>{(pct * 100).toFixed(0)}% confidence</Text>
    </View>
  );
}
const confStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  pct: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'right' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BrainAskScreen({ onBack }: BrainAskScreenProps) {
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const t = getTokens(themeMode);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [mode, setMode] = useState<string>('study');
  const [workspaceId, setWorkspaceId] = useState('General');

  // ── Flow state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('form');
  const [isAsking, setIsAsking] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [askResponse, setAskResponse] = useState<BrainAskResponse | null>(null);
  const [result, setResult] = useState<BrainRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Submit ask ─────────────────────────────────────────────────────────────
  const handleAsk = async () => {
    if (!query.trim()) {
      Alert.alert('Empty Query', 'Please enter a question before submitting.');
      return;
    }
    setIsAsking(true);
    setErrorMsg('');
    setAskResponse(null);
    setResult(null);
    try {
      const res = await askBrain({
        query: query.trim(),
        targetLanguage,
        mode,
        workspaceId: workspaceId.trim() || 'General',
      });
      setAskResponse(res);
      setStep('submitted');
      startPolling(res.requestId);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to send request. Please try again.');
      setStep('error');
    } finally {
      setIsAsking(false);
    }
  };

  // ── Auto-poll result ───────────────────────────────────────────────────────
  const startPolling = (requestId: string) => {
    pollCountRef.current = 0;
    stopPolling();
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        stopPolling();
        setErrorMsg('Result is taking too long. Try fetching manually.');
        return;
      }
      try {
        const res = await getBrainResult(requestId);
        if (res.request.status === 'done' || res.request.status === 'failed') {
          stopPolling();
          setResult(res.request);
          setStep(res.request.status === 'done' ? 'done' : 'error');
          if (res.request.status === 'failed') {
            setErrorMsg(res.request.error ?? 'Processing failed.');
          }
        }
      } catch (_) {
        // silent — keep polling
      }
    }, POLL_INTERVAL_MS);
  };

  // ── Manual re-fetch ────────────────────────────────────────────────────────
  const handleFetchResult = async () => {
    if (!askResponse?.requestId) return;
    setIsFetching(true);
    try {
      const res = await getBrainResult(askResponse.requestId);
      setResult(res.request);
      if (res.request.status === 'done') {
        stopPolling();
        setStep('done');
      } else if (res.request.status === 'failed') {
        stopPolling();
        setErrorMsg(res.request.error ?? 'Processing failed.');
        setStep('error');
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to fetch result.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setStep('form');
    setAskResponse(null);
    setResult(null);
    setErrorMsg('');
    setQuery('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background.screen }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />
      <ScreenHeader title="Ask Brain" onBack={onBack} t={t} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ═══ FORM SECTION ═══ */}
        <SectionLabel text="Query" t={t} />
        <Field label="Your Question" t={t}>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: t.background.input,
              borderColor: step === 'form' ? t.border.default : t.border.subtle,
              color: t.text.primary,
            }]}
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. What is inflation?"
            placeholderTextColor={t.text.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={step === 'form'}
          />
        </Field>

        <Field label="Workspace / Lobe ID" t={t}>
          <TextInput
            style={[styles.input, {
              backgroundColor: t.background.input,
              borderColor: t.border.default,
              color: t.text.primary,
            }]}
            value={workspaceId}
            onChangeText={setWorkspaceId}
            placeholder="e.g. Economics_101 or General"
            placeholderTextColor={t.text.placeholder}
            editable={step === 'form'}
          />
        </Field>

        <SectionLabel text="Mode" t={t} />
        <View style={styles.pillRow}>
          {MODES.map(m => {
            const selected = mode === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.pill, {
                  backgroundColor: selected ? t.primary.default : t.background.input,
                  borderColor: selected ? t.primary.default : t.border.default,
                }]}
                onPress={() => step === 'form' && setMode(m)}
                activeOpacity={0.8}>
                <Text style={styles.pillIcon}>{MODE_ICONS[m]}</Text>
                <Text style={[styles.pillText, { color: selected ? t.text.onPrimary : t.text.secondary }]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionLabel text="Target Language" t={t} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll} contentContainerStyle={styles.langContent}>
          {LANGUAGES.map(lang => {
            const selected = targetLanguage === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.langPill, {
                  backgroundColor: selected ? t.primary.default : t.background.input,
                  borderColor: selected ? t.primary.default : t.border.default,
                }]}
                onPress={() => step === 'form' && setTargetLanguage(lang)}
                activeOpacity={0.8}>
                <Text style={[styles.langText, { color: selected ? t.text.onPrimary : t.text.secondary }]}>{lang}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Submit Button ── */}
        {step === 'form' && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: t.primary.default, opacity: isAsking ? 0.7 : 1 }]}
            onPress={handleAsk}
            disabled={isAsking}
            activeOpacity={0.8}>
            {isAsking ? (
              <ActivityIndicator color={t.text.onPrimary} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: t.text.onPrimary }]}>🧠  Ask Brain</Text>
            )}
          </TouchableOpacity>
        )}

        {/* ═══ INITIAL RESPONSE ═══ */}
        {askResponse && (
          <>
            <SectionLabel text="Request Accepted" t={t} />
            <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
              {/* Request ID row */}
              <View style={[styles.idRow, { backgroundColor: t.background.input, borderColor: t.border.subtle }]}>
                <Text style={[styles.idLabel, { color: t.text.muted }]}>Request ID</Text>
                <Text style={[styles.idValue, { color: t.primary.accent }]} selectable>{askResponse.requestId}</Text>
              </View>

              <View style={styles.chipGrid}>
                <InfoChip label="Selected Lobe" value={askResponse.selectedLobe} color={t.primary.accent} t={t} />
                <InfoChip label="Mode" value={askResponse.mode} t={t} />
              </View>
              <View style={styles.chipGrid}>
                <InfoChip label="Status" value={askResponse.status} color={t.status.success} t={t} />
                <InfoChip label="Message" value={askResponse.message} t={t} />
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={[styles.reasonLabel, { color: t.text.muted }]}>Router Reason</Text>
                <Text style={[styles.reasonText, { color: t.text.secondary }]}>{askResponse.routerReason}</Text>
              </View>
              <ConfidenceBar value={askResponse.confidence} t={t} />
            </View>

            {/* Polling indicator */}
            {step === 'submitted' && (
              <View style={[styles.pollingRow, { backgroundColor: t.primary.default + '15', borderColor: t.border.default }]}>
                <ActivityIndicator color={t.primary.accent} size="small" style={{ marginRight: 10 }} />
                <Text style={[styles.pollingText, { color: t.text.secondary }]}>Processing your query…  auto-fetching result</Text>
              </View>
            )}

            {/* Manual fetch button */}
            {(step === 'submitted' || step === 'done') && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: t.border.default }]}
                onPress={handleFetchResult}
                disabled={isFetching}
                activeOpacity={0.8}>
                {isFetching ? (
                  <ActivityIndicator color={t.primary.accent} size="small" />
                ) : (
                  <Text style={[styles.secondaryBtnText, { color: t.primary.accent }]}>↻  Fetch Result Now</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ═══ FULL RESULT ═══ */}
        {result && (
          <>
            <SectionLabel text="Brain Output" t={t} />
            <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
              {/* Status badge */}
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, {
                  backgroundColor: result.status === 'done' ? t.status.successSubtle : t.status.errorSubtle,
                  borderColor: result.status === 'done' ? t.status.success : t.status.error,
                }]}>
                  <Text style={{ color: result.status === 'done' ? t.status.success : t.status.error, fontSize: 12, fontWeight: '700' }}>
                    {result.status === 'done' ? '✓ Done' : '✗ Failed'}
                  </Text>
                </View>
                <Text style={[styles.timestampText, { color: t.text.muted }]}>
                  {new Date(result.updatedAt).toLocaleTimeString()}
                </Text>
              </View>

              {/* Metadata chips */}
              <View style={styles.chipGrid}>
                <InfoChip label="Selected Lobe" value={result.selectedLobe} color={t.primary.accent} t={t} />
                <InfoChip label="Confidence" value={`${(result.routerConfidence * 100).toFixed(0)}%`} t={t} />
              </View>
              <View style={styles.chipGrid}>
                <InfoChip label="Input Type" value={result.inputType} t={t} />
                <InfoChip label="Language" value={result.targetLanguage} t={t} />
              </View>

              {/* Router reason */}
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.reasonLabel, { color: t.text.muted }]}>Router Reason</Text>
                <Text style={[styles.reasonText, { color: t.text.secondary }]}>{result.routerReason}</Text>
              </View>

              {/* Output text */}
              {result.output ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.reasonLabel, { color: t.text.muted }]}>Response</Text>
                  <View style={[styles.outputBox, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
                    <Text style={[styles.outputText, { color: t.text.primary }]} selectable>
                      {result.output}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Error */}
              {result.error ? (
                <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
                  <Text style={[styles.errorText, { color: t.status.error }]}>{result.error}</Text>
                </View>
              ) : null}

              {/* IDs for reference */}
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.reasonLabel, { color: t.text.muted }]}>Request ID</Text>
                <Text style={[styles.monoText, { color: t.text.muted }]} selectable>{result._id}</Text>
                <Text style={[styles.reasonLabel, { color: t.text.muted, marginTop: 8 }]}>Workspace</Text>
                <Text style={[styles.monoText, { color: t.text.secondary }]}>{result.workspaceId}</Text>
              </View>
            </View>
          </>
        )}

        {/* ═══ ERROR STATE ═══ */}
        {step === 'error' && !result && (
          <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error, marginTop: 16 }]}>
            <Text style={[styles.errorText, { color: t.status.error }]}>⚠  {errorMsg}</Text>
          </View>
        )}

        {/* ── New Query Button ── */}
        {(step === 'done' || step === 'error') && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: t.primary.default, marginTop: 10 }]}
            onPress={handleReset}
            activeOpacity={0.8}>
            <Text style={[styles.primaryBtnText, { color: t.text.onPrimary }]}>+ Ask New Question</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  // Inputs
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 110,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  // Pills
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  pillIcon: { fontSize: 15 },
  pillText: { fontSize: 13, fontWeight: '600' },

  // Language pills
  langScroll: { marginBottom: 4 },
  langContent: { paddingBottom: 4, gap: 8, flexDirection: 'row' },
  langPill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  langText: { fontSize: 13, fontWeight: '500' },

  // Buttons
  primaryBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '700' },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },

  // Cards
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  idRow: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12 },
  idLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  idValue: { fontSize: 13, fontFamily: 'monospace', letterSpacing: 0.3 },

  // Chips
  chipGrid: { flexDirection: 'row', marginHorizontal: -4, marginVertical: 2 },
  reasonLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  reasonText: { fontSize: 13, lineHeight: 19 },

  // Output
  outputBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 4 },
  outputText: { fontSize: 14, lineHeight: 22 },
  monoText: { fontSize: 12, fontFamily: 'monospace' },

  // Polling
  pollingRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  pollingText: { fontSize: 13, flex: 1 },

  // Status
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  timestampText: { fontSize: 11 },

  // Error
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 4 },
  errorText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
});

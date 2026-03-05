import React, { useState, useEffect, useCallback } from 'react';
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
import { translateBrain, BrainTranslateResponse } from '../../api/brain.api';
import {
  addTranslateResult,
  getTranslateHistory,
  clearTranslateHistory,
  TranslateHistoryItem,
} from '../../services/translateHistory.service';
import { MarkdownText } from '../../utils/markdownRenderer';
import { IconAlertTriangle } from '../../components/ui/Icons';

type T = ReturnType<typeof getTokens>;

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  'Hinglish', 'Hindi', 'Tamil', 'Telugu', 'Kannada',
  'Bengali', 'Marathi', 'Gujarati', 'Punjabi',
  'French', 'Spanish', 'German', 'Japanese', 'Arabic', 'English',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) { return 'just now'; }
    if (mins < 60) { return `${mins}m ago`; }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) { return `${hrs}h ago`; }
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScreenHeader({ onBack, t }: { onBack: () => void; t: T }) {
  return (
    <View style={[hdrStyles.wrap, { borderBottomColor: t.border.subtle }]}>
      <TouchableOpacity
        style={[
          hdrStyles.back,
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
        <Text style={[hdrStyles.backIcon, { color: t.text.primary }]}>←</Text>
      </TouchableOpacity>
      <Text style={[hdrStyles.title, { color: t.text.primary }]}>Translate</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}
const hdrStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  backIcon: { fontSize: 20, lineHeight: 22 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
});

function SectionLabel({ text, t }: { text: string; t: T }) {
  return (
    <Text style={{ color: t.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 }}>
      {text}
    </Text>
  );
}

function HistoryCard({ item, onPress, t }: { item: TranslateHistoryItem; onPress: () => void; t: T }) {
  return (
    <TouchableOpacity
      style={[hcStyles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={hcStyles.langRow}>
        <Text style={[hcStyles.autoText, { color: t.text.muted }]}>Auto</Text>
        <Text style={[hcStyles.arrow, { color: t.primary.accent }]}>→</Text>
        <View style={[hcStyles.langBadge, { backgroundColor: t.primary.default + '18', borderColor: t.primary.default + '50' }]}>
          <Text style={[hcStyles.langBadgeText, { color: t.primary.accent }]}>{item.targetLanguage}</Text>
        </View>
        <Text style={[hcStyles.time, { color: t.text.muted }]}>{timeAgo(item.translatedAt)}</Text>
      </View>
      <Text style={[hcStyles.sourcePreview, { color: t.text.secondary }]} numberOfLines={1}>
        {item.sourceText}
      </Text>
      <Text style={[hcStyles.translationPreview, { color: t.text.primary }]} numberOfLines={2}>
        {item.translation.replace(/[*`#>]/g, '').trim()}
      </Text>
    </TouchableOpacity>
  );
}
const hcStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 10 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  autoText: { fontSize: 12, fontWeight: '600' },
  arrow: { fontSize: 14, fontWeight: '700' },
  langBadge: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 3 },
  langBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  time: { fontSize: 11, marginLeft: 'auto', letterSpacing: 0.2 },
  sourcePreview: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  translationPreview: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface TranslateScreenProps {
  onBack: () => void;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function TranslateScreen({ onBack }: TranslateScreenProps) {
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const t = getTokens(themeMode);

  const [sourceText, setSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Hinglish');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrainTranslateResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<TranslateHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    const items = await getTranslateHistory();
    setHistory(items);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleTranslate = async () => {
    const text = sourceText.trim();
    if (!text) { setErrorMsg('Please enter some text to translate.'); return; }
    setLoading(true);
    setResult(null);
    setErrorMsg('');
    try {
      const res = await translateBrain({ text, targetLanguage });
      setResult(res);
      await addTranslateResult({
        sourceText: text,
        translation: res.translation,
        targetLanguage: res.targetLanguage,
        translatedAt: new Date().toISOString(),
      });
      loadHistory();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSourceText('');
    setResult(null);
    setErrorMsg('');
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Remove all visible translation history? (All results remain in permanent archive.)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearTranslateHistory();
            setHistory([]);
          },
        },
      ],
    );
  };

  const handleRestoreFromHistory = (item: TranslateHistoryItem) => {
    setSourceText(item.sourceText);
    setTargetLanguage(item.targetLanguage);
    setResult({
      status: 'done',
      translation: item.translation,
      sourceText: item.sourceText,
      targetLanguage: item.targetLanguage,
    });
    setErrorMsg('');
  };

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

        {/* ── Source Text ── */}
        <SectionLabel text="Text to Translate" t={t} />
        <View style={[styles.textAreaWrap, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <TextInput
            style={[styles.textArea, { color: t.text.primary }]}
            value={sourceText}
            onChangeText={(v) => { setSourceText(v); setErrorMsg(''); }}
            placeholder="Enter text you want to translate…"
            placeholderTextColor={t.text.placeholder}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          {sourceText.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={[styles.clearBtnText, { color: t.text.muted }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.charCount, { color: t.text.muted }]}>{sourceText.length} chars</Text>

        {/* ── Target Language ── */}
        <SectionLabel text="Target Language" t={t} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langRow}>
          {LANGUAGES.map(lang => {
            const active = lang === targetLanguage;
            return (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langChip,
                  {
                    backgroundColor: active ? t.primary.default : t.background.surface,
                    borderColor: active ? t.primary.default : t.border.default,
                  },
                ]}
                onPress={() => setTargetLanguage(lang)}
                activeOpacity={0.8}>
                <Text style={[styles.langChipText, { color: active ? t.text.onPrimary : t.text.secondary }]}>
                  {lang}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Error ── */}
        {errorMsg !== '' && (
          <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <IconAlertTriangle size={16} color={t.status.error} />
            <Text style={[styles.errorText, { color: t.status.error, flex: 1 }]}>{errorMsg}</Text>
          </View>
        )}

        {/* ── Translate Button ── */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: t.primary.default, opacity: loading ? 0.7 : 1 }]}
          onPress={handleTranslate}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color={t.text.onPrimary} />
          ) : (
            <Text style={[styles.actionBtnText, { color: t.text.onPrimary }]}>Translate</Text>
          )}
        </TouchableOpacity>

        {/* ══ RESULT ══ */}
        {result && (
          <>
            {/* ── Language Pair ── */}
            <View style={styles.langPairRow}>
              <View style={[styles.langPairChip, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
                <Text style={[styles.langPairLabel, { color: t.text.muted }]}>From</Text>
                <Text style={[styles.langPairValue, { color: t.text.primary }]}>Auto</Text>
              </View>
              <Text style={[styles.langArrow, { color: t.primary.accent }]}>→</Text>
              <View style={[styles.langPairChip, { backgroundColor: t.primary.default + '18', borderColor: t.primary.default + '60' }]}>
                <Text style={[styles.langPairLabel, { color: t.text.muted }]}>To</Text>
                <Text style={[styles.langPairValue, { color: t.primary.accent }]}>{result.targetLanguage}</Text>
              </View>
            </View>

            {/* ── Source Card ── */}
            <SectionLabel text="Original" t={t} />
            <View style={[styles.resultCard, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
              <Text style={[styles.resultText, { color: t.text.secondary }]} selectable>
                {result.sourceText}
              </Text>
            </View>

            {/* ── Translation Card ── */}
            <SectionLabel text="Translation" t={t} />
            <View style={[styles.resultCard, { backgroundColor: t.background.surface, borderColor: t.primary.default + '50' }]}>
              <View style={styles.resultCardHeader}>
                <View style={[styles.langTag, { backgroundColor: t.primary.default + '18', borderColor: t.primary.default + '50' }]}>
                  <Text style={[styles.langTagText, { color: t.primary.accent }]}>{result.targetLanguage}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, { borderColor: t.border.default, backgroundColor: t.background.screen }]}
                  onPress={() => {
                    Clipboard.setString(result.translation);
                    Alert.alert('Copied', 'Translation copied to clipboard.');
                  }}
                  activeOpacity={0.7}>
                  <Text style={[styles.copyBtnText, { color: t.text.muted }]}>Copy</Text>
                </TouchableOpacity>
              </View>
              <MarkdownText content={result.translation} t={t} fontSize={15} lineHeight={26} />
            </View>

            {/* ── Translate Again ── */}
            <TouchableOpacity
              style={[styles.againBtn, { borderColor: t.border.default }]}
              onPress={handleTranslate}
              activeOpacity={0.8}>
              <Text style={[styles.againBtnText, { color: t.primary.accent }]}>↻  Translate Again</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ══ PAST RESULTS (bottom) ══ */}
        {history.length > 0 && (
          <>
            <View style={styles.histHeader}>
              <TouchableOpacity
                onPress={() => setShowHistory(v => !v)}
                style={styles.histTitleRow}
                activeOpacity={0.8}>
                <Text style={[styles.histTitle, { color: t.text.primary }]}>Past Results</Text>
                <View style={[styles.histCountBadge, { backgroundColor: t.primary.default + '20' }]}>
                  <Text style={[styles.histCount, { color: t.primary.accent }]}>{history.length}</Text>
                </View>
                <Text style={[styles.histToggle, { color: t.text.muted }]}>{showHistory ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.7}>
                <Text style={[styles.clearHistBtn, { color: t.status.error }]}>Clear</Text>
              </TouchableOpacity>
            </View>

            {showHistory && (showAllHistory ? history : history.slice(0, 2)).map(item => (
              <HistoryCard
                key={item.id}
                item={item}
                onPress={() => handleRestoreFromHistory(item)}
                t={t}
              />
            ))}

            {showHistory && history.length > 2 && (
              <TouchableOpacity
                style={[styles.seeMoreBtn, { borderColor: t.border.default }]}
                onPress={() => setShowAllHistory(v => !v)}
                activeOpacity={0.75}>
                <Text style={[styles.seeMoreText, { color: t.primary.accent }]}>
                  {showAllHistory ? 'Show less' : `See more (${history.length - 2} more)`}
                </Text>
              </TouchableOpacity>
            )}
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

  // Past results header
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 },
  histTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  histTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  histCountBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  histCount: { fontSize: 12, fontWeight: '700' },
  histToggle: { fontSize: 12 },
  clearHistBtn: { fontSize: 13, fontWeight: '600' },

  // Text area
  textAreaWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 16 },
  textArea: { fontSize: 15, lineHeight: 24, minHeight: 120 },
  clearBtn: { alignSelf: 'flex-end', marginTop: 8 },
  clearBtnText: { fontSize: 12, fontWeight: '600' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 7, marginRight: 2, letterSpacing: 0.2 },

  // Language chips
  langRow: { paddingRight: 18, gap: 10, paddingVertical: 4 },
  langChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9 },
  langChipText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },

  // Error
  errorBox: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginTop: 18 },
  errorText: { fontSize: 13, lineHeight: 20, fontWeight: '500' },

  // Action button
  actionBtn: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 22, justifyContent: 'center', flexDirection: 'row' },
  actionBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  // Lang pair row
  langPairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 26, marginBottom: 4 },
  langPairChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', minWidth: 84 },
  langPairLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  langPairValue: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  langArrow: { fontSize: 20, fontWeight: '700' },

  // Result cards
  resultCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 18, marginBottom: 4 },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  resultText: { fontSize: 14, lineHeight: 23 },
  langTag: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 5 },
  langTagText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  copyBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  copyBtnText: { fontSize: 12, fontWeight: '600' },

  // Again button
  againBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  againBtnText: { fontSize: 14, fontWeight: '600' },

  // See more
  seeMoreBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  seeMoreText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
});

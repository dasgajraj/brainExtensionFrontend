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
        style={[hdrStyles.back, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
        onPress={onBack}
        activeOpacity={0.8}>
        <Text style={[hdrStyles.backIcon, { color: t.text.primary }]}>←</Text>
      </TouchableOpacity>
      <Text style={[hdrStyles.title, { color: t.text.primary }]}>Translate</Text>
      <View style={{ width: 38 }} />
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
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  autoText: { fontSize: 12, fontWeight: '600' },
  arrow: { fontSize: 14, fontWeight: '700' },
  langBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  langBadgeText: { fontSize: 12, fontWeight: '700' },
  time: { fontSize: 11, marginLeft: 'auto' },
  sourcePreview: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  translationPreview: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
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

  const handleTranslate = async () => {
    const text = sourceText.trim();
    if (!text) { setErrorMsg('Please enter some text to translate.'); return; }
    console.log('🌐 [TranslateScreen] handleTranslate →', { textLen: text.length, targetLanguage });
    setLoading(true);
    setResult(null);
    setErrorMsg('');
    try {
      const res = await translateBrain({ text, targetLanguage });
      console.log('✅ [TranslateScreen] handleTranslate ← success', { targetLanguage: res.targetLanguage });
      setResult(res);
    } catch (err: any) {
      console.error('❌ [TranslateScreen] handleTranslate ← error', err);
      setErrorMsg(err?.message ?? 'Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSourceText('');
    setResult(null);
    setErrorMsg('');
    console.log('🧹 [TranslateScreen] cleared');
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
              <Text style={[styles.clearBtnText, { color: t.text.muted }]}>✕ Clear</Text>
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
          <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
            <Text style={[styles.errorText, { color: t.status.error }]}>⚠  {errorMsg}</Text>
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
            <Text style={[styles.actionBtnText, { color: t.text.onPrimary }]}>🌐  Translate</Text>
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
                  <Text style={[styles.langTagText, { color: t.primary.accent }]}>🌐 {result.targetLanguage}</Text>
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
              <Text style={[styles.translationText, { color: t.text.primary }]} selectable>
                {result.translation}
              </Text>
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

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  // Text area
  textAreaWrap: { borderWidth: 1, borderRadius: 16, padding: 14 },
  textArea: { fontSize: 15, lineHeight: 23, minHeight: 120 },
  clearBtn: { alignSelf: 'flex-end', marginTop: 8 },
  clearBtnText: { fontSize: 12, fontWeight: '600' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6, marginRight: 2 },

  // Language chips
  langRow: { paddingRight: 16, gap: 8, paddingVertical: 4 },
  langChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  langChipText: { fontSize: 13, fontWeight: '600' },

  // Error
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16 },
  errorText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },

  // Action button
  actionBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 20, justifyContent: 'center', flexDirection: 'row' },
  actionBtnText: { fontSize: 16, fontWeight: '700' },

  // Lang pair row
  langPairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, marginBottom: 4 },
  langPairChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', minWidth: 80 },
  langPairLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  langPairValue: { fontSize: 14, fontWeight: '700' },
  langArrow: { fontSize: 20, fontWeight: '700' },

  // Result cards
  resultCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultText: { fontSize: 14, lineHeight: 22 },
  translationText: { fontSize: 16, lineHeight: 26 },
  langTag: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  langTagText: { fontSize: 12, fontWeight: '700' },
  copyBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  copyBtnText: { fontSize: 12, fontWeight: '600' },

  // Again button
  againBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  againBtnText: { fontSize: 14, fontWeight: '600' },
});

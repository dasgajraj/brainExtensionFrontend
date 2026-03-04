import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Clipboard,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { RootState } from '../../redux/RootReducer';
import { getTokens } from '../../theme/tokens';
import { analyzeVision, BrainVisionResponse } from '../../api/brain.api';
import {
  addVisionResult,
  getVisionHistory,
  clearVisionHistory,
  VisionHistoryItem,
} from '../../services/visionHistory.service';
import { MarkdownText } from '../../utils/markdownRenderer';
import { IconAlertTriangle } from '../../components/ui/Icons';

type T = ReturnType<typeof getTokens>;

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
      <Text style={[hdrStyles.title, { color: t.text.primary }]}>Brain Vision</Text>
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

function HistoryCard({ item, onPress, t }: { item: VisionHistoryItem; onPress: () => void; t: T }) {
  return (
    <TouchableOpacity
      style={[hcStyles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={hcStyles.topRow}>
        <View style={[hcStyles.wsBadge, { backgroundColor: t.primary.default + '18', borderColor: t.primary.default + '50' }]}>
          <Text style={[hcStyles.wsText, { color: t.primary.accent }]}>{item.workspaceId}</Text>
        </View>
        <Text style={[hcStyles.time, { color: t.text.muted }]}>{timeAgo(item.analyzedAt)}</Text>
      </View>
      <Text style={[hcStyles.preview, { color: t.text.secondary }]} numberOfLines={2}>
        {(item.explanation ?? '').replace(/[*`#>]/g, '').trim()}
      </Text>
    </TouchableOpacity>
  );
}
const hcStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  wsBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  wsText: { fontSize: 12, fontWeight: '700' },
  time: { fontSize: 11 },
  preview: { fontSize: 13, lineHeight: 19 },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface VisionScreenProps {
  onBack: () => void;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function VisionScreen({ onBack }: VisionScreenProps) {
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const t = getTokens(themeMode);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [workspaceId, setWorkspaceId] = useState('General');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrainVisionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<VisionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    const items = await getVisionHistory();
    setHistory(items);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Image pickers ─────────────────────────────────────────────────────────

  const pickFromGallery = () => {
    launchImageLibrary(
      { mediaType: 'photo', includeBase64: true, quality: 0.8, maxWidth: 1024, maxHeight: 1024 },
      (response) => {
        if (response.didCancel) { return; }
        if (response.errorCode) { setErrorMsg(response.errorMessage ?? 'Failed to open gallery.'); return; }
        const asset = response.assets?.[0];
        if (asset?.base64 && asset.uri) {
          setImageUri(asset.uri);
          setImageBase64(asset.base64);
          setImageMime(asset.type ?? 'image/jpeg');
          setResult(null);
          setErrorMsg('');
        }
      },
    );
  };

  const pickFromCamera = () => {
    launchCamera(
      { mediaType: 'photo', includeBase64: true, quality: 0.8, maxWidth: 1024, maxHeight: 1024, saveToPhotos: false },
      (response) => {
        if (response.didCancel) { return; }
        if (response.errorCode) { setErrorMsg(response.errorMessage ?? 'Failed to open camera.'); return; }
        const asset = response.assets?.[0];
        if (asset?.base64 && asset.uri) {
          setImageUri(asset.uri);
          setImageBase64(asset.base64);
          setImageMime(asset.type ?? 'image/jpeg');
          setResult(null);
          setErrorMsg('');
        }
      },
    );
  };

  // ── Analyze ───────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!imageBase64) { setErrorMsg('Please select an image first.'); return; }
    const ws = workspaceId.trim() || 'General';
    const dataUri = `data:${imageMime};base64,${imageBase64}`;
    setLoading(true);
    setResult(null);
    setErrorMsg('');
    try {
      const res = await analyzeVision({ image: dataUri, workspaceId: ws });
      setResult(res);
      await addVisionResult({
        workspaceId: ws,
        explanation: res.explanation,
        analyzedAt: new Date().toISOString(),
      });
      loadHistory();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Vision analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImageUri(null);
    setImageBase64(null);
    setResult(null);
    setErrorMsg('');
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Remove all visible vision history? (All results remain in permanent archive.)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearVisionHistory();
            setHistory([]);
          },
        },
      ],
    );
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

        {/* ── Pick Image ── */}
        <SectionLabel text="Image" t={t} />

        {imageUri ? (
          /* ── Thumbnail ── */
          <View style={[styles.thumbWrap, { borderColor: t.primary.default + '50', backgroundColor: t.background.surface }]}>
            <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.thumbOverlay}>
              <TouchableOpacity
                style={[styles.changeBtn, { backgroundColor: t.background.screen + 'CC', borderColor: t.border.default }]}
                onPress={() => Alert.alert('Change Image', 'Select source', [
                  { text: 'Gallery', onPress: pickFromGallery },
                  { text: 'Camera', onPress: pickFromCamera },
                  { text: 'Clear', style: 'destructive', onPress: handleClear },
                  { text: 'Cancel', style: 'cancel' },
                ])}
                activeOpacity={0.8}>
                <Text style={[styles.changeBtnText, { color: t.text.primary }]}>Change Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── Pick Buttons ── */
          <View style={styles.pickRow}>
            <TouchableOpacity
              style={[styles.pickBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
              onPress={pickFromGallery}
              activeOpacity={0.8}>
              <Text style={[styles.pickBtnText, { color: t.text.primary }]}>Gallery</Text>
              <Text style={[styles.pickBtnSub, { color: t.text.muted }]}>Choose from photos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
              onPress={pickFromCamera}
              activeOpacity={0.8}>
              <Text style={[styles.pickBtnText, { color: t.text.primary }]}>Camera</Text>
              <Text style={[styles.pickBtnSub, { color: t.text.muted }]}>Take a new photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Workspace ── */}
        <SectionLabel text="Workspace" t={t} />
        <View style={[styles.inputRow, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <TextInput
            style={[styles.input, { color: t.text.primary }]}
            value={workspaceId}
            onChangeText={setWorkspaceId}
            placeholder="e.g. General"
            placeholderTextColor={t.text.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* ── Error ── */}
        {errorMsg !== '' && (
          <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <IconAlertTriangle size={16} color={t.status.error} />
            <Text style={[styles.errorText, { color: t.status.error, flex: 1 }]}>{errorMsg}</Text>
          </View>
        )}

        {/* ── Analyze Button ── */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: t.primary.default, opacity: loading || !imageBase64 ? 0.55 : 1 }]}
          onPress={handleAnalyze}
          disabled={loading || !imageBase64}
          activeOpacity={0.8}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={t.text.onPrimary} />
              <Text style={[styles.actionBtnText, { color: t.text.onPrimary, marginLeft: 10 }]}>Analyzing…</Text>
            </View>
          ) : (
            <Text style={[styles.actionBtnText, { color: t.text.onPrimary }]}>Analyze Image</Text>
          )}
        </TouchableOpacity>

        {/* ══ RESULT ══ */}
        {result && (
          <>
            {/* Status badge */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: t.status.successSubtle, borderColor: t.status.success + '60' }]}>
                <Text style={[styles.statusText, { color: t.status.success }]}>Analysis Complete</Text>
              </View>
            </View>

            {/* Explanation */}
            <SectionLabel text="Brain Vision Analysis" t={t} />
            <View style={[styles.resultCard, { backgroundColor: t.background.surface, borderColor: t.primary.default + '50' }]}>
              <View style={styles.resultCardHeader}>
                <View style={[styles.visionTag, { backgroundColor: t.primary.default + '18', borderColor: t.primary.default + '50' }]}>
                  <Text style={[styles.visionTagText, { color: t.primary.accent }]}>Vision AI</Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, { borderColor: t.border.default, backgroundColor: t.background.screen }]}
                  onPress={() => {
                    Clipboard.setString(result.explanation);
                    Alert.alert('Copied', 'Analysis copied to clipboard.');
                  }}
                  activeOpacity={0.7}>
                  <Text style={[styles.copyBtnText, { color: t.text.muted }]}>Copy</Text>
                </TouchableOpacity>
              </View>
              <MarkdownText content={result.explanation} t={t} fontSize={14} lineHeight={24} />
            </View>

            {/* Re-analyze */}
            <TouchableOpacity
              style={[styles.againBtn, { borderColor: t.border.default }]}
              onPress={handleAnalyze}
              activeOpacity={0.8}>
              <Text style={[styles.againBtnText, { color: t.primary.accent }]}>↻  Analyze Again</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ══ PAST RESULTS — below analyze/result ══ */}
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

            {showHistory && (
              <>
                {(showAllHistory ? history : history.slice(0, 2)).map(item => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    onPress={() => {
                      setResult({ status: 'done', explanation: item.explanation });
                      setErrorMsg('');
                    }}
                    t={t}
                  />
                ))}
                {history.length > 2 && (
                  <TouchableOpacity
                    style={[styles.showMoreBtn, { borderColor: t.border.default }]}
                    onPress={() => setShowAllHistory(v => !v)}
                    activeOpacity={0.7}>
                    <Text style={[styles.showMoreTxt, { color: t.primary.accent }]}>
                      {showAllHistory ? 'Show less ▲' : `Show all ${history.length} results ▼`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        {/* Empty state */}
        {!result && !loading && !imageUri && errorMsg === '' && history.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: t.text.primary }]}>No image selected</Text>
            <Text style={[styles.emptyHint, { color: t.text.muted }]}>
              Pick a photo from your gallery or take one with the camera to get a detailed AI analysis.
            </Text>
          </View>
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

  // Past results header
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  histTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  histTitle: { fontSize: 16, fontWeight: '700' },
  histCountBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  histCount: { fontSize: 12, fontWeight: '700' },
  histToggle: { fontSize: 12 },
  clearHistBtn: { fontSize: 13, fontWeight: '600' },

  // Pick buttons
  pickRow: { flexDirection: 'row', gap: 12 },
  pickBtn: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 18, alignItems: 'center', gap: 6 },
  pickBtnText: { fontSize: 14, fontWeight: '700' },
  pickBtnSub: { fontSize: 11, textAlign: 'center' },

  // Thumbnail
  thumbWrap: { borderRadius: 20, borderWidth: 2, overflow: 'hidden', height: 220 },
  thumb: { width: '100%', height: '100%' },
  thumbOverlay: { position: 'absolute', bottom: 12, right: 12 },
  changeBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  changeBtnText: { fontSize: 13, fontWeight: '600' },

  // Workspace input
  inputRow: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4 },
  input: { fontSize: 14, paddingVertical: 10 },

  // Error
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16 },
  errorText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },

  // Action button
  actionBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 20, justifyContent: 'center', flexDirection: 'row' },
  actionBtnText: { fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  // Status
  statusRow: { marginTop: 24, alignItems: 'center' },
  statusBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  statusText: { fontSize: 13, fontWeight: '700' },

  // Result card
  resultCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  visionTag: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  visionTagText: { fontSize: 12, fontWeight: '700' },
  copyBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  copyBtnText: { fontSize: 12, fontWeight: '600' },

  // Again button
  againBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  againBtnText: { fontSize: 14, fontWeight: '600' },

  // Show more history
  showMoreBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  showMoreTxt: { fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyHint: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});

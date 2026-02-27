import React, { useState } from 'react';
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

type T = ReturnType<typeof getTokens>;

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
      <View style={hdrStyles.titleRow}>
        <Text style={hdrStyles.titleIcon}>👁️</Text>
        <Text style={[hdrStyles.title, { color: t.text.primary }]}>Brain Vision</Text>
      </View>
      <View style={{ width: 38 }} />
    </View>
  );
}
const hdrStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  backIcon: { fontSize: 20, lineHeight: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleIcon: { fontSize: 18 },
  title: { fontSize: 17, fontWeight: '700' },
});

function SectionLabel({ text, t }: { text: string; t: T }) {
  return (
    <Text style={{ color: t.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 }}>
      {text}
    </Text>
  );
}

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

  // ── Image pickers ─────────────────────────────────────────────────────────

  const pickFromGallery = () => {
    console.log('🖼️ [VisionScreen] pickFromGallery triggered');
    launchImageLibrary(
      { mediaType: 'photo', includeBase64: true, quality: 0.8, maxWidth: 1024, maxHeight: 1024 },
      (response) => {
        if (response.didCancel) { console.log('ℹ️ [VisionScreen] gallery: user cancelled'); return; }
        if (response.errorCode) {
          console.error('❌ [VisionScreen] gallery error:', response.errorMessage);
          setErrorMsg(response.errorMessage ?? 'Failed to open gallery.');
          return;
        }
        const asset = response.assets?.[0];
        if (asset?.base64 && asset.uri) {
          console.log('✅ [VisionScreen] gallery: image selected', { size: asset.fileSize, mime: asset.type });
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
    console.log('📷 [VisionScreen] pickFromCamera triggered');
    launchCamera(
      { mediaType: 'photo', includeBase64: true, quality: 0.8, maxWidth: 1024, maxHeight: 1024 },
      (response) => {
        if (response.didCancel) { console.log('ℹ️ [VisionScreen] camera: user cancelled'); return; }
        if (response.errorCode) {
          console.error('❌ [VisionScreen] camera error:', response.errorMessage);
          setErrorMsg(response.errorMessage ?? 'Failed to open camera.');
          return;
        }
        const asset = response.assets?.[0];
        if (asset?.base64 && asset.uri) {
          console.log('✅ [VisionScreen] camera: photo taken', { size: asset.fileSize, mime: asset.type });
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
    console.log('👁️ [VisionScreen] handleAnalyze → /brain/vision', { workspaceId: ws, dataUriLen: dataUri.length });
    setLoading(true);
    setResult(null);
    setErrorMsg('');
    try {
      const res = await analyzeVision({ image: dataUri, workspaceId: ws });
      console.log('✅ [VisionScreen] handleAnalyze ← success', { explanationLen: res.explanation?.length });
      setResult(res);
    } catch (err: any) {
      console.error('❌ [VisionScreen] handleAnalyze ← error', err);
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
    console.log('🧹 [VisionScreen] cleared');
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
              <Text style={styles.pickBtnIcon}>🖼️</Text>
              <Text style={[styles.pickBtnText, { color: t.text.primary }]}>Gallery</Text>
              <Text style={[styles.pickBtnSub, { color: t.text.muted }]}>Choose from photos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
              onPress={pickFromCamera}
              activeOpacity={0.8}>
              <Text style={styles.pickBtnIcon}>📷</Text>
              <Text style={[styles.pickBtnText, { color: t.text.primary }]}>Camera</Text>
              <Text style={[styles.pickBtnSub, { color: t.text.muted }]}>Take a new photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Workspace ── */}
        <SectionLabel text="Workspace" t={t} />
        <View style={[styles.inputRow, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <Text style={[styles.inputIcon, { color: t.text.muted }]}>📁</Text>
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
          <View style={[styles.errorBox, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
            <Text style={[styles.errorText, { color: t.status.error }]}>⚠  {errorMsg}</Text>
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
            <Text style={[styles.actionBtnText, { color: t.text.onPrimary }]}>👁️  Analyze Image</Text>
          )}
        </TouchableOpacity>

        {/* ══ RESULT ══ */}
        {result && (
          <>
            {/* Status badge */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: t.status.successSubtle, borderColor: t.status.success + '60' }]}>
                <Text style={[styles.statusText, { color: t.status.success }]}>✓ Analysis Complete</Text>
              </View>
            </View>

            {/* Explanation */}
            <SectionLabel text="Brain Vision Analysis" t={t} />
            <View style={[styles.resultCard, { backgroundColor: t.background.surface, borderColor: t.primary.default + '50' }]}>
              <View style={styles.resultCardHeader}>
                <View style={[styles.visionTag, { backgroundColor: t.primary.default + '18', borderColor: t.primary.default + '50' }]}>
                  <Text style={[styles.visionTagText, { color: t.primary.accent }]}>👁️ Vision AI</Text>
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
              <Text style={[styles.explanationText, { color: t.text.primary }]} selectable>
                {result.explanation}
              </Text>
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

        {/* Empty state */}
        {!result && !loading && !imageUri && errorMsg === '' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👁️</Text>
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

  // Pick buttons
  pickRow: { flexDirection: 'row', gap: 12 },
  pickBtn: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 18, alignItems: 'center', gap: 6 },
  pickBtnIcon: { fontSize: 28 },
  pickBtnText: { fontSize: 14, fontWeight: '700' },
  pickBtnSub: { fontSize: 11, textAlign: 'center' },

  // Thumbnail
  thumbWrap: { borderRadius: 20, borderWidth: 2, overflow: 'hidden', height: 220 },
  thumb: { width: '100%', height: '100%' },
  thumbOverlay: { position: 'absolute', bottom: 12, right: 12 },
  changeBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  changeBtnText: { fontSize: 13, fontWeight: '600' },

  // Workspace input
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, gap: 8 },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 14, paddingVertical: 10 },

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
  explanationText: { fontSize: 14, lineHeight: 24 },
  copyBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  copyBtnText: { fontSize: 12, fontWeight: '600' },

  // Again button
  againBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  againBtnText: { fontSize: 14, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyHint: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});

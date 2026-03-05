import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, StatusBar, Alert,
  Image, Modal, Animated, Easing, Linking, RefreshControl,
  Dimensions, Platform, Share,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker, { types as DocTypes } from 'react-native-document-picker';
import WebView from 'react-native-webview';
import { RootState } from '../../redux/RootReducer';
import { getTokens } from '../../theme/tokens';
import {
  listFiles, uploadFile, getFile, deleteFile, BrainFile,
} from '../../api/files.api';
import {
  IconX, IconAlertTriangle, IconImage, IconFileText, IconActivity,
  IconPlay, IconTerminal, IconPackage, IconFolder,
} from '../../components/ui/Icons';

const { width: SW, height: SH } = Dimensions.get('window');

type T = ReturnType<typeof getTokens>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) { return `${bytes} B`; }
  if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

type MimeCategory = 'image' | 'pdf' | 'code' | 'doc' | 'audio' | 'video' | 'other';

function mimeCategory(mimeType: string): MimeCategory {
  if (!mimeType) { return 'other'; }
  if (mimeType.startsWith('image/')) { return 'image'; }
  if (mimeType === 'application/pdf') { return 'pdf'; }
  if (mimeType.startsWith('audio/')) { return 'audio'; }
  if (mimeType.startsWith('video/')) { return 'video'; }
  const codeTypes = ['text/', 'application/json', 'application/javascript',
    'application/typescript', 'application/xml', 'application/octet-stream'];
  if (codeTypes.some(t => mimeType.startsWith(t))) { return 'code'; }
  if (['application/msword', 'application/vnd.openxml', 'application/vnd.ms-'].some(t => mimeType.startsWith(t))) { return 'doc'; }
  return 'other';
}

const ACCENT_MAP: Record<MimeCategory, string> = {
  image: '#06b6d4', pdf: '#ef4444', audio: '#f59e0b',
  video: '#8b5cf6', code: '#10b981', doc: '#3b82f6', other: '#6b7280',
};

const MIME_ICON: Record<MimeCategory, React.ComponentType<{ size?: number; color: string }>> = {
  image: IconImage,
  pdf: IconFileText,
  audio: IconActivity,
  video: IconPlay,
  code: IconTerminal,
  doc: IconFileText,
  other: IconPackage,
};

function statusColor(status: string, t: T): string {
  switch (status) {
    case 'done':       return t.status.success;
    case 'processing': return '#f59e0b';
    case 'queued':     return t.primary.accent;
    case 'failed':     return t.status.error;
    default:           return t.text.muted;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'done':       return 'Ingested';
    case 'processing': return 'Processing';
    case 'queued':     return 'Queued';
    case 'failed':     return 'Failed';
    default:           return status ?? 'Unknown';
  }
}

// ─── In-App Image Viewer ──────────────────────────────────────────────────────

function ImageViewer({ url, name, visible, onClose }: {
  url: string; name: string; visible: boolean; onClose: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[ivSt.root, { opacity: fadeAnim }]}>
        <View style={ivSt.header}>
          <Text style={ivSt.name} numberOfLines={1}>{name}</Text>
          <TouchableOpacity style={ivSt.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <IconX size={18} color='#fff' />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={ivSt.scrollArea}
          contentContainerStyle={ivSt.imgWrap}
          maximumZoomScale={5}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent>
          <Image source={{ uri: url }} style={ivSt.img} resizeMode="contain" />
        </ScrollView>
        <View style={ivSt.bar}>
          <TouchableOpacity style={ivSt.barBtn} onPress={() => Share.share({ url, message: name })} activeOpacity={0.8}>
            <Text style={ivSt.barTxt}>Share  ↗</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ivSt.barBtn} onPress={() => Linking.openURL(url)} activeOpacity={0.8}>
            <Text style={ivSt.barTxt}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}
const ivSt = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 32) + 4 : 52,
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.75)',
  },
  name: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 12 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scrollArea: { flex: 1 },
  imgWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: SH * 0.72 },
  img: { width: SW, height: SH * 0.72 },
  bar: {
    flexDirection: 'row', gap: 10, padding: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 42,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  barBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  barTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

// ─── In-App File Viewer (PDF / code / doc via WebView) ───────────────────────

function FileViewer({ url, name, mimeType, visible, onClose, t }: {
  url: string; name: string; mimeType: string; visible: boolean; onClose: () => void; t: T;
}) {
  const [webLoading, setWebLoading] = useState(true);
  const cat = mimeCategory(mimeType);
  const accent = ACCENT_MAP[cat];
  // For PDFs use Google Docs viewer so they render without a native PDF plugin
  const viewUrl = cat === 'pdf'
    ? `https://docs.google.com/gviewer?embedded=true&url=${encodeURIComponent(url)}`
    : url;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[fvSt.root, { backgroundColor: t.background.screen }]}>
        <View style={[fvSt.header, { backgroundColor: t.background.surface, borderBottomColor: t.border.subtle }]}>
          <TouchableOpacity style={[fvSt.closeBtn, { backgroundColor: t.background.input }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={[fvSt.closeIcon, { color: t.text.primary }]}>←</Text>
          </TouchableOpacity>
          <View style={fvSt.titleWrap}>
            <Text style={[fvSt.title, { color: t.text.primary }]} numberOfLines={1}>{name}</Text>
            <Text style={[fvSt.subtitle, { color: t.text.muted }]}>{mimeType}</Text>
          </View>
          <TouchableOpacity
            style={[fvSt.extBtn, { backgroundColor: accent + '22', borderColor: accent + '55' }]}
            onPress={() => Linking.openURL(url)}
            activeOpacity={0.8}>
            <Text style={[fvSt.extTxt, { color: accent }]}>↗</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: viewUrl }}
          style={fvSt.webview}
          onLoadStart={() => setWebLoading(true)}
          onLoadEnd={() => setWebLoading(false)}
          onError={() => setWebLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
        />
        {webLoading && (
          <View style={[fvSt.loader, { backgroundColor: t.background.screen }]}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[fvSt.loaderTxt, { color: t.text.muted }]}>Loading…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
const fvSt = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 32) + 8 : 56,
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 20 },
  titleWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 1 },
  extBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  extTxt: { fontSize: 18, fontWeight: '700' },
  webview: { flex: 1 },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 14, top: 80 },
  loaderTxt: { fontSize: 14 },
});

// ─── FileCard ─────────────────────────────────────────────────────────────────

interface FileCardProps {
  file: BrainFile;
  t: T;
  onPress: () => void;
  onDelete: () => void;
  onQuickOpen: () => void;
}

function FileCard({ file, t, onPress, onDelete, onQuickOpen }: FileCardProps) {
  const cat = mimeCategory(file.mimeType);
  const accent = ACCENT_MAP[cat];
  const isImage = cat === 'image';
  const MimeIcon = MIME_ICON[cat];
  const canView = ['image', 'pdf', 'code', 'doc'].includes(cat);

  return (
    <TouchableOpacity
      style={[fcSt.card, { backgroundColor: t.background.surface, borderColor: accent + '35' }]}
      onPress={onPress}
      activeOpacity={0.85}>

      {/* Left icon / thumbnail */}
      <View style={[fcSt.iconBox, { backgroundColor: accent + '18' }]}>
        {isImage && file.url ? (
          <Image source={{ uri: file.url }} style={fcSt.thumb} resizeMode="cover" />
        ) : (
          <MimeIcon size={20} color={accent} />
        )}
      </View>

      {/* Center info */}
      <View style={fcSt.info}>
        <Text style={[fcSt.name, { color: t.text.primary }]} numberOfLines={1}>
          {file.originalName}
        </Text>
        <View style={fcSt.metaRow}>
          <View style={[fcSt.typeBadge, { backgroundColor: accent + '18', borderColor: accent + '45' }]}>
            <Text style={[fcSt.typeText, { color: accent }]}>
              {file.mimeType.split('/').pop()?.toUpperCase().slice(0, 8) ?? '?'}
            </Text>
          </View>
          <Text style={[fcSt.size, { color: t.text.muted }]}>{formatBytes(file.size)}</Text>
          <View style={[fcSt.dot, { backgroundColor: statusColor(file.ingestionStatus, t) }]} />
          <Text style={[fcSt.statusTxt, { color: statusColor(file.ingestionStatus, t) }]}>
            {statusLabel(file.ingestionStatus)}
          </Text>
        </View>
        <Text style={[fcSt.date, { color: t.text.muted }]}>{formatDate(file.createdAt)}</Text>
      </View>

      {/* Actions */}
      <View style={fcSt.actions}>
        {canView && (
          <TouchableOpacity
            style={[fcSt.actionBtn, { backgroundColor: accent + '18', borderColor: accent + '45' }]}
            onPress={onQuickOpen}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 4 }}
            activeOpacity={0.75}>
            <Text style={[fcSt.actionIcon, { color: accent }]}>▶</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[fcSt.actionBtn, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error + '40' }]}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 6 }}
          activeOpacity={0.75}>
          <IconX size={14} color={t.status.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
const fcSt = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    padding: 14, marginBottom: 10, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  iconBox: {
    width: 54, height: 54, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
  },
  thumb: { width: 54, height: 54, borderRadius: 14 },
  iconText: { fontSize: 26 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  size: { fontSize: 11 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontWeight: '600' },
  date: { fontSize: 10 },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { fontSize: 11, fontWeight: '700' },
});

// ─── File Detail Sheet ────────────────────────────────────────────────────────

interface DetailSheetProps {
  file: BrainFile | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onOpenView: (file: BrainFile) => void;
  t: T;
}

function FileDetailSheet({ file, visible, onClose, onDelete, onOpenView, t }: DetailSheetProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<BrainFile | null>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && file) {
      setDetail(file);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      (async () => {
        try { setLoading(true); const fresh = await getFile(file._id); setDetail(fresh); }
        catch (_) { /* use cached */ }
        finally { setLoading(false); }
      })();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, file, slideAnim, backdropAnim]);

  if (!file) { return null; }
  const d = detail ?? file;
  const cat = mimeCategory(d.mimeType);
  const accent = ACCENT_MAP[cat];
  const isImage = cat === 'image';
  const MimeIcon = MIME_ICON[cat];
  const canView = ['image', 'pdf', 'code', 'doc'].includes(cat);
  const viewLabel = cat === 'image' ? 'View Image  ▶'
    : cat === 'pdf' ? 'View PDF  ▶'
    : cat === 'code' ? 'View File  ▶'
    : 'View Document  ▶';

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[dsSt.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[dsSt.sheet, { backgroundColor: t.background.screen, transform: [{ translateY: slideAnim }] }]}>
        <View style={[dsSt.handle, { backgroundColor: t.border.default }]} />
        <ScrollView contentContainerStyle={dsSt.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={[dsSt.hero, { backgroundColor: accent + '14' }]}>
            {isImage && d.url ? (
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => { onClose(); setTimeout(() => onOpenView(d), 300); }}
                activeOpacity={0.9}>
                <Image source={{ uri: d.url }} style={dsSt.heroImg} resizeMode="cover" />
                <View style={dsSt.heroOverlay}>
                  <View style={dsSt.heroPlayBtn}>
                    <Text style={dsSt.heroPlayIcon}>▶</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <MimeIcon size={40} color={accent} />
            )}
            {loading && <ActivityIndicator style={dsSt.heroLoader} color={accent} size="small" />}
          </View>

          {/* Name + badges */}
          <Text style={[dsSt.fileName, { color: t.text.primary }]}>{d.originalName}</Text>
          <View style={dsSt.badgeRow}>
            <View style={[dsSt.badge, { backgroundColor: accent + '18', borderColor: accent + '45' }]}>
              <Text style={[dsSt.badgeTxt, { color: accent }]}>{cat.toUpperCase()}</Text>
            </View>
            <View style={[dsSt.badge, {
              backgroundColor: statusColor(d.ingestionStatus, t) + '20',
              borderColor: statusColor(d.ingestionStatus, t) + '55',
            }]}>
              <View style={[dsSt.badgeDot, { backgroundColor: statusColor(d.ingestionStatus, t) }]} />
              <Text style={[dsSt.badgeTxt, { color: statusColor(d.ingestionStatus, t) }]}>
                {statusLabel(d.ingestionStatus)}
              </Text>
            </View>
          </View>

          {/* Meta rows */}
          {([
            ['Type', d.mimeType],
            ['Size', formatBytes(d.size)],
            ['Storage', d.storage],
            ['Uploaded', formatDate(d.createdAt)],
            ['Updated', formatDate(d.updatedAt)],
            ...(d.metadata?.width ? [['Dimensions', `${d.metadata.width} × ${d.metadata.height}`]] : []),
            ...(d.metadata?.format ? [['Format', d.metadata.format.toUpperCase()]] : []),
          ] as [string, string][]).map(([label, val]) => (
            <View key={label} style={[dsSt.row, { borderBottomColor: t.border.subtle }]}>
              <Text style={[dsSt.rowLabel, { color: t.text.muted }]}>{label}</Text>
              <Text style={[dsSt.rowVal, { color: t.text.primary }]} numberOfLines={2}>{val}</Text>
            </View>
          ))}

          {/* URL copy row */}
          <TouchableOpacity
            style={[dsSt.urlRow, { backgroundColor: t.background.input, borderColor: t.border.default }]}
            onPress={() => { Clipboard.setString(d.url); Alert.alert('Copied', 'URL copied.'); }}
            activeOpacity={0.8}>
            <Text style={[dsSt.urlLabel, { color: t.text.muted }]}>URL</Text>
            <Text style={[dsSt.urlText, { color: t.text.secondary }]} numberOfLines={2}>{d.url}</Text>
            <Text style={[dsSt.urlCopy, { color: t.primary.accent }]}>Copy</Text>
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={dsSt.btnRow}>
            {canView && (
              <TouchableOpacity
                style={[dsSt.primaryBtn, { backgroundColor: accent }]}
                onPress={() => { onClose(); setTimeout(() => onOpenView(d), 300); }}
                activeOpacity={0.85}>
                <Text style={dsSt.primaryBtnTxt}>{viewLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[dsSt.secondaryBtn, { borderColor: t.border.default, backgroundColor: t.background.surface }]}
              onPress={() => Linking.openURL(d.url)}
              activeOpacity={0.8}>
              <Text style={[dsSt.secondaryBtnTxt, { color: t.text.secondary }]}>Open in Browser  ↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dsSt.deleteBtn, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error + '50' }]}
              onPress={() => { onDelete(d._id); onClose(); }}
              activeOpacity={0.8}>
              <Text style={[dsSt.deleteBtnTxt, { color: t.status.error }]}>Delete File</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
const dsSt = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 12, maxHeight: '90%',
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  scroll: { paddingHorizontal: 18, paddingBottom: 48 },
  hero: {
    height: 200, borderRadius: 18, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroImg: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroPlayBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroPlayIcon: { color: '#fff', fontSize: 18, marginLeft: 3 },
  heroIcon: { fontSize: 64 },
  heroLoader: { position: 'absolute', bottom: 10, right: 10 },
  fileName: { fontSize: 16, fontWeight: '800', lineHeight: 22, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 13 },
  rowVal: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  urlRow: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
  },
  urlLabel: { fontSize: 11, fontWeight: '700' },
  urlText: { flex: 1, fontSize: 11, lineHeight: 16 },
  urlCopy: { fontSize: 11, fontWeight: '800' },
  btnRow: { gap: 10, marginTop: 18 },
  primaryBtn: { borderRadius: 16, padding: 15, alignItems: 'center' },
  primaryBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondaryBtn: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, alignItems: 'center' },
  secondaryBtnTxt: { fontSize: 14, fontWeight: '600' },
  deleteBtn: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, alignItems: 'center' },
  deleteBtnTxt: { fontSize: 14, fontWeight: '700' },
});

// ─── Upload Banner ────────────────────────────────────────────────────────────

function UploadBanner({ t }: { t: T }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  }, [scale]);
  return (
    <Animated.View style={[upSt.banner, { backgroundColor: t.background.surface, borderColor: t.primary.default + '60', transform: [{ scale }] }]}>
      <ActivityIndicator color={t.primary.default} size="small" />
      <Text style={[upSt.txt, { color: t.text.primary }]}>Uploading file…</Text>
    </Animated.View>
  );
}
const upSt = StyleSheet.create({
  banner: {
    position: 'absolute', top: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingVertical: 10,
    zIndex: 50, elevation: 10,
  },
  txt: { fontSize: 13, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface FilesScreenProps { onBack: () => void; }

export default function FilesScreen({ onBack }: FilesScreenProps) {
  const themeMode = useSelector((s: RootState) => s.theme.mode);
  const t = getTokens(themeMode);

  const [files, setFiles] = useState<BrainFile[]>([]);
  const [filtered, setFiltered] = useState<BrainFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<BrainFile | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [imageViewerFile, setImageViewerFile] = useState<BrainFile | null>(null);
  const [fileViewerFile, setFileViewerFile] = useState<BrainFile | null>(null);

  const FILTER_TABS: string[] = ['all', 'image', 'pdf', 'code', 'doc', 'other'];

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); }
    setErrorMsg('');
    try {
      const data = await listFiles();
      // Sort newest first
      const sorted = [...data].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setFiles(sorted);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Failed to load files.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // ── Filter / search ─────────────────────────────────────────────────────
  useEffect(() => {
    let result = files;
    if (activeFilter !== 'all') {
      result = result.filter(f => mimeCategory(f.mimeType) === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.originalName.toLowerCase().includes(q) ||
        f.mimeType.toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  }, [files, search, activeFilter]);

  // ── Open file in-app ─────────────────────────────────────────────────────
  const openFileInApp = useCallback((file: BrainFile) => {
    const cat = mimeCategory(file.mimeType);
    if (cat === 'image') {
      setImageViewerFile(file);
    } else if (['pdf', 'code', 'doc'].includes(cat)) {
      setFileViewerFile(file);
    } else {
      Linking.openURL(file.url).catch(() =>
        Alert.alert('Cannot open', 'No app found to open this file type.'),
      );
    }
  }, []);

  // ── Upload helpers ──────────────────────────────────────────────────────
  const doUpload = useCallback(async (uri: string, name: string, mime: string) => {
    setUploading(true);
    setErrorMsg('');
    try {
      await uploadFile(uri, name, mime);
      await fetchFiles(true);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }, [fetchFiles]);

  const openUploadPicker = () => {
    Alert.alert('Upload File', 'Choose source', [
      {
        text: 'Gallery (Images & Videos)',
        onPress: () => launchImageLibrary(
          { mediaType: 'mixed', includeBase64: false, quality: 0.9 },
          (res) => {
            if (res.didCancel || res.errorCode) { return; }
            const asset = res.assets?.[0];
            if (asset?.uri && asset.fileName) {
              doUpload(asset.uri, asset.fileName, asset.type ?? 'image/jpeg');
            }
          },
        ),
      },
      {
        text: 'Files (PDF, Code, Docs…)',
        onPress: async () => {
          try {
            const result = await DocumentPicker.pickSingle({
              type: [DocTypes.allFiles],
              copyTo: 'cachesDirectory',
            });
            const fileUri = result.fileCopyUri ?? result.uri;
            const fileName = result.name ?? 'file';
            const fileMime = result.type ?? 'application/octet-stream';
            doUpload(fileUri, fileName, fileMime);
          } catch (e) {
            if (!DocumentPicker.isCancel(e)) {
              setErrorMsg('Failed to pick file.');
            }
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const confirmDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete File',
      `Permanently delete "${name}"?\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(id);
              setFiles(prev => prev.filter(f => f._id !== id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete file.');
            }
          },
        },
      ],
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={[ss.root, { backgroundColor: t.background.screen }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />

      {uploading && <UploadBanner t={t} />}

      <SafeAreaView style={ss.safe} edges={['left', 'right']}>
        {/* ── Top bar ── */}
        <View style={[ss.topBar, { borderBottomColor: t.border.subtle }]}>
          <TouchableOpacity
            style={[ss.backBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
            onPress={onBack}
            activeOpacity={0.8}>
            <Text style={[ss.backIcon, { color: t.text.primary }]}>←</Text>
          </TouchableOpacity>
          <View style={ss.topCenter}>
            <Text style={[ss.topTitle, { color: t.text.primary }]}>Brain Files</Text>
            <Text style={[ss.topSub, { color: t.text.muted }]}>
              {loading ? 'Loading…' : `${files.length} file${files.length !== 1 ? 's' : ''} stored`}
            </Text>
          </View>
          <TouchableOpacity
            style={[ss.uploadBtn, { backgroundColor: t.primary.default }]}
            onPress={openUploadPicker}
            disabled={uploading}
            activeOpacity={0.85}>
            <Text style={[ss.uploadBtnTxt, { color: t.text.onPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search bar ── */}
        <View style={[ss.searchRow, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <Text style={[ss.searchIcon, { color: t.text.muted }]}>⌕</Text>
          <TextInput
            style={[ss.searchInput, { color: t.text.primary }]}
            placeholder="Search files…"
            placeholderTextColor={t.text.placeholder}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconX size={14} color={t.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter chips ── */}
        <View style={ss.filterRow}>
          {FILTER_TABS.map(tab => {
            const active = tab === activeFilter;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  ss.chip,
                  active
                    ? { backgroundColor: t.primary.default, borderColor: t.primary.default }
                    : { backgroundColor: t.background.surface, borderColor: t.text.muted + '60' },
                ]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.8}>
                <Text
                  style={[ss.chipTxt, { color: active ? (themeMode === 'dark' ? '#000' : '#fff') : t.text.primary }]}
                  numberOfLines={1}>
                  {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Error banner ── */}
        {errorMsg !== '' && (
          <View style={[ss.errorBanner, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
            <IconAlertTriangle size={16} color={t.status.error} />
            <Text style={[ss.errorTxt, { color: t.status.error, flex: 1 }]}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => { setErrorMsg(''); fetchFiles(); }}>
              <Text style={[ss.retryTxt, { color: t.primary.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── File list ── */}
        {loading ? (
          <View style={ss.loadingWrap}>
            <ActivityIndicator color={t.primary.default} size="large" />
            <Text style={[ss.loadingTxt, { color: t.text.muted }]}>Loading files…</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={ss.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchFiles(true); }}
                tintColor={t.primary.default}
                colors={[t.primary.default]}
              />
            }>

            {/* Stats strip */}
            {files.length > 0 && (
              <View style={[ss.statsRow, { backgroundColor: t.background.surface, borderColor: t.border.subtle }]}>
                {[
                  ['Total', files.length],
                  ['Images', files.filter(f => mimeCategory(f.mimeType) === 'image').length],
                  ['PDFs', files.filter(f => mimeCategory(f.mimeType) === 'pdf').length],
                  ['Ingested', files.filter(f => f.ingestionStatus === 'done').length],
                ].map(([label, val]) => (
                  <View key={label as string} style={ss.statItem}>
                    <Text style={[ss.statVal, { color: t.primary.accent }]}>{val}</Text>
                    <Text style={[ss.statLabel, { color: t.text.muted }]}>{label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {filtered.length === 0 && !loading && (
              <View style={ss.emptyState}>
                <IconFolder size={56} color={t.text.muted} />
                <Text style={[ss.emptyTitle, { color: t.text.primary }]}>
                  {files.length === 0 ? 'No files yet' : 'No matches'}
                </Text>
                <Text style={[ss.emptyHint, { color: t.text.muted }]}>
                  {files.length === 0
                    ? 'Tap + to upload images, PDFs, code or any file type.'
                    : 'Try a different search or filter.'}
                </Text>
                {files.length === 0 && (
                  <TouchableOpacity
                    style={[ss.uploadEmptyBtn, { backgroundColor: t.primary.default }]}
                    onPress={openUploadPicker}
                    activeOpacity={0.85}>
                    <Text style={ss.uploadEmptyTxt}>Upload First File</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* File cards */}
            {filtered.map(file => (
              <FileCard
                key={file._id}
                file={file}
                t={t}
                onPress={() => { setSelectedFile(file); setDetailVisible(true); }}
                onDelete={() => confirmDelete(file._id, file.originalName)}
                onQuickOpen={() => openFileInApp(file)}
              />
            ))}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      {/* ── Detail sheet ── */}
      <FileDetailSheet
        file={selectedFile}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onDelete={(id) => confirmDelete(id, files.find(f => f._id === id)?.originalName ?? 'file')}
        onOpenView={openFileInApp}
        t={t}
      />

      {/* ── In-app image viewer ── */}
      {imageViewerFile && (
        <ImageViewer
          url={imageViewerFile.url}
          name={imageViewerFile.originalName}
          visible={!!imageViewerFile}
          onClose={() => setImageViewerFile(null)}
        />
      )}

      {/* ── In-app file viewer (PDF / code / doc) ── */}
      {fileViewerFile && (
        <FileViewer
          url={fileViewerFile.url}
          name={fileViewerFile.originalName}
          mimeType={fileViewerFile.mimeType}
          visible={!!fileViewerFile}
          onClose={() => setFileViewerFile(null)}
          t={t}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  backIcon: { fontSize: 20, lineHeight: 22 },
  topCenter: { flex: 1 },
  topTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  topSub: { fontSize: 11, marginTop: 1 },
  uploadBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnTxt: { color: '#fff', fontSize: 22, lineHeight: 26, fontWeight: '400' },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 18, marginTop: 8, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  searchClear: { fontSize: 14 },

  // Filter chips — static fixed size, wrap to next row, never compress
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 8,
  },
  chip: {
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    width: 64, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  chipTxt: { fontSize: 12, fontWeight: '700' },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 18, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6,
  },
  errorTxt: { fontSize: 13, flex: 1 },
  retryTxt: { fontSize: 13, fontWeight: '700', marginLeft: 10 },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingTxt: { fontSize: 14 },

  // List
  list: { paddingHorizontal: 18, paddingTop: 0 },

  // Stats
  statsRow: {
    flexDirection: 'row', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12, marginTop: 2, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2, letterSpacing: 0.4 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptyHint: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  uploadEmptyBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 },
  uploadEmptyTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

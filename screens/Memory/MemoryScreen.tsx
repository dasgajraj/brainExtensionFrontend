/**
 * screens/Memory/MemoryScreen.tsx
 *
 * Full-screen Memory manager.
 * Features: list all memories, add new memory, delete, semantic search.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { getTokens } from '../../theme/tokens';
import {
  listMemories,
  searchMemories,
  createMemory,
  deleteMemory,
  MemoryItem,
  MemorySearchResult,
} from '../../api/memory.api';
import {
  IconArrowLeft,
  IconSearch,
  IconPlus,
  IconTrash,
  IconX,
  IconMemory,
  IconAlertTriangle,
} from '../../components/ui/Icons';

interface MemoryScreenProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
}

function typeLabel(type?: string): string {
  if (!type) return 'memory';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ─── MemoryCard ───────────────────────────────────────────────────────────────

interface CardProps {
  item: MemoryItem | MemorySearchResult;
  onDelete: (id: string) => void;
  onPress: (item: MemoryItem | MemorySearchResult) => void;
  t: ReturnType<typeof getTokens>;
  score?: number;
}

function MemoryCard({ item, onDelete, onPress, t, score }: CardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[mcSt.card, { backgroundColor: t.background.surface, borderColor: t.border.subtle }]}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}>
        {/* Top row: type badge + date + delete */}
        <View style={mcSt.topRow}>
          <View style={[mcSt.typeBadge, { backgroundColor: t.primary.default + '18' }]}>
            <Text style={[mcSt.typeText, { color: t.primary.accent }]}>
              {typeLabel((item as MemoryItem).types)}
            </Text>
          </View>
          {score !== undefined && (
            <View style={[mcSt.scoreBadge, { backgroundColor: t.status.successSubtle }]}>
              <Text style={[mcSt.scoreText, { color: t.status.success }]}>
                {(score * 100).toFixed(0)}% match
              </Text>
            </View>
          )}
          <Text style={[mcSt.date, { color: t.text.muted }]}>{formatDate(item.createdAt)}</Text>
          <TouchableOpacity
            style={[mcSt.deleteBtn, { backgroundColor: t.status.errorSubtle }]}
            onPress={() => onDelete(item._id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconTrash size={14} color={t.status.error} />
          </TouchableOpacity>
        </View>
        {/* Context (if available) */}
        {(item as MemoryItem).context ? (
          <Text style={[mcSt.context, { color: t.text.muted }]} numberOfLines={1}>
            {(item as MemoryItem).context}
          </Text>
        ) : null}
        {/* Content snippet */}
        <Text style={[mcSt.content, { color: t.text.primary }]} numberOfLines={3}>
          {item.content}
        </Text>
        {/* Footer: workspace */}
        {(item as MemoryItem).workspaceId ? (
          <View style={mcSt.footer}>
            <Text style={[mcSt.workspace, { color: t.text.muted }]}>
              {(item as MemoryItem).workspaceId}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const mcSt = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    marginRight: 4,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  context: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
  },
  workspace: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});

// ─── MemoryDetailModal ────────────────────────────────────────────────────────

function MemoryDetailModal({
  item,
  visible,
  onClose,
  onDelete,
  t,
}: {
  item: MemoryItem | MemorySearchResult | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof getTokens>;
}) {
  if (!item) return null;
  const full = item as MemoryItem;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[mdSt.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[mdSt.sheet, { backgroundColor: t.background.screen, borderColor: t.border.default }]}>
          {/* Handle */}
          <View style={[mdSt.handle, { backgroundColor: t.border.default }]} />
          {/* Header */}
          <View style={mdSt.header}>
            <View style={[mdSt.typePill, { backgroundColor: t.primary.default + '18' }]}>
              <Text style={[mdSt.typeLabel, { color: t.primary.accent }]}>
                {typeLabel(full.types)}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[mdSt.iconBtn, { backgroundColor: t.status.errorSubtle }]}
              onPress={() => { onDelete(item._id); onClose(); }}>
              <IconTrash size={16} color={t.status.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[mdSt.iconBtn, { backgroundColor: t.background.surface, marginLeft: 8 }]}
              onPress={onClose}>
              <IconX size={16} color={t.text.primary} />
            </TouchableOpacity>
          </View>
          {/* Meta */}
          {full.context ? (
            <Text style={[mdSt.context, { color: t.text.muted }]}>{full.context}</Text>
          ) : null}
          <Text style={[mdSt.date, { color: t.text.muted }]}>{formatDate(item.createdAt)}</Text>
          {/* Content */}
          <ScrollView style={mdSt.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={[mdSt.content, { color: t.text.primary }]}>{item.content}</Text>
            {full.workspaceId ? (
              <Text style={[mdSt.workspace, { color: t.text.muted }]}>
                Workspace: {full.workspaceId}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const mdSt = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '82%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  context: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    marginBottom: 16,
  },
  scrollArea: {
    maxHeight: 400,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
  },
  workspace: {
    fontSize: 12,
    marginTop: 16,
    letterSpacing: 0.3,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MemoryScreen({ onBack }: MemoryScreenProps) {
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const t = getTokens(themeMode);
  const isDark = themeMode === 'dark';

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newText, setNewText] = useState('');

  const [detailItem, setDetailItem] = useState<MemoryItem | MemorySearchResult | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const addBarAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch all memories ────────────────────────────────────────────────────
  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await listMemories();
      setMemories(data);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  // ── Search ────────────────────────────────────────────────────────────────
  const toggleSearch = () => {
    const open = !searchOpen;
    setSearchOpen(open);
    if (!open) {
      setSearchQuery('');
      setSearchResults(null);
    }
    Animated.spring(searchBarAnim, {
      toValue: open ? 1 : 0,
      useNativeDriver: false,
      damping: 18,
      stiffness: 200,
    }).start();
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults(null); return; }
    try {
      setSearching(true);
      const res = await searchMemories(q.trim());
      setSearchResults(res);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // ── Add memory ────────────────────────────────────────────────────────────
  const toggleAdd = () => {
    const open = !addOpen;
    setAddOpen(open);
    if (!open) setNewText('');
    Animated.spring(addBarAnim, {
      toValue: open ? 1 : 0,
      useNativeDriver: false,
      damping: 18,
      stiffness: 200,
    }).start();
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    try {
      setAdding(true);
      const created = await createMemory(newText.trim());
      setMemories(prev => [created, ...prev]);
      setNewText('');
      setAddOpen(false);
      Animated.spring(addBarAnim, { toValue: 0, useNativeDriver: false, damping: 18, stiffness: 200 }).start();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save memory');
    } finally {
      setAdding(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    Alert.alert('Delete Memory', 'Remove this memory permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMemory(id);
            setMemories(prev => prev.filter(m => m._id !== id));
            if (searchResults) {
              setSearchResults(prev => prev?.filter(m => m._id !== id) ?? null);
            }
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to delete');
          }
        },
      },
    ]);
  };

  // ── Detail ────────────────────────────────────────────────────────────────
  const handleOpenDetail = (item: MemoryItem | MemorySearchResult) => {
    setDetailItem(item);
    setDetailVisible(true);
  };

  // ── Display list ─────────────────────────────────────────────────────────
  const displayList = searchResults !== null ? searchResults : memories;
  const isSearchMode = searchResults !== null;

  // ── Animated heights ─────────────────────────────────────────────────────
  const searchHeight = searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] });
  const addHeight = addBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.background.screen }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[s.header, { borderBottomColor: t.border.subtle }]}>
        <TouchableOpacity
          style={[s.headerBtn, { backgroundColor: t.background.surface }]}
          onPress={onBack}
          activeOpacity={0.7}>
          <IconArrowLeft size={20} color={t.text.primary} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <IconMemory size={20} color={t.primary.accent} />
          <Text style={[s.headerTitle, { color: t.text.primary }]}>Memory</Text>
        </View>

        <View style={s.headerActions}>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: searchOpen ? t.primary.default : t.background.surface }]}
            onPress={toggleSearch}
            activeOpacity={0.7}>
            <IconSearch size={18} color={searchOpen ? (isDark ? '#000' : '#fff') : t.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: addOpen ? t.primary.default : t.background.surface, marginLeft: 8 }]}
            onPress={toggleAdd}
            activeOpacity={0.7}>
            {addOpen
              ? <IconX size={18} color={isDark ? '#000' : '#fff'} />
              : <IconPlus size={18} color={t.text.primary} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <Animated.View style={[s.collapsible, { height: searchHeight, overflow: 'hidden' }]}>
        <View style={[s.searchBar, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
          <IconSearch size={16} color={t.text.muted} />
          <TextInput
            style={[s.searchInput, { color: t.text.primary }]}
            placeholder="Semantic search memories…"
            placeholderTextColor={t.text.placeholder}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={t.primary.accent} />}
          {searchQuery.length > 0 && !searching && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults(null); }}>
              <IconX size={16} color={t.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── Add memory bar ──────────────────────────────────────────────── */}
      <Animated.View style={[s.collapsible, { height: addHeight, overflow: 'hidden' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.addBar, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
            <TextInput
              style={[s.addInput, { color: t.text.primary }]}
              placeholder="What do you want to remember?"
              placeholderTextColor={t.text.placeholder}
              value={newText}
              onChangeText={setNewText}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={[s.addSendBtn, {
                backgroundColor: newText.trim() ? t.primary.default : t.background.surface,
                opacity: adding ? 0.6 : 1,
              }]}
              onPress={handleAdd}
              disabled={adding || !newText.trim()}
              activeOpacity={0.8}>
              {adding
                ? <ActivityIndicator size="small" color={t.text.onPrimary} />
                : <IconPlus size={18} color={newText.trim() ? (isDark ? '#000' : '#fff') : t.text.muted} />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {errorMsg !== '' && (
        <View style={[s.errorBanner, { backgroundColor: t.status.errorSubtle, borderColor: t.status.error }]}>
          <IconAlertTriangle size={16} color={t.status.error} />
          <Text style={[s.errorText, { color: t.status.error }]}>{errorMsg}</Text>
          <TouchableOpacity onPress={fetchMemories}>
            <Text style={[s.retryText, { color: t.primary.accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      {!loading && (
        <View style={[s.statsBar, { borderBottomColor: t.border.subtle }]}>
          <Text style={[s.statsText, { color: t.text.muted }]}>
            {isSearchMode
              ? `${displayList.length} result${displayList.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `${memories.length} memor${memories.length !== 1 ? 'ies' : 'y'}`}
          </Text>
        </View>
      )}

      {/* ── List ────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={t.primary.accent} />
          <Text style={[s.loadingText, { color: t.text.muted }]}>Loading memories…</Text>
        </View>
      ) : displayList.length === 0 ? (
        <View style={s.center}>
          <IconMemory size={56} color={t.text.muted} />
          <Text style={[s.emptyTitle, { color: t.text.primary }]}>
            {isSearchMode ? 'No results found' : 'No memories yet'}
          </Text>
          <Text style={[s.emptySubtitle, { color: t.text.muted }]}>
            {isSearchMode
              ? 'Try a different search query'
              : 'Tap + to store your first memory'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayList as any[]}
          keyExtractor={item => item._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MemoryCard
              item={item}
              onDelete={handleDelete}
              onPress={handleOpenDetail}
              t={t}
              score={isSearchMode ? (item as MemorySearchResult).score : undefined}
            />
          )}
        />
      )}

      {/* ── Detail modal ────────────────────────────────────────────────── */}
      <MemoryDetailModal
        item={detailItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onDelete={(id) => {
          handleDelete(id);
          setDetailVisible(false);
        }}
        t={t}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  collapsible: {
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    marginVertical: 6,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginVertical: 6,
  },
  addInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 80,
  },
  addSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsText: {
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  loadingText: {
    fontSize: 15,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});

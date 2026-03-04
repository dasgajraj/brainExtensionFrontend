/**
 * AgentScreen — Remote AI Agent
 * UI matches app design system (tokens.ts). SVG vector icons, no emojis.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { RootState } from '../../redux/RootReducer';
import { selectUser, selectAccessToken } from '../../store/auth/auth.selectors';
import { BASE_URL } from '../../api/httpClient';
import { getTokens } from '../../theme/tokens';

type T = ReturnType<typeof getTokens>;
type AgentPage = 'MENU' | 'OTP' | 'ACTIVE';
interface AgentScreenProps { onBack: () => void; }

/* ── SVG Icons ────────────────────────────────────────────────────────────── */
const SP = { fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2 };

function IcoArrowLeft({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19 12H5" stroke={color} {...SP} />
      <Path d="M12 19l-7-7 7-7" stroke={color} {...SP} />
    </Svg>
  );
}
function IcoX({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} {...SP} />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} {...SP} />
    </Svg>
  );
}
function IcoBot({ size = 40, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="8" width="18" height="12" rx="3" stroke={color} {...SP} />
      <Circle cx="9" cy="14" r="1.5" fill={color} />
      <Circle cx="15" cy="14" r="1.5" fill={color} />
      <Path d="M12 8V5" stroke={color} {...SP} />
      <Circle cx="12" cy="4" r="1" fill={color} />
      <Path d="M9.5 17.5h5" stroke={color} {...SP} />
    </Svg>
  );
}
function IcoMail({ size = 38, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} {...SP} />
      <Polyline points="22,6 12,13 2,6" stroke={color} {...SP} />
    </Svg>
  );
}
function IcoSend({ size = 16, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22 2L11 13" stroke={color} {...SP} />
      <Path d="M22 2l-7 20-4-9-9-4 20-7z" stroke={color} {...SP} />
    </Svg>
  );
}
function IcoWifi({ size = 13, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.55a11 11 0 0114.08 0" stroke={color} {...SP} />
      <Path d="M1.42 9a16 16 0 0121.16 0" stroke={color} {...SP} />
      <Path d="M8.53 16.11a6 6 0 016.95 0" stroke={color} {...SP} />
      <Circle cx="12" cy="20" r="1" fill={color} />
    </Svg>
  );
}
function IcoPower({ size = 16, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18.36 6.64a9 9 0 11-12.72 0" stroke={color} {...SP} />
      <Line x1="12" y1="2" x2="12" y2="12" stroke={color} {...SP} />
    </Svg>
  );
}
function IcoShield({ size = 16, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} {...SP} />
    </Svg>
  );
}
function IcoTerminal({ size = 13, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="4 17 10 11 4 5" stroke={color} {...SP} />
      <Line x1="12" y1="19" x2="20" y2="19" stroke={color} {...SP} />
    </Svg>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────────────── */
export default function AgentScreen({ onBack }: AgentScreenProps) {
  const themeMode = useSelector((s: RootState) => s.theme.mode);
  const isDark = themeMode === 'dark';
  const t = getTokens(themeMode);

  const user = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);
  const userEmail = user?.email ?? '';
  const userId = user?._id ?? '';

  const [screen, setScreen] = useState<AgentPage>('MENU');
  const [otp, setOtp] = useState('');
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<any>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  }, []);

  const startAutomation = async () => {
    if (!accessToken) { Alert.alert('Error', 'Not authenticated.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/remote-access/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (data.status === 'OK') setScreen('OTP');
      else Alert.alert('Error', data.message ?? 'Could not send access code.');
    } catch { Alert.alert('Error', `Server unreachable: ${BASE_URL}`); }
    finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    if (!accessToken) { Alert.alert('Error', 'Not authenticated.'); return; }
    if (!otp.trim()) { Alert.alert('Error', 'Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/remote-access/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email: userEmail, code: otp.trim() }),
      });
      const data = await res.json();
      if (data.status === 'OK') { setScreen('ACTIVE'); initSocket(data.token); }
      else Alert.alert('Invalid Code', 'Check your email and try again.');
    } catch { Alert.alert('Error', 'Verification failed.'); }
    finally { setLoading(false); }
  };

  const initSocket = (sessionToken: string) => {
    if (socketRef.current) socketRef.current.disconnect();
    socketRef.current = io(BASE_URL, { transports: ['websocket'], auth: { token: sessionToken } });
    socketRef.current.on('connect', () => { socketRef.current.emit('join', userId); addLog('System: Secure Neural Bridge Established'); });
    socketRef.current.on('MOBILE_EXECUTION_UPDATE', (d: any) => addLog(`${String(d.status).toUpperCase()}: ${d.message}`));
    socketRef.current.on('disconnect', () => addLog('System: Connection Terminated'));
    socketRef.current.on('connect_error', (e: any) => addLog(`ERROR: ${e?.message ?? 'Connection failed'}`));
  };

  const sendCommand = async () => {
    if (!prompt.trim() || !accessToken) return;
    try {
      await fetch(`${BASE_URL}/agent/remote-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      addLog(`SENT: ${prompt.trim()}`);
      setPrompt('');
    } catch { addLog('ERROR: Could not reach desktop agent'); }
  };

  const exitSession = () => {
    if (socketRef.current) socketRef.current.disconnect();
    setScreen('MENU'); setLogs([]); setOtp('');
  };

  const authed = !!accessToken;
  const authColor = authed ? t.status.success : t.status.error;
  const authBg = authed ? t.status.successSubtle : t.status.errorSubtle;

  return (
    <SafeAreaView edges={[]} style={[s.safe, { backgroundColor: t.background.screen }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.background.screen} />

      {/* Header — identical structure to BrainAskScreen / NeuralGraphScreen */}
      <View style={[s.header, { borderBottomColor: t.border.subtle }]}>
        <TouchableOpacity
          style={[s.headerBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
          onPress={screen !== 'MENU' ? exitSession : onBack}
          activeOpacity={0.8}>
          {screen !== 'MENU' ? <IcoX size={16} color={t.text.primary} /> : <IcoArrowLeft size={18} color={t.text.primary} />}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: t.text.primary }]}>AI Agent</Text>
          <Text style={[s.headerSub, { color: t.text.muted }]}>remote desktop control</Text>
        </View>
        <View style={[s.authChip, { backgroundColor: authBg, borderColor: authColor }]}>
          <View style={[s.authDot, { backgroundColor: authColor }]} />
          <Text style={[s.authLabel, { color: authColor }]}>{authed ? 'Auth OK' : 'No Auth'}</Text>
        </View>
      </View>

      {/* ── MENU ─────────────────────────────────────────────────────── */}
      {screen === 'MENU' && (
        <View style={s.center}>
          <View style={[s.heroIcon, { backgroundColor: t.primary.default + '14', borderColor: t.primary.default + '30' }]}>
            <IcoBot size={42} color={t.primary.accent} />
          </View>
          <Text style={[s.heroTitle, { color: t.text.primary }]}>AI Agent</Text>
          <Text style={[s.heroSub, { color: t.text.muted }]}>
            Remotely control your desktop Chrome{'\n'}via AI agent commands
          </Text>

          <View style={[s.emailPill, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
            <Text style={[s.emailLabel, { color: t.text.muted }]}>OTP WILL BE SENT TO</Text>
            <Text style={[s.emailValue, { color: t.primary.accent }]} numberOfLines={1}>
              {userEmail || 'Not signed in'}
            </Text>
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: t.primary.default, opacity: (loading || !authed) ? 0.5 : 1, shadowColor: t.primary.shadow }]}
            onPress={startAutomation} disabled={loading || !authed} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={t.text.onPrimary} />
              : <View style={s.btnInner}><IcoShield size={16} color={t.text.onPrimary} /><Text style={[s.primaryBtnTxt, { color: t.text.onPrimary }]}>Request Access Code</Text></View>}
          </TouchableOpacity>

          {!authed && (
            <Text style={[s.warnTxt, { color: t.status.error }]}>Sign in to use the AI Agent</Text>
          )}
        </View>
      )}

      {/* ── OTP ──────────────────────────────────────────────────────── */}
      {screen === 'OTP' && (
        <View style={s.center}>
          <View style={[s.heroIcon, { backgroundColor: t.primary.default + '14', borderColor: t.primary.default + '30' }]}>
            <IcoMail size={38} color={t.primary.accent} />
          </View>
          <Text style={[s.heroTitle, { color: t.text.primary }]}>Enter Access Code</Text>
          <Text style={[s.heroSub, { color: t.text.muted }]}>
            {'A 6-digit code was sent to\n'}
            <Text style={{ color: t.primary.accent, fontWeight: '700' }}>{userEmail}</Text>
          </Text>

          <TextInput
            style={[s.otpInput, { backgroundColor: t.background.input, color: t.primary.accent, borderColor: t.border.default }]}
            value={otp} onChangeText={setOtp}
            placeholder="000000" placeholderTextColor={t.text.placeholder}
            keyboardType="number-pad" maxLength={6} textAlign="center" />

          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: t.primary.default, opacity: loading ? 0.5 : 1, shadowColor: t.primary.shadow }]}
            onPress={verifyOTP} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={t.text.onPrimary} />
              : <Text style={[s.primaryBtnTxt, { color: t.text.onPrimary }]}>Verify Identity</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScreen('MENU')} style={s.cancelTouchable}>
            <Text style={[s.cancelTxt, { color: t.text.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ACTIVE ───────────────────────────────────────────────────── */}
      {screen === 'ACTIVE' && (
        <View style={{ flex: 1 }}>

          {/* Connection banner */}
          <View style={[s.connBanner, { backgroundColor: t.status.successSubtle, borderColor: t.status.success + '40', marginHorizontal: 16, marginTop: 12 }]}>
            <IcoWifi size={13} color={t.status.success} />
            <Text style={[s.connText, { color: t.status.success }]}>Neural Bridge Active</Text>
            <Text style={[s.connEmail, { color: t.text.muted }]} numberOfLines={1}> · {userEmail}</Text>
          </View>

          {/* Composer */}
          <View style={[s.composer, { backgroundColor: t.background.surface, borderColor: t.border.default, marginHorizontal: 16, marginTop: 12 }]}>
            <TextInput
              style={[s.commandInput, { backgroundColor: t.background.input, color: t.text.primary, borderColor: t.border.subtle }]}
              value={prompt} onChangeText={setPrompt}
              placeholder="Enter desktop command..." placeholderTextColor={t.text.placeholder}
              multiline textAlignVertical="top" />
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: t.primary.default, opacity: prompt.trim() ? 1 : 0.3, shadowColor: t.primary.shadow }]}
              onPress={sendCommand} disabled={!prompt.trim()} activeOpacity={0.85}>
              <View style={s.btnInner}>
                <IcoSend size={15} color={t.text.onPrimary} />
                <Text style={[s.sendBtnTxt, { color: t.text.onPrimary }]}>Dispatch to Desktop</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Log header */}
          <View style={[s.logHeader, { marginHorizontal: 16 }]}>
            <IcoTerminal size={12} color={t.text.muted} />
            <Text style={[s.logHeaderTxt, { color: t.text.muted }]}>EXECUTION LOG</Text>
          </View>

          {/* Logs */}
          <ScrollView
            style={[s.logBox, { backgroundColor: isDark ? '#050508' : t.background.input, borderColor: t.border.subtle, marginHorizontal: 16 }]}
            showsVerticalScrollIndicator={false}>
            {logs.length === 0
              ? <Text style={[s.logEmpty, { color: t.text.muted }]}>Waiting for events...</Text>
              : logs.map((l, i) => (
                  <Text key={i} style={[s.logLine, {
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    color: l.includes('ERROR') ? t.status.error : l.includes('System') ? '#f59e0b' : t.status.success,
                  }]}>{l}</Text>
                ))}
          </ScrollView>

          {/* Disconnect */}
          <TouchableOpacity
            style={[s.disconnectBtn, { borderColor: t.status.error }]}
            onPress={exitSession} activeOpacity={0.85}>
            <IcoPower size={16} color={t.status.error} />
            <Text style={[s.disconnectTxt, { color: t.status.error }]}>Disconnect Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  headerBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 10, letterSpacing: 0.8, marginTop: 1 },
  authChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  authDot: { width: 6, height: 6, borderRadius: 3 },
  authLabel: { fontSize: 10, fontWeight: '700' },

  // Menu / OTP
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  heroIcon: { alignSelf: 'center', width: 88, height: 88, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  heroTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  emailPill: { borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 24 },
  emailLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  emailValue: { fontSize: 14, fontWeight: '700' },
  primaryBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6 },
  primaryBtnTxt: { fontSize: 15, fontWeight: '700' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  warnTxt: { fontSize: 12, textAlign: 'center', marginTop: 14, fontWeight: '600' },
  otpInput: { fontSize: 30, borderRadius: 14, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 20, fontWeight: '900', letterSpacing: 14 },
  cancelTouchable: { marginTop: 20, alignItems: 'center' },
  cancelTxt: { fontSize: 13, fontWeight: '600' },

  // Active
  connBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  connText: { fontSize: 12, fontWeight: '700' },
  connEmail: { fontSize: 11, flex: 1 },
  composer: { borderRadius: 16, borderWidth: 1, padding: 14 },
  commandInput: { borderRadius: 10, borderWidth: 1, padding: 12, minHeight: 72, fontSize: 14, marginBottom: 10 },
  sendBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 5 },
  sendBtnTxt: { fontSize: 14, fontWeight: '700' },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 6 },
  logHeaderTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  logBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  logEmpty: { fontSize: 12, fontStyle: 'italic' },
  logLine: { fontSize: 11, marginBottom: 5, lineHeight: 16 },
  disconnectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 16, borderRadius: 13, borderWidth: 1.5, paddingVertical: 13, gap: 10 },
  disconnectTxt: { fontSize: 14, fontWeight: '700' },
});

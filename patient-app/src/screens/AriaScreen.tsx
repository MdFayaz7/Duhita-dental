import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import AvatarView, { type AvatarEvent, type AvatarHandle } from '../components/AvatarView';
import MessageBubble from '../components/MessageBubble';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { getHealth, respond, talk, type ChatMessage } from '../lib/api';

type SpeechLang = 'en-IN' | 'te-IN';
import { colors } from '../theme';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

const STORE_KEY = 'dental-chat-v2';
const LANG_KEY = 'speech-lang';
const GREETING: ChatMessage = {
  id: 'greet',
  role: 'assistant',
  content: 'Namaskaram! I’m Duhita AI. Tap the mic and tell me about your teeth, in English or Telugu.',
};
const SUGGESTIONS = ['I have a toothache', 'పంటి నొప్పిగా ఉంది', 'Why do my gums bleed?', 'చిగుళ్ల నుంచి రక్తం వస్తోంది', 'Sensitive teeth'];
const STATUS: Record<Phase, string> = {
  idle: 'Tap the mic to talk',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking · tap her to stop',
};
const uid = () => Math.random().toString(36).slice(2, 10);
const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

export default function AriaScreen() {
  const { height } = useWindowDimensions();
  const avatar = useRef<AvatarHandle>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [avatarReady, setAvatarReady] = useState(false);
  const [lang, setLang] = useState<SpeechLang>('en-IN');
  const [notice, setNotice] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  const requestId = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40))).catch(() => {});
  }, [messages]);

  useEffect(() => {
    AsyncStorage.multiGet([STORE_KEY, LANG_KEY])
      .then(([[, saved], [, l]]) => {
        if (saved) setMessages(JSON.parse(saved));
        if (l === 'en-IN' || l === 'te-IN') setLang(l);
      })
      .catch(() => {});
    getHealth()
      .then((h) => !h.llm && setNotice('Server has no AI key configured.'))
      .catch((e) => setNotice(e.message));
  }, []);

  const chooseLang = (l: SpeechLang) => {
    tap();
    setLang(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  };

  const ask = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content) return;
      const id = ++requestId.current;
      avatar.current?.stop();
      const user: ChatMessage = { id: uid(), role: 'user', content };
      const history = [...messagesRef.current.filter((m) => m.id !== GREETING.id), user];
      setMessages((prev) => [...prev, user]);
      setInput('');
      setNotice(null);
      setPhase('thinking');
      try {
        const res = await respond(history, avatarReady, lang);
        if (id !== requestId.current) return; // superseded by a newer question
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: res.reply }]);
        if (res.speech && avatarReady) avatar.current?.speak(res.speech);
        else setPhase('idle');
        if (res.ttsError) setNotice(res.ttsError);
      } catch (e) {
        if (id !== requestId.current) return;
        setNotice((e as Error).message);
        setPhase('idle');
      }
    },
    [avatarReady, lang],
  );

  // Voice turn: recording → server (transcribe + reply + speech) in one round trip.
  const onRecorded = useCallback(
    async (uri: string) => {
      avatar.current?.listening(false);
      const id = ++requestId.current;
      const history = messagesRef.current.filter((m) => m.id !== GREETING.id);
      const pending: ChatMessage = { id: uid(), role: 'user', content: '🎙 …' };
      setMessages((prev) => [...prev, pending]);
      setNotice(null);
      setPhase('thinking');
      try {
        const res = await talk(uri, history, lang);
        if (id !== requestId.current) return;
        setMessages((prev) => [
          ...prev.map((m) => (m.id === pending.id ? { ...m, content: res.heard || '🎙 (unclear)' } : m)),
          { id: uid(), role: 'assistant', content: res.reply },
        ]);
        if (res.speech && avatarReady) avatar.current?.speak(res.speech);
        else setPhase('idle');
        if (res.ttsError) setNotice(res.ttsError);
      } catch (e) {
        if (id !== requestId.current) return;
        setMessages((prev) => prev.filter((m) => m.id !== pending.id));
        setNotice((e as Error).message);
        setPhase('idle');
      }
    },
    [avatarReady, lang],
  );

  const mic = useVoiceRecorder(onRecorded);

  const toggleMic = async () => {
    tap();
    if (mic.recording) return mic.stop();
    avatar.current?.stop(); // barge-in
    requestId.current++;
    if (await mic.start()) {
      avatar.current?.listening(true);
      setPhase('listening');
    }
  };

  // Keep avatar/phase in sync with the recorder.
  useEffect(() => {
    if (!mic.recording) {
      avatar.current?.listening(false);
      setPhase((p) => (p === 'listening' ? 'idle' : p));
    }
  }, [mic.recording]);

  const onAvatarEvent = useCallback((e: AvatarEvent) => {
    if (e.type === 'ready') setAvatarReady(true);
    else if (e.type === 'speaking') setPhase('speaking');
    else if (e.type === 'done') setPhase((p) => (p === 'speaking' ? 'idle' : p));
    else if (e.type === 'error') setNotice(`Avatar: ${e.message}`);
  }, []);

  const reset = () => {
    tap();
    avatar.current?.stop();
    requestId.current++;
    setPhase('idle');
    setMessages([GREETING]);
  };

  const busy = phase === 'thinking';
  const shownNotice = mic.error ?? notice;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Duhita AI</Text>
          <Text style={styles.subtitle}>AI Dental Assistant · English | తెలుగు</Text>
        </View>
        <Pressable onPress={reset} style={styles.iconBtn} accessibilityLabel="New conversation">
          <Text style={styles.iconTxt}>↺</Text>
        </Pressable>
      </View>

      <View style={[styles.stage, { height: Math.round(height * 0.44) }]}>
        <AvatarView ref={avatar} onEvent={onAvatarEvent} />
        {phase === 'speaking' && <Pressable style={StyleSheet.absoluteFill} onPress={() => avatar.current?.stop()} />}
        {!avatarReady && (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        <View style={styles.stageBar}>
          <View style={styles.segment}>
            {(['en-IN', 'te-IN'] as const).map((l) => (
              <Pressable key={l} onPress={() => chooseLang(l)} style={[styles.segBtn, lang === l && styles.segOn]} accessibilityLabel={`Speak in ${l === 'en-IN' ? 'English' : 'Telugu'}`}>
                <Text style={[styles.segTxt, lang === l && styles.segTxtOn]}>{l === 'en-IN' ? 'English' : 'తెలుగు'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.statusPill}>
            {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <View style={[styles.dot, phase === 'listening' && styles.dotRec]} />}
            <Text style={styles.statusTxt}>{STATUS[phase]}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          style={styles.flex}
          data={[...messages].reverse()}
          inverted
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />

        {messages.length <= 2 && phase === 'idle' && (
          <ScrollView horizontal style={styles.chipScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => ask(s)} style={styles.chip}>
                <Text style={styles.chipTxt}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {shownNotice && (
          <Pressable
            onPress={() => {
              setNotice(null);
              mic.clearError();
            }}
          >
            <Text style={styles.notice}>{shownNotice}</Text>
          </Pressable>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={mic.recording ? 'Listening… tap ■ when done' : 'Type in English or తెలుగు…'}
            placeholderTextColor={colors.muted}
            maxLength={500}
            onSubmitEditing={() => ask(input)}
            returnKeyType="send"
            editable={!mic.recording}
          />
          {input.trim() && !mic.recording ? (
            <Pressable onPress={() => ask(input)} style={[styles.roundBtn, styles.primaryBtn]} accessibilityLabel="Send">
              <Text style={styles.btnIcon}>➤</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={toggleMic}
              disabled={busy}
              style={[styles.roundBtn, mic.recording ? styles.recBtn : styles.primaryBtn, busy && styles.disabled]}
              accessibilityLabel={mic.recording ? 'Stop listening' : 'Talk to Duhita AI'}
            >
              <Text style={styles.btnIcon}>{mic.recording ? '■' : '🎙'}</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.disclaimer}>General guidance only — not a diagnosis. In an emergency visit a hospital.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconTxt: { fontSize: 18, color: colors.text },
  stage: { marginHorizontal: 12, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.stageTop },
  loader: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  stageBar: { position: 'absolute', left: 10, right: 10, bottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, padding: 3 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 11 },
  segOn: { backgroundColor: colors.primary },
  segTxt: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  segTxtOn: { color: '#fff' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dotRec: { backgroundColor: colors.danger },
  statusTxt: { fontSize: 12, color: colors.text, fontWeight: '600' },
  list: { paddingVertical: 8 },
  chipScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, alignItems: 'center' },
  chip: { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipTxt: { color: colors.primaryDark, fontSize: 13, fontWeight: '600' },
  notice: { color: colors.danger, fontSize: 12.5, textAlign: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 6 },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 15.5,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roundBtn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: colors.primary },
  recBtn: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  btnIcon: { color: '#fff', fontSize: 20 },
  disclaimer: { fontSize: 10.5, color: colors.muted, textAlign: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
});

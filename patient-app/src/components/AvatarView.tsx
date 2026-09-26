import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { API_URL, type Speech } from '../lib/api';
import { playWebVoice, stopWebVoice } from '../lib/webVoice';

export type AvatarEvent =
  | { type: 'ready' }
  | { type: 'speaking' }
  | { type: 'done' }
  | { type: 'progress'; value: number }
  | { type: 'error'; message: string };

export type AvatarHandle = {
  speak: (speech: Speech) => void;
  stop: () => void;
  listening: (on: boolean) => void;
};

type Command =
  | ({ type: 'speak' } & Speech)
  | { type: 'stop' }
  | { type: 'listening'; on: boolean }
  | { type: 'drive'; speaking: boolean; level: number; vis: Record<string, number> };

const AVATAR_PAGE = `${API_URL}/avatar/?v=6`; // bump v to bust WebView caches after page changes
// On web the app plays the audio (so the browser never blocks it) and drives the lips remotely.
const WEB_AVATAR_PAGE = `${AVATAR_PAGE}&external=1`;

/**
 * Talking avatar page (server/public/index.html) rendered in a WebView (iframe on web).
 * Native: the page plays the reply audio and lip-syncs to it.
 * Web: the app plays the audio (see lib/webVoice) and streams lip-sync values to the page.
 */
export default function AvatarView({ ref, onEvent }: { ref?: Ref<AvatarHandle>; onEvent: (e: AvatarEvent) => void }) {
  const webRef = useRef<WebView>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const send = (cmd: Command) => {
    const json = JSON.stringify(cmd);
    if (Platform.OS === 'web') frameRef.current?.contentWindow?.postMessage(json, '*');
    else webRef.current?.injectJavaScript(`window.avatarCommand && window.avatarCommand(${json});true;`);
  };

  const drive = (d: { speaking: boolean; level: number; vis: Record<string, number> }) => send({ type: 'drive', ...d });

  useImperativeHandle(ref, () => ({
    speak: (speech) => {
      if (Platform.OS !== 'web') return send({ type: 'speak', ...speech });
      playWebVoice(speech.audio, drive, () => onEvent({ type: 'speaking' }), () => onEvent({ type: 'done' })).catch((e) => {
        onEvent({ type: 'error', message: String(e?.message ?? e) });
        onEvent({ type: 'done' });
      });
    },
    stop: () => (Platform.OS === 'web' ? stopWebVoice(drive) : send({ type: 'stop' })),
    listening: (on) => send({ type: 'listening', on }),
  }));

  const parse = (data: string) => {
    try {
      onEvent(JSON.parse(data));
    } catch {}
  };

  if (Platform.OS === 'web') {
    // Dev preview in the browser: same page in an iframe.
    return (
      <View style={styles.fill}>
        <WebFrame frameRef={frameRef} onMessage={parse} />
      </View>
    );
  }

  return (
    <WebView
      ref={webRef}
      source={{ uri: AVATAR_PAGE }}
      style={styles.web}
      containerStyle={styles.fill}
      originWhitelist={['*']}
      javaScriptEnabled
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      androidLayerType="hardware"
      onMessage={(e: WebViewMessageEvent) => parse(e.nativeEvent.data)}
      onError={() => onEvent({ type: 'error', message: `Can't load avatar from ${AVATAR_PAGE}` })}
    />
  );
}

function WebFrame({ frameRef, onMessage }: { frameRef: Ref<HTMLIFrameElement>; onMessage: (d: string) => void }) {
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });
  useEffect(() => {
    const origin = new URL(API_URL).origin;
    const fn = (e: MessageEvent) => typeof e.data === 'string' && e.origin === origin && handler.current(e.data);
    window.addEventListener('message', fn);
    return () => window.removeEventListener('message', fn);
  }, []);
  return <iframe ref={frameRef} src={WEB_AVATAR_PAGE} allow="autoplay" style={{ border: 0, width: '100%', height: '100%' }} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
});

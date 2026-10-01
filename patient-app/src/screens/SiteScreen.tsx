import { useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { Button } from '../components/ui';
import { clinic, type } from '../theme';

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://duhitadental.com').replace(/\/+$/, '');

/**
 * The clinic's own website, shown inside the app.
 *
 * Its header and floating buttons are hidden, because the app already provides
 * the top tabs and the Call / Book bar. Anything the app does better — booking,
 * registration, the profile — is caught here and handed to the app's own screens.
 */
const HIDE_SITE_CHROME = `
  (function () {
    var css = document.createElement('style');
    css.textContent = [
      'header { display: none !important; }',
      'a[aria-label="Chat on WhatsApp"] { display: none !important; }',
      /* the app has its own AI assistant button, so the site's floating one is hidden here */
      'a[aria-label="Ask Duhita AI, our dental assistant"] { display: none !important; }',
      /* the app has its own Call / Book bar, so the hero's one is hidden here */
      'nav[aria-label="Quick actions"] { display: none !important; }',
      'body { -webkit-user-select: none; user-select: none; }'
    ].join('');
    document.head.appendChild(css);

    // The hero leaves room for the website's own header, which the app hides —
    // without this the page ends in a white strip above the app's action bar.
    function fitHero() {
      var media = document.querySelector('.hero-media');
      var hero = media && media.closest('section');
      if (hero) hero.style.minHeight = '100svh';
    }
    fitHero();
    new MutationObserver(fitHero).observe(document.body, { childList: true, subtree: true });
  })();
  true;
`;

/** Website paths the app handles itself. */
const NATIVE_ROUTES: { match: RegExp; screen: string }[] = [
  { match: /\/patients\/book-appointment/, screen: 'Book' },
  { match: /\/patients\/register/, screen: 'Profile' },
  { match: /\/admin/, screen: 'Profile' },
];

export default function SiteScreen({ path = '/' }: { path?: string }) {
  const nav = useNavigation<any>();
  const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const canGoBack = useRef(false);

  // Android's back button walks back through the website before leaving the tab.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack.current) {
          web.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, []),
  );

  const onNavigate = (event: WebViewNavigation) => {
    canGoBack.current = event.canGoBack;
  };

  /** Links that belong to the phone (calls, WhatsApp, Maps) or to an app screen. */
  const onShouldStart = (req: WebViewNavigation) => {
    const url = req.url;
    if (/^(tel:|mailto:|whatsapp:|geo:)/.test(url) || /wa\.me|google\.[a-z.]+\/maps|maps\.app/.test(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    const native = NATIVE_ROUTES.find((r) => r.match.test(url));
    if (native) {
      nav.navigate(native.screen);
      return false;
    }
    // Anything outside the clinic's site opens in the phone's browser.
    if (!url.startsWith(SITE_URL) && !url.startsWith('about:')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  };

  if (failed) {
    return (
      <View style={s.center}>
        <Text style={[type.h3, { textAlign: 'center' }]}>Can’t reach the clinic website</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: 6 }]}>
          Check your internet connection and try again.
        </Text>
        <Button
          label="Try again"
          style={{ marginTop: 18 }}
          onPress={() => {
            setFailed(false);
            setLoading(true);
            web.current?.reload();
          }}
        />
      </View>
    );
  }

  return (
    <View style={s.fill}>
      <WebView
        ref={web}
        source={{ uri: `${SITE_URL}${path}` }}
        style={s.fill}
        originWhitelist={['*']}
        injectedJavaScript={HIDE_SITE_CHROME}
        onNavigationStateChange={onNavigate}
        onShouldStartLoadWithRequest={onShouldStart}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        javaScriptEnabled
        domStorageEnabled
      />
      {loading && (
        <View style={s.loading} pointerEvents="none">
          <ActivityIndicator color={clinic.slate} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: clinic.ivory },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: clinic.ivory },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: clinic.ivory,
  },
});

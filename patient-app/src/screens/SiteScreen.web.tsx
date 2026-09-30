import { createElement, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { clinic } from '../theme';

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://duhitadental.com').replace(/\/+$/, '');

/**
 * Browser build of the site screen.
 *
 * The phone build uses a real WebView; a browser cannot, so it shows the same
 * page in a frame. This exists so the app can be checked on a laptop — the
 * shipped Android and iOS apps always use SiteScreen.tsx.
 */
export default function SiteScreen({ path = '/' }: { path?: string }) {
  const [loading, setLoading] = useState(true);

  const frame = createElement('iframe', {
    src: `${SITE_URL}${path}`,
    onLoad: () => setLoading(false),
    style: { border: 'none', width: '100%', height: '100%', background: clinic.ivory },
    title: 'Duhita Dental',
  });

  return (
    <View style={s.fill}>
      {frame}
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

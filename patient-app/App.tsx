import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import ActionBar from './src/components/ActionBar';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import AriaScreen from './src/screens/AriaScreen';
import BookScreen from './src/screens/BookScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SiteScreen from './src/screens/SiteScreen';
import { AuthProvider } from './src/lib/auth';
import { categories, clinicInfo } from './src/data/clinic';
import { clinic, radius, shadow } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
export const navRef = createNavigationContainerRef<any>();

type MenuItem = {
  label: string;
  tab?: string;      // one of the five sections kept alive in the tab navigator
  path?: string;     // a website page, opened as its own screen
  screen?: string;   // an app screen
  children?: MenuItem[];
};

/** The same menu the website shows on a phone, with Profile in place of "For Patients". */
const MENU: MenuItem[] = [
  { label: 'Home', tab: 'Home' },
  {
    label: 'About Us',
    tab: 'About',
    children: [
      { label: 'About Duhita', tab: 'About' },
      { label: 'Meet Dr. Sasidhar', path: '/about/dr-nalluru-sasidhar' },
      { label: 'Clinic Gallery', path: '/about/clinic-gallery' },
      { label: 'Patient Reviews', path: '/about/reviews' },
      { label: 'Our Research', path: '/about/our-research' },
    ],
  },
  {
    label: 'Services',
    tab: 'Services',
    children: [
      ...categories.map((c) => ({ label: c.name, path: `/services/${c.slug}` })),
      { label: 'Community Dentistry (Free Camps)', path: '/services/community-dentistry' },
      { label: 'All Services', tab: 'Services' },
    ],
  },
  {
    label: 'Profile',
    tab: 'Profile',
    children: [
      { label: 'My appointments', screen: 'Appointments' },
      { label: 'Book a visit', screen: 'Book' },
      { label: 'Records & documents', tab: 'Profile' },
      { label: 'Personal details', tab: 'Profile' },
    ],
  },
  { label: 'Contact', tab: 'Contact' },
];

/** Top bar: the clinic's name and the menu button, like the website on a phone. */
function Brand({ current, onMenu }: { current?: string; onMenu: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.brand, { paddingTop: insets.top }]}>
      <Image source={require('./assets/clinic-logo.png')} style={s.logo} resizeMode="contain" />
      <View style={{ flex: 1 }}>
        <Text style={s.brandName}>{clinicInfo.name}</Text>
        <Text style={s.brandSub}>Multispeciality Dental Centre</Text>
      </View>
      <Pressable
        onPress={onMenu}
        hitSlop={10}
        style={({ pressed }) => [s.menuBtn, pressed && { opacity: 0.6 }]}
        accessibilityLabel="Open menu"
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={s.menuLine} />
        ))}
      </Pressable>
    </View>
  );
}

/** The website's mobile menu, as a sheet: tap a row to open it, tap the arrow for its pages. */
function MenuSheet({
  open,
  current,
  onClose,
  onPick,
}: {
  open: boolean;
  current?: string;
  onClose: () => void;
  onPick: (item: MenuItem) => void;
}) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} />
      <View style={[s.sheet, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={s.sheetHead}>
          <Image source={require('./assets/clinic-logo.png')} style={s.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={s.brandName}>{clinicInfo.name}</Text>
            <Text style={s.brandSub}>Multispeciality Dental Centre</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn} accessibilityLabel="Close menu">
            <Text style={s.closeIcon}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {MENU.map((item) => {
            const active = current === item.tab;
            const isOpen = expanded === item.label;
            return (
              <View key={item.label}>
                <View style={s.menuRow}>
                  <Pressable style={s.menuRowMain} onPress={() => onPick(item)}>
                    <Text style={[s.menuRowText, active && { fontWeight: '800' }]}>{item.label}</Text>
                  </Pressable>
                  {item.children ? (
                    <Pressable
                      hitSlop={12}
                      onPress={() => setExpanded(isOpen ? null : item.label)}
                      style={s.menuToggle}
                      accessibilityLabel={`${isOpen ? 'Hide' : 'Show'} ${item.label} pages`}
                    >
                      <Text style={[s.menuChevron, isOpen && { transform: [{ rotate: '90deg' }] }]}>›</Text>
                    </Pressable>
                  ) : active ? (
                    <View style={s.activeDot} />
                  ) : (
                    <Text style={s.menuChevron}>›</Text>
                  )}
                </View>

                {isOpen &&
                  item.children?.map((child) => (
                    <Pressable
                      key={child.label}
                      onPress={() => onPick(child)}
                      style={({ pressed }) => [s.subRow, pressed && { backgroundColor: clinic.ivoryDeep }]}
                    >
                      <Text style={s.subRowText}>{child.label}</Text>
                    </Pressable>
                  ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Duhita AI, always a tap away. */
function AriaButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Ask Duhita AI, the AI dental assistant"
      style={({ pressed }) => [
        s.ariaFab,
        { bottom: 74 + Math.max(insets.bottom, 10) },
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      <Image source={require('./assets/avatar.png')} style={s.ariaFace} />
    </Pressable>
  );
}

// Home, About, Services and Contact are the clinic's own website, shown in the app.
const Home = () => <SiteScreen path="/" />;
const About = () => <SiteScreen path="/about" />;
const Services = () => <SiteScreen path="/services" />;
const Contact = () => <SiteScreen path="/contact" />;

/** Any other website page, opened from the menu with a back arrow. */
const PageScreen = ({ route }: any) => <SiteScreen path={route.params?.path ?? '/'} />;

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // the menu button replaces the tab row
      }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="About" component={About} />
      <Tab.Screen name="Services" component={Services} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Contact" component={Contact} />
    </Tab.Navigator>
  );
}

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: clinic.ivory,
    card: clinic.ivory,
    text: clinic.ink,
    primary: clinic.slate,
  },
};

export default function App() {
  const [route, setRoute] = useState<string | undefined>(undefined);
  const [menu, setMenu] = useState(false);
  const onAria = route === 'Aria';

  const go = (item: MenuItem) => {
    setMenu(false);
    if (!navRef.isReady()) return;
    if (item.tab) navRef.navigate('Tabs', { screen: item.tab });
    else if (item.screen) navRef.navigate(item.screen);
    else if (item.path) navRef.navigate('Page', { path: item.path, title: item.label });
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: clinic.ivory }}>
          <NavigationContainer
            ref={navRef}
            theme={theme}
            onReady={() => setRoute(navRef.getCurrentRoute()?.name)}
            onStateChange={() => setRoute(navRef.getCurrentRoute()?.name)}
          >
            <Stack.Navigator
              screenOptions={{
                headerStyle: { backgroundColor: clinic.ivory },
                headerTintColor: clinic.ink,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: clinic.ivory },
              }}
            >
              <Stack.Screen
                name="Tabs"
                component={Tabs}
                options={{ header: () => <Brand current={route} onMenu={() => setMenu(true)} /> }}
              />
              <Stack.Screen
                name="Page"
                component={PageScreen}
                options={({ route }: any) => ({ title: route.params?.title ?? 'Duhita Dental' })}
              />
              <Stack.Screen name="Book" component={BookScreen} options={{ title: 'Book an appointment' }} />
              <Stack.Screen name="Appointments" component={AppointmentsScreen} options={{ title: 'My appointments' }} />
              <Stack.Screen name="Aria" component={AriaScreen} options={{ title: 'Duhita AI' }} />
            </Stack.Navigator>
          </NavigationContainer>

          {!onAria && <AriaButton onPress={() => navRef.isReady() && navRef.navigate('Aria')} />}
          {!onAria && <ActionBar onBook={() => navRef.isReady() && navRef.navigate('Book')} />}

          <MenuSheet open={menu} current={route} onClose={() => setMenu(false)} onPick={go} />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: clinic.ivory,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: clinic.line,
  },
  logo: { width: 32, height: 32, borderRadius: 7 },
  brandName: { fontSize: 15.5, fontWeight: '800', color: clinic.ink, letterSpacing: 0.2 },
  brandSub: { fontSize: 9, color: clinic.stone, letterSpacing: 0.6, textTransform: 'uppercase' },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
  menuLine: { width: 22, height: 2, borderRadius: 2, backgroundColor: clinic.ink },

  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,24,40,0.35)' },
  sheet: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '86%',
    maxWidth: 340,
    backgroundColor: clinic.ivory,
    paddingHorizontal: 18,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: clinic.line,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 20, color: clinic.ink },
  menuRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(16,24,40,0.10)',
    paddingHorizontal: 4,
  },
  menuRowMain: { flex: 1, justifyContent: 'center', minHeight: 56 },
  menuToggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  subRow: {
    minHeight: 46,
    justifyContent: 'center',
    paddingLeft: 14,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(16,24,40,0.06)',
  },
  subRowText: { fontSize: 15, color: clinic.body },
  menuRowText: { fontSize: 17, color: clinic.ink, fontWeight: '600' },
  menuChevron: { fontSize: 22, color: clinic.stone },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: clinic.slate },

  ariaFab: {
    position: 'absolute',
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0e9aa7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 30,
    ...shadow.card,
  },
  ariaFace: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#d9f3f7' },
});

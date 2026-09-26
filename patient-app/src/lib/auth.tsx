/** Who is signed in. The token is kept in the device's secure storage, never in plain storage. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiError,
  getProfile,
  login as apiLogin,
  register as apiRegister,
  type Patient,
  type RegisterInput,
} from './clinicApi';

const KEY = 'duhita.patient.token';

// SecureStore has no web build; the browser preview falls back to local storage.
const store = {
  get: () => (Platform.OS === 'web' ? AsyncStorage.getItem(KEY) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  clear: () => (Platform.OS === 'web' ? AsyncStorage.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

type AuthValue = {
  ready: boolean;
  token: string | null;
  patient: Patient | null;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  setPatient: (p: Patient) => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);

  // Restore the session on launch; a token the server no longer accepts is dropped.
  useEffect(() => {
    (async () => {
      try {
        const saved = await store.get();
        if (saved) {
          setToken(saved);
          try {
            setPatient(await getProfile(saved));
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
              await store.clear();
              setToken(null);
            }
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const start = useCallback(async (session: { access_token: string; patient: Patient }) => {
    await store.set(session.access_token);
    setToken(session.access_token);
    setPatient(session.patient);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      token,
      patient,
      signIn: async (phone, password) => start(await apiLogin(phone, password)),
      signUp: async (input) => start(await apiRegister(input)),
      signOut: async () => {
        await store.clear();
        setToken(null);
        setPatient(null);
      },
      setPatient,
      refresh: async () => {
        if (token) setPatient(await getProfile(token));
      },
    }),
    [ready, token, patient, start],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Who is signed in on the website — the same account the app uses. */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, getProfile, login as apiLogin, register as apiRegister } from './patientApi';

const KEY = 'duhita.patient.token';
const AuthContext = createContext(null);

export function PatientAuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(null);
  const [patient, setPatient] = useState(null);

  // Restore the session on load; a token the server no longer accepts is dropped.
  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (!saved) return setReady(true);
    setToken(saved);
    getProfile(saved)
      .then(setPatient)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          localStorage.removeItem(KEY);
          setToken(null);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const start = (session) => {
    localStorage.setItem(KEY, session.access_token);
    setToken(session.access_token);
    setPatient(session.patient);
  };

  const value = useMemo(
    () => ({
      ready,
      token,
      patient,
      setPatient,
      signIn: async (phone, password) => start(await apiLogin(phone, password)),
      signUp: async (input) => start(await apiRegister(input)),
      signOut: () => {
        localStorage.removeItem(KEY);
        setToken(null);
        setPatient(null);
      },
      refresh: async () => token && setPatient(await getProfile(token)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, token, patient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePatientAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('usePatientAuth must be used inside PatientAuthProvider');
  return ctx;
}

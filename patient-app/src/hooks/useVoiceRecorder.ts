import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

const SPEECH_DB = -45; // louder than this counts as speech
const SILENCE_MS = 1100; // stop after this much quiet following speech
const NO_SPEECH_MS = 8000; // give up if nothing is said
const MAX_MS = 30000;

/**
 * Tap-to-talk recorder that stops by itself when the speaker goes quiet.
 * Works on Android, iOS and web; the server transcribes the recording (Gemini), so any language works.
 */
export function useVoiceRecorder(onRecorded: (uri: string) => void) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 120);
  const [error, setError] = useState<string | null>(null);
  const heard = useRef(false);
  const lastLoud = useRef(0);
  const startedAt = useRef(0);
  const stopping = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
  });

  const stop = useCallback(
    async (discard = false) => {
      if (stopping.current || !recorder.getStatus().isRecording) return;
      stopping.current = true;
      try {
        await recorder.stop();
        // Leave record mode so replies play through the loudspeaker (iOS).
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
        if (discard) return;
        if (!heard.current) setError("I didn't hear anything. Tap the mic and speak.");
        else if (recorder.uri) onRecordedRef.current(recorder.uri);
      } finally {
        stopping.current = false;
      }
    },
    [recorder],
  );

  const start = useCallback(async () => {
    setError(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Please allow microphone access to talk to Duhita AI.');
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
      await recorder.prepareToRecordAsync();
      heard.current = false;
      startedAt.current = lastLoud.current = Date.now();
      recorder.record();
      return true;
    } catch (e) {
      setError(`Microphone error: ${(e as Error).message}`);
      return false;
    }
  }, [recorder]);

  // Voice-activity detection on the metering level. If metering isn't available,
  // treat the recording as speech and let the user tap again to stop.
  useEffect(() => {
    if (!state.isRecording) return;
    const now = Date.now();
    const level = state.metering;
    if (level === undefined || level > SPEECH_DB) {
      heard.current = true;
      if (level !== undefined) lastLoud.current = now;
    }
    const quietFor = now - lastLoud.current;
    const autoStop = level !== undefined && ((heard.current && quietFor > SILENCE_MS) || (!heard.current && quietFor > NO_SPEECH_MS));
    if (autoStop || now - startedAt.current > MAX_MS) stop();
  }, [state, stop]);

  return { recording: state.isRecording, level: state.metering ?? -160, error, clearError: () => setError(null), start, stop };
}

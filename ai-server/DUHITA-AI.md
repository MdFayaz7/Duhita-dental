# Dr. Aria: AI Dental Assistant (English + Telugu)

Dr. Aria is a mobile app built with Expo. Patients talk to an animated version of the Dr. Aria portrait, in English or Telugu, and hear her reply in a natural Indian female voice.

```
Mic recording → Groq Whisper (voice-to-text) → Groq (English) / Gemini (Telugu) → free Edge neural voice → avatar lip-sync
```

| Part | How it works | Cost |
|---|---|---|
| Speech-to-text | The app records your voice with `expo-audio`. Groq Whisper large-v3 transcribes it in about 0.5 s and detects Telugu by itself. Gemini is the backup. | Free |
| Brain | English: Groq `gpt-oss-120b` (about 0.5 s). Telugu: Google Gemini Flash (free key), which has much better Telugu than Groq. It tries the fastest model first and starts a backup model after 3.5 s or on an error. Models that are out of quota are skipped. OpenRouter free models are the backup for typed questions. | Free: about 20 requests/day per model, about 100/day across the 5 models |
| Voice | Microsoft Edge neural voices through `edge-tts-universal`: `en-IN-NeerjaExpressiveNeural` and `te-IN-ShrutiNeural`. | Free, no key |
| Avatar | `server/public/index.html` animates the portrait with WebGL (details below). | Free |

**How the avatar moves:** the jaw and lower lip drop, and the upper lip lifts. The teeth and tongue show when she opens her mouth. Her mouth widens for "ee" sounds and rounds for "oo". She also blinks, raises her eyebrows, and moves her head, nodding when she speaks. The mouth movement comes from the audio itself, using HeadAudio visemes plus loudness, so it works for Telugu too.

## Run

1. Put your keys in `server/.env`:
   - `GEMINI_API_KEY`: free from https://aistudio.google.com/apikey.
   - `OPENROUTER_API_KEY`: optional backup.
2. Start the server:
   ```bash
   cd server && npm start
   ```
3. Build and run the app. The microphone needs a development build:
   ```bash
   cd app && npx expo run:android
   ```

In development the app finds the server at your computer's LAN IP on port 8787. For production, set `EXPO_PUBLIC_API_URL`.

## Notes

- **Speed:** a full voice turn takes about 4–5 s in English and about 6 s in Telugu. The voice is generated sentence by sentence, in parallel.
- **Telugu:** when the తెలుగు toggle is on, replies are forced into Telugu script. Replies in English letters or other scripts are rejected and retried.
- **Sound in browsers:** if the browser blocks sound, the avatar shows a "Tap to enable her voice" button.
- **Avatar framing:**
  - `?zoom=` on the avatar URL changes the framing.
  - `?debug=1` shows live animation values.
  - The mouth and eye positions (`MOUTH`, `EYE_L`, `EYE_R`) are set in pixels of `avatar.png`. If you swap the portrait, update those constants.

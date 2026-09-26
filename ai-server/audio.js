import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

/** Any recording (m4a from phones, webm/ogg from browsers) → small 16 kHz mono mp3, base64. */
export function toMp3Base64(input) {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-b:a', '32k', '-f', 'mp3', 'pipe:1']);
    const chunks = [];
    let err = '';
    ff.stdout.on('data', (c) => chunks.push(c));
    ff.stderr.on('data', (c) => (err += c));
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks).toString('base64')) : reject(new Error(`ffmpeg: ${err.trim()}`))));
    ff.stdin.on('error', () => {}); // ffmpeg may close stdin early on bad input
    ff.stdin.end(input);
  });
}

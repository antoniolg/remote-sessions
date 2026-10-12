// Renders every deliverable into store/video/ and masters the audio.
// Usage: pnpm render [name…]   (names: launch-es, launch-en, launch-es-vertical, …; default: all)
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tools = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(tools, '..');
const tmp = join(tools, 'out');

const targets = [
  // Social launch video, 16:9 (main) and 9:16.
  ...['es', 'en'].flatMap((l) => [
    { name: `launch-${l}`, comp: `Launch-${l.toUpperCase()}`, kind: 'social' },
    { name: `launch-${l}-vertical`, comp: `LaunchVertical-${l.toUpperCase()}`, kind: 'social' },
    // App Store app preview for 6.9"/6.7" iPhones: 886×1920, H.264 ≤30 fps, AAC 256 kbps stereo.
    { name: `appstore-preview-${l}`, comp: `AppStorePreview-${l.toUpperCase()}`, kind: 'appstore' },
    // Google Play promo video (uploaded to YouTube): 16:9 with the Android app.
    { name: `play-promo-${l}`, comp: `PlayPromo-${l.toUpperCase()}`, kind: 'social' },
  ]),
];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: tools, stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString();

/** First loudnorm pass: measures the mix so the second pass can normalise it linearly (−14 LUFS, −1 dBTP). */
const measureJson = (file) => {
  const res = execFileSync(
    'sh',
    ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null - 2>&1`],
    { encoding: 'utf8' },
  );
  return JSON.parse(res.slice(res.lastIndexOf('{'), res.lastIndexOf('}') + 1));
};

const wanted = process.argv.slice(2);
mkdirSync(tmp, { recursive: true });
for (const t of targets.filter((t) => !wanted.length || wanted.includes(t.name))) {
  const raw = join(tmp, `${t.name}.raw.mp4`);
  const final = join(outDir, `${t.name}.mp4`);
  console.log(`▶ ${t.name}: rendering ${t.comp}`);
  run('npx', ['remotion', 'render', 'src/index.ts', t.comp, raw, '--codec=h264', '--crf=14', '--audio-codec=aac', '--audio-bitrate=320k', '--log=error']);
  const m = measureJson(raw);
  const audio = `loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  const video =
    t.kind === 'appstore'
      ? ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level:v', '4.0', '-b:v', '11M', '-maxrate', '12M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-r', '30']
      : ['-c:v', 'copy'];
  const part = `${final}.part.mp4`;
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-af', audio, ...video, '-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-shortest', '-movflags', '+faststart', part]);
  renameSync(part, final);
  rmSync(raw);
  console.log(`  ✓ ${final}`);
}

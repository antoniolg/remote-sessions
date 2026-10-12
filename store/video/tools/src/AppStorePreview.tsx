import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './components/Background';
import { Footage, Still } from './components/Footage';
import { Headline } from './components/Headline';
import { copy, Lang } from './copy';
import { footage, stateRows, tapFrames } from './footage';
import { C, easeInOut } from './theme';
import timeline from './timeline.json';

/**
 * App Store app preview (886×1920, 30 fps): only footage captured from the app, inset on the brand background,
 * with captions and the voice-over. No device frames, other apps or other platforms.
 */
export type AppStoreProps = { lang: Lang };

const A = timeline.appStore;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const screen = { w: 690, top: 395, radius: 64 };
const screenH = (screen.w * 2868) / 1320;

const Caption: React.FC<{ text: string; in: number; out: number }> = ({ text, in: start, out }) => (
  <div style={{ position: 'absolute', left: 40, right: 40, top: 70, height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Headline text={text} in={start} out={out} size={72} align="center" stagger={2} />
  </div>
);

const Screens: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const ft = footage.ios[lang];
  const S = A.scenes;
  const fade = (at: number) => interpolate(frame, [at, at + 8], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={S.connect + 2}>
        <Still src={ft.list} />
      </Sequence>
      <Sequence from={S.connect} durationInFrames={S.create + 8 - S.connect}>
        <Footage take={ft.connect} hold={40} />
      </Sequence>
      <Sequence from={S.create} durationInFrames={S.install + 8 - S.create}>
        <AbsoluteFill style={{ opacity: fade(S.create) }}>
          <Footage take={ft.create} hold={40} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={S.install} durationInFrames={S.welcome + 8 - S.install}>
        <AbsoluteFill style={{ opacity: fade(S.install) }}>
          <Still src={ft.install!} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={S.welcome}>
        <AbsoluteFill style={{ opacity: fade(S.welcome) }}>
          <Still src={ft.welcome!} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const Soundtrack: React.FC<{ lang: Lang }> = ({ lang }) => {
  const vo = A.vo[lang];
  const ft = footage.ios[lang];
  const duck = (f: number) =>
    Math.max(0, ...vo.at.map((at, i) =>
      interpolate(f, [at - 4, at + 2, at + vo.speech[i] + 2, at + vo.speech[i] + 12], [0, 1, 1, 0], clamp)));
  const taps = [...tapFrames(ft.connect).map((f) => f + A.scenes.connect), ...tapFrames(ft.create).map((f) => f + A.scenes.create)];
  return (
    <>
      <Audio src={staticFile('audio/music-appstore.wav')} volume={(f) => 0.6 - 0.36 * duck(f)} />
      {vo.at.map((at, i) => (
        <Sequence key={i} from={at} durationInFrames={170} layout="none">
          <Audio src={staticFile(`audio/vo-${lang}-${vo.lines[i]}.wav`)} />
        </Sequence>
      ))}
      {taps.map((f, i) => (
        <Sequence key={`t${i}`} from={f - 1} durationInFrames={20} layout="none">
          <Audio src={staticFile('audio/tap.wav')} volume={0.32} />
        </Sequence>
      ))}
    </>
  );
};

export const AppStorePreview: React.FC<AppStoreProps> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const S = A.scenes;
  const c = copy[lang].appStore;
  const enter = spring({ frame: frame + 6, fps, config: { damping: 18, stiffness: 90 } });
  // Push in on the conversation states while the list is on screen, like the launch video.
  const zoomIn = interpolate(frame, [70, 92], [0, 1], { ...clamp, easing: easeInOut });
  const zoomOut = interpolate(frame, [S.connect - 22, S.connect - 4], [0, 1], { ...clamp, easing: easeInOut });
  const zoom = 1 + 0.38 * (zoomIn - zoomOut);
  const originY = screenH * stateRows.ios.y;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Soundtrack lang={lang} />
      <Background />
      <div
        style={{
          position: 'absolute', left: (886 - screen.w) / 2, top: screen.top, width: screen.w, height: screenH,
          transform: `translateY(${(1 - enter) * 300}px)`, opacity: Math.min(1, enter * 1.5),
        }}
      >
        <div
          style={{
            position: 'absolute', inset: -60, borderRadius: '50%', opacity: 0.55,
            background: 'radial-gradient(closest-side, rgba(217,119,87,0.45), transparent)', filter: 'blur(30px)',
          }}
        />
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: screen.radius, overflow: 'hidden', background: '#000',
            boxShadow: '0 40px 90px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(255,255,255,0.14)', transform: 'translateZ(0)',
          }}
        >
          <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `18% ${originY}px` }}>
            <Screens lang={lang} />
          </AbsoluteFill>
        </div>
      </div>
      <Caption text={c.list} in={4} out={S.connect - 8} />
      <Caption text={c.connect} in={S.connect + 4} out={S.create - 8} />
      <Caption text={c.create} in={S.create + 4} out={S.install - 8} />
      <Caption text={c.install} in={S.install + 4} out={S.welcome - 6} />
      <Caption text={c.end} in={S.welcome + 6} out={A.duration + 10} />
    </AbsoluteFill>
  );
};

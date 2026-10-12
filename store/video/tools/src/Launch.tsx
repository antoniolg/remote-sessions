import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ChatMock } from './components/ChatMock';
import { Background } from './components/Background';
import { Badge, EndCard } from './components/EndCard';
import { Footage, Still } from './components/Footage';
import { Headline } from './components/Headline';
import { Laptop, Notification, Terminal } from './components/Laptop';
import { Phone, phoneMetrics } from './components/Phone';
import { copy, Lang, Platform } from './copy';
import { footage, stateRows, tapFrames } from './footage';
import { C, easeInOut, easeOut, geist } from './theme';
import timeline from './timeline.json';

export type LaunchProps = { lang: Lang; platform: Platform; variant: 'launch' | 'play' };

const S = timeline.launch.scenes;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type Layout = ReturnType<typeof layoutFor>;
const layoutFor = (portrait: boolean) =>
  portrait
    ? {
        portrait,
        text: { left: 60, width: 960, top: 120, height: 560, size: 104, align: 'center' as const },
        phone: { cx: 540, cy: 1275, h: 1150 },
        laptop: { cx: 540, cy: 1130, w: 900 },
        pair: { a: 318, b: 762, h: 980 },
      }
    : {
        portrait,
        text: { left: 140, width: 800, top: 0, height: 1080, size: 92, align: 'left' as const },
        phone: { cx: 1340, cy: 545, h: 940 },
        laptop: { cx: 1330, cy: 560, w: 940 },
        pair: { a: 1185, b: 1550, h: 860 },
      };

const Column: React.FC<{ L: Layout; children: React.ReactNode }> = ({ L, children }) => (
  <div
    style={{
      position: 'absolute', left: L.text.left, top: L.text.top, width: L.text.width, height: L.text.height,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: L.text.align === 'center' ? 'center' : 'flex-start', gap: L.portrait ? 34 : 40,
    }}
  >
    {children}
  </div>
);

const Text: React.FC<{ L: Layout; text: string; in: number; out: number; scale?: number }> = ({ L, text, in: start, out, scale = 1 }) => (
  <Column L={L}>
    <Headline text={text} in={start} out={out} size={L.text.size * scale} align={L.text.align} />
  </Column>
);

/** Small pills under a headline (conversation states, platforms…). */
const Chips: React.FC<{ L: Layout; items: { label: string; color?: string }[]; in: number; out: number; offset?: number }> = ({
  L, items, in: start, out, offset = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leave = interpolate(frame, [out, out + 8], [0, 1], clamp);
  return (
    <Column L={L}>
      <div style={{ height: offset }} />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: L.text.align === 'center' ? 'center' : 'flex-start', maxWidth: L.text.width }}>
        {items.map((item, i) => {
          const p = spring({ frame: frame - start - i * 6, fps, config: { damping: 14, stiffness: 170 } });
          return (
            <div
              key={item.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: L.portrait ? '14px 26px' : '12px 22px', borderRadius: 999,
                fontFamily: geist, fontWeight: 600, fontSize: L.portrait ? 36 : 30, color: C.cream,
                background: 'rgba(255,255,255,0.07)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                transform: `translateY(${(1 - p) * 26 - leave * 16}px)`, opacity: Math.min(1, p * 1.5) * (1 - leave),
              }}
            >
              {item.color && <span style={{ width: 14, height: 14, borderRadius: '50%', background: item.color, boxShadow: `0 0 16px ${item.color}` }} />}
              {item.label}
            </div>
          );
        })}
      </div>
    </Column>
  );
};

const ProblemScene: React.FC<{ lang: Lang; L: Layout }> = ({ lang, L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = copy[lang];
  const cue = timeline.launch.cues[lang];
  const enter = spring({ frame: frame + 10, fps, config: { damping: 22, stiffness: 70 } });
  const exit = interpolate(frame, [134, 162], [0, 1], { ...clamp, easing: easeInOut });
  const push = interpolate(frame, [0, 134], [0, 1], clamp);
  const scale = (0.92 + 0.06 * enter + 0.03 * push) * (1 - 0.22 * exit);
  const tx = L.portrait ? 0 : -exit * 420;
  const ty = (1 - enter) * 60 + (L.portrait ? exit * 260 : exit * 40);
  const k = L.laptop.w / 1000;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute', left: L.laptop.cx, top: L.laptop.cy,
          transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
          opacity: Math.min(1, enter * 1.4) * (1 - exit), filter: `blur(${exit * 14}px)`,
        }}
      >
        <Laptop width={L.laptop.w}>
          <Terminal copy={{ prompt: c.terminalPrompt, working: c.terminalWorking }} scale={k} />
          <Notification at={cue.problemB - 2} app={c.notificationApp} title={c.notificationTitle} body={c.notificationBody} scale={k * 1.25} />
        </Laptop>
      </div>
      <Text L={L} text={c.problemA} in={4} out={cue.problemB - 10} />
      <Text L={L} text={c.problemB} in={cue.problemB} out={136} />
    </AbsoluteFill>
  );
};

/** What the main phone shows over time (frames are global: this lives in a Sequence from 0). */
const Screen: React.FC<LaunchProps & { width: number; height: number }> = ({ lang, platform, width, height }) => {
  const frame = useCurrentFrame();
  const ft = footage[platform][lang];
  const chat = copy[lang].chat;
  // The Claude app comes in from the right like an app switch, and leaves the same way.
  const chatIn = interpolate(frame, [S.claude, S.claude + 12], [0, 1], { ...clamp, easing: easeOut });
  const chatOut = interpolate(frame, [S.create - 2, S.create + 10], [0, 1], { ...clamp, easing: easeInOut });
  const toList = interpolate(frame, [S.platforms, S.platforms + 10], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Sequence from={S.list} durationInFrames={S.connect - S.list}>
        <Still src={ft.list} />
      </Sequence>
      <Sequence from={S.connect} durationInFrames={S.claude + 14 - S.connect}>
        <Footage take={ft.connect} hold={40} />
        <AbsoluteFill style={{ background: '#000', opacity: chatIn * 0.6 }} />
      </Sequence>
      <Sequence from={S.create - 2} durationInFrames={S.platforms + 12 - S.create + 2}>
        <Footage take={ft.create} hold={40} />
      </Sequence>
      <Sequence from={S.claude} durationInFrames={S.create + 12 - S.claude}>
        <AbsoluteFill style={{ transform: `translateX(${(1 - chatIn) * 100 + chatOut * 100}%)`, boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }}>
          <ChatMock platform={platform} copy={{ ...chat, ...chat[platform] }} width={width} height={height} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={S.platforms} durationInFrames={S.end + 30 - S.platforms}>
        <AbsoluteFill style={{ opacity: toList }}>
          <Still src={ft.list} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const PhoneStage: React.FC<LaunchProps & { L: Layout }> = (props) => {
  const { platform, variant, lang, L } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - S.list + 4, fps, config: { damping: 17, stiffness: 75, mass: 1 } });
  const exit = interpolate(frame, [S.end - 24, S.end], [0, 1], { ...clamp, easing: easeInOut });
  const zoomIn = interpolate(frame, [S.list + 58, S.list + 82], [0, 1], { ...clamp, easing: easeInOut });
  const zoomOut = interpolate(frame, [S.connect - 24, S.connect - 4], [0, 1], { ...clamp, easing: easeInOut });
  const zoom = 1 + 0.45 * (zoomIn - zoomOut);
  const pair = variant === 'launch' ? interpolate(frame, [S.platforms, S.platforms + 22], [0, 1], { ...clamp, easing: easeInOut }) : 0;
  const drift = interpolate(frame, [S.list, S.end], [0, 1], clamp);
  const m = phoneMetrics(platform, L.phone.h);
  const originY = m.rim + m.bezel + m.sh * stateRows[platform].y;
  const other: Platform = platform === 'ios' ? 'android' : 'ios';
  const mainX = interpolate(pair, [0, 1], [L.phone.cx, platform === 'ios' ? L.pair.a : L.pair.b]);
  const pairScale = interpolate(pair, [0, 1], [1, L.pair.h / L.phone.h]);
  const otherEnter = spring({ frame: frame - S.platforms - 6, fps, config: { damping: 17, stiffness: 80 } });
  const om = phoneMetrics(other, L.pair.h);
  // Off-screen distance for entrances and exits; portrait needs more room below the phone.
  const away = L.portrait ? 1500 : 1050;
  // In portrait the zoom stays inside the screen, so the phone doesn't grow over the headline.
  const phoneZoom = L.portrait ? 1 : zoom;
  const screenZoom = L.portrait ? 1 + (zoom - 1) * 0.9 : 1;
  const otherX = platform === 'ios' ? L.pair.b : L.pair.a;
  return (
    <AbsoluteFill>
      {variant === 'launch' && frame >= S.platforms && (
        <div
          style={{
            position: 'absolute', left: otherX - om.width / 2, top: L.phone.cy - om.height / 2, width: om.width, height: om.height,
            transform: `translateY(${(1 - otherEnter) * away + exit * away}px) rotate(${(platform === 'ios' ? 4 : -4) + (1 - otherEnter) * 10}deg)`,
          }}
        >
          <Phone platform={other} height={L.pair.h} glow={0.6}>
            <Still src={footage[other][lang].list} />
          </Phone>
        </div>
      )}
      <div
        style={{
          position: 'absolute', left: mainX - m.width / 2, top: L.phone.cy - m.height / 2, width: m.width, height: m.height,
          transform: `translateY(${(1 - enter) * away + exit * away}px) rotate(${(1 - enter) * 9 + pair * (platform === 'ios' ? -4 : 4)}deg) scale(${pairScale * (1 + drift * 0.02)})`,
        }}
      >
        <div style={{ width: '100%', height: '100%', transform: `scale(${phoneZoom})`, transformOrigin: `50% ${originY}px` }}>
          <Phone platform={platform} height={L.phone.h}>
            <AbsoluteFill style={{ transform: `scale(${screenZoom})`, transformOrigin: `18% ${m.sh * stateRows[platform].y}px` }}>
              <Screen {...props} width={m.sw} height={m.sh} />
            </AbsoluteFill>
          </Phone>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Music ducked under the voice-over, the voice-over lines and small sound effects. */
const Soundtrack: React.FC<LaunchProps> = ({ lang, platform }) => {
  const vo = timeline.launch.vo[lang];
  const cue = timeline.launch.cues[lang];
  const ft = footage[platform][lang];
  const duck = (f: number) =>
    Math.max(0, ...vo.at.map((at, i) =>
      interpolate(f, [at - 4, at + 2, at + vo.speech[i] + 2, at + vo.speech[i] + 12], [0, 1, 1, 0], clamp)));
  const taps = [...tapFrames(ft.connect).map((f) => f + S.connect), ...tapFrames(ft.create).map((f) => f + S.create - 2)];
  const fx = (src: string, at: number, volume: number, key: string) => (
    <Sequence key={key} from={Math.max(0, at)} durationInFrames={45} layout="none">
      <Audio src={staticFile(src)} volume={volume} />
    </Sequence>
  );
  return (
    <>
      <Audio src={staticFile('audio/music.wav')} volume={(f) => 0.6 - 0.36 * duck(f)} />
      {vo.at.map((at, i) => (
        <Sequence key={i} from={at} durationInFrames={170} layout="none">
          <Audio src={staticFile(`audio/vo-${lang}-${i + 1}.wav`)} volume={1} />
        </Sequence>
      ))}
      {taps.map((f, i) => fx('audio/tap.wav', f - 1, 0.32, `tap${i}`))}
      {fx('audio/chime.wav', cue.problemB - 2, 0.3, 'chime')}
      {fx('audio/whoosh.wav', S.list - 14, 0.42, 'w1')}
      {fx('audio/whoosh.wav', S.end - 16, 0.38, 'w2')}
    </>
  );
};

/** A warm burst of light on the beat drop, when the phone arrives. */
const Flash: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const o = interpolate(frame, [at - 3, at, at + 16], [0, 1, 0], clamp);
  if (o <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        opacity: o * 0.55, mixBlendMode: 'screen',
        background: `radial-gradient(${width * 0.6}px ${height * 0.6}px at 70% 55%, rgba(239,162,135,0.9), rgba(217,119,87,0.25) 45%, transparent 75%)`,
      }}
    />
  );
};

export const Launch: React.FC<LaunchProps> = (props) => {
  const { lang, platform, variant } = props;
  const { width, height } = useVideoConfig();
  const L = layoutFor(height > width);
  const c = copy[lang];
  const cue = timeline.launch.cues[lang];
  const badges: Badge[] = variant === 'play' ? ['play'] : ['appstore', 'play'];
  const end = S.end;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Soundtrack {...props} />
      <Background />
      <Sequence durationInFrames={S.list + 20}>
        <ProblemScene lang={lang} L={L} />
      </Sequence>
      <Sequence from={0} durationInFrames={end + 20}>
        <PhoneStage {...props} L={L} />
      </Sequence>
      <Flash at={S.list} />
      <Text L={L} text={c.list} in={S.list + 6} out={S.connect - 8} />
      <Chips
        L={L} in={S.list + 64} out={S.connect - 8} offset={L.portrait ? 430 : 470}
        items={[{ label: c.states[0], color: C.green }, { label: c.states[1], color: C.orange }]}
      />
      <Text L={L} text={c.connectA} in={S.connect + 4} out={cue.connectB - 10} />
      <Text L={L} text={c.connectB} in={cue.connectB} out={S.claude - 6} />
      <Text L={L} text={c.claude} in={S.claude + 6} out={S.create - 6} />
      <Text L={L} text={c.createA} in={S.create + 5} out={cue.createB - 10} />
      <Text L={L} text={c.createB} in={cue.createB} out={S.platforms - 8} />
      <Text L={L} text={variant === 'launch' ? c.platforms : c.pairing} in={S.platforms + 6} out={end - 22} />
      <Chips
        L={L} in={S.platforms + 26} out={end - 22} offset={L.portrait ? 330 : 330}
        items={(variant === 'launch' ? c.platformChips : c.pairingChips).map((label) => ({ label }))}
      />
      <Sequence from={end - 3}>
        <EndCard
          tagline={c.tagline} url={c.url} disclaimer={c.disclaimer} badges={badges} portrait={L.portrait}
          chipAt={cue.chips.map((f) => f - (end - 3))}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

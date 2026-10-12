import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, geist, geistMono } from '../theme';

/** A dark laptop with a notch; `children` fill the display. Width is the lid width. */
export const Laptop: React.FC<{ width: number; children: React.ReactNode }> = ({ width, children }) => {
  const lidH = width * 0.655;
  const bezel = width * 0.016;
  const baseW = width * 1.13;
  const baseH = width * 0.032;
  return (
    <div style={{ position: 'relative', width: baseW, height: lidH + baseH }}>
      <div
        style={{
          position: 'absolute', left: (baseW - width) / 2, top: 0, width, height: lidH,
          borderRadius: `${width * 0.03}px ${width * 0.03}px ${width * 0.006}px ${width * 0.006}px`,
          background: 'linear-gradient(160deg,#3a3836,#1b1a19 40%,#2a2827)',
          boxShadow: `0 ${width * 0.05}px ${width * 0.12}px rgba(0,0,0,0.55), inset 0 0 0 1.5px rgba(255,255,255,0.12)`,
        }}
      >
        <div
          style={{
            position: 'absolute', left: bezel * 0.45, top: bezel * 0.45, right: bezel * 0.45, bottom: bezel * 0.45,
            borderRadius: width * 0.024, background: '#050505',
          }}
        />
        <div
          style={{
            position: 'absolute', left: bezel, top: bezel, right: bezel, bottom: bezel * 1.6,
            borderRadius: width * 0.012, overflow: 'hidden', background: '#000',
          }}
        >
          {children}
        </div>
        {/* notch */}
        <div
          style={{
            position: 'absolute', left: width / 2 - width * 0.06, top: bezel * 0.9, width: width * 0.12, height: width * 0.021,
            borderRadius: `0 0 ${width * 0.008}px ${width * 0.008}px`, background: '#050505',
          }}
        />
      </div>
      {/* base */}
      <div
        style={{
          position: 'absolute', left: 0, top: lidH - 1, width: baseW, height: baseH,
          borderRadius: `${width * 0.004}px ${width * 0.004}px ${width * 0.03}px ${width * 0.03}px`,
          background: 'linear-gradient(180deg,#5a5754 0%,#2f2d2b 35%,#121110 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        <div
          style={{
            position: 'absolute', left: baseW / 2 - width * 0.09, top: 0, width: width * 0.18, height: baseH * 0.35,
            borderRadius: `0 0 ${width * 0.012}px ${width * 0.012}px`, background: 'linear-gradient(180deg,#1c1b1a,#3a3836)',
          }}
        />
      </div>
    </div>
  );
};

const spinnerGlyphs = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];

type TerminalCopy = { prompt: string; working: string };

/**
 * A terminal running Claude Code halfway through a task (a mock, not the real UI): the prompt,
 * a few tool calls that appear one after another, and a spinner on the running step.
 */
export const Terminal: React.FC<{ copy: TerminalCopy; scale: number }> = ({ copy, scale }) => {
  const frame = useCurrentFrame();
  const line = (at: number) => interpolate(frame, [at, at + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s = (v: number) => v * scale;
  const rows: { at: number; node: React.ReactNode }[] = [
    { at: 4, node: <><span style={{ color: '#8a817c' }}>{'>'} </span><span style={{ color: C.cream }}>{copy.prompt}</span></> },
    { at: 16, node: <Tool name="Read" arg="Sources/Auth/AuthService.swift" /> },
    { at: 28, node: <Tool name="Edit" arg="Tests/AuthServiceTests.swift" /> },
    { at: 34, node: <span style={{ color: '#7fd18b', paddingLeft: '1.9em' }}>+ func testRefreshesExpiredToken() async throws {'{'}</span> },
    { at: 40, node: <span style={{ color: '#7fd18b', paddingLeft: '1.9em' }}>+   let token = Token.expired()</span> },
    { at: 52, node: <Tool name="Bash" arg="swift test --filter AuthServiceTests" /> },
  ];
  const glyph = spinnerGlyphs[Math.floor(frame / 3) % spinnerGlyphs.length];
  const seconds = 12 + Math.floor(frame / 30);
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 80% 10%, #5b2a17 0%, #2a1610 45%, #120c0a 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute', left: '5%', top: '17%', width: '84%', height: '78%', borderRadius: s(14),
          background: 'rgba(22,19,18,0.96)', boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: s(38), display: 'flex', alignItems: 'center', gap: s(8), padding: `0 ${s(16)}px`,
            background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: s(12), height: s(12), borderRadius: '50%', background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: 'center', fontFamily: geist, fontSize: s(14), color: '#8a817c', marginRight: s(52) }}>
            shop — claude
          </div>
        </div>
        <div style={{ padding: `${s(22)}px ${s(26)}px`, fontFamily: geistMono, fontSize: s(21), lineHeight: 1.7, color: '#cfc6c0' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ opacity: line(r.at), transform: `translateY(${(1 - line(r.at)) * 6}px)`, whiteSpace: 'nowrap' }}>
              {r.node}
            </div>
          ))}
          <div style={{ marginTop: s(14), opacity: line(60), whiteSpace: 'nowrap' }}>
            <span style={{ color: C.brand, display: 'inline-block', width: '1.4em' }}>{glyph}</span>
            <span style={{ color: '#f0b39b' }}>{copy.working}</span>
            <span style={{ color: '#8a817c' }}> ({seconds}s · esc)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Tool: React.FC<{ name: string; arg: string }> = ({ name, arg }) => (
  <>
    <span style={{ color: C.brand }}>● </span>
    <span style={{ color: C.cream, fontWeight: 600 }}>{name}</span>
    <span style={{ color: '#a49a94' }}>({arg})</span>
  </>
);

/** A macOS-style notification that slides in at `at`. */
export const Notification: React.FC<{ at: number; app: string; title: string; body: string; scale: number }> = ({
  at, app, title, body, scale,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 15, stiffness: 140 } });
  const s = (v: number) => v * scale;
  return (
    <div
      style={{
        position: 'absolute', right: '2.5%', top: '2.5%', width: s(360), padding: s(14), borderRadius: s(18),
        display: 'flex', gap: s(12), alignItems: 'center',
        background: 'rgba(58,54,52,0.86)', boxShadow: '0 20px 50px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.12)',
        transform: `translateX(${(1 - p) * 120}%)`, opacity: Math.min(1, p * 2), fontFamily: geist,
      }}
    >
      <div style={{ width: s(42), height: s(42), borderRadius: s(10), background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: s(13), background: '#ff453a', color: '#fff', fontSize: s(8.5), fontWeight: 700, textAlign: 'center', lineHeight: `${s(13)}px` }}>
          OCT
        </div>
        <div style={{ fontSize: s(22), fontWeight: 600, textAlign: 'center', color: '#1d1d1f', lineHeight: `${s(29)}px` }}>12</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: s(12.5), color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{app}</div>
        <div style={{ fontSize: s(16), fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: s(14), color: 'rgba(255,255,255,0.75)' }}>{body}</div>
      </div>
    </div>
  );
};

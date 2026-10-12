import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { installCommand } from '../copy';
import { C, easeOut, geist, geistMono } from '../theme';

export type Badge = 'appstore' | 'play';

/** Closing card: icon, name, tagline (synced to the voice-over), install command, store badges and URL. */
export const EndCard: React.FC<{
  tagline: readonly string[];
  url: string;
  disclaimer: string;
  badges: Badge[];
  chipAt: number[];
  portrait?: boolean;
}> = ({ tagline, url, disclaimer, badges, chipAt, portrait = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = portrait ? 1 : 1;
  const icon = spring({ frame, fps, config: { damping: 12, stiffness: 120, mass: 0.8 } });
  const name = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 120 } });
  const fade = (at: number, len = 12) => interpolate(frame, [at, at + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut });
  const typed = Math.round(interpolate(frame, [60, 100], [0, installCommand.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const commandText = installCommand.slice(0, typed);
  const split = portrait ? installCommand.indexOf(' && ') : -1;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: geist, color: C.cream }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: portrait ? 44 : 30 * k, marginTop: portrait ? -80 : -40 }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute', inset: -90, borderRadius: '50%', opacity: icon * 0.8,
              background: 'radial-gradient(closest-side, rgba(217,119,87,0.55), transparent)', filter: 'blur(20px)',
            }}
          />
          <Img
            src={staticFile('img/app-icon.png')}
            style={{
              position: 'relative', width: portrait ? 230 : 170, height: portrait ? 230 : 170, borderRadius: '22.5%',
              transform: `scale(${0.4 + 0.6 * icon}) rotate(${(1 - icon) * -14}deg)`, opacity: Math.min(1, icon * 2),
              boxShadow: '0 30px 60px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.2)',
            }}
          />
        </div>
        <div
          style={{
            fontSize: portrait ? 112 : 118, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1,
            transform: `translateY(${(1 - name) * 40}px)`, opacity: name, filter: `blur(${(1 - name) * 8}px)`,
          }}
        >
          Remote Sessions
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {tagline.map((t, i) => {
            const p = spring({ frame: frame - chipAt[i], fps, config: { damping: 13, stiffness: 160 } });
            return (
              <div
                key={t}
                style={{
                  padding: portrait ? '16px 30px' : '12px 26px', borderRadius: 999, fontSize: portrait ? 42 : 34, fontWeight: 600,
                  background: i === tagline.length - 1 ? `linear-gradient(120deg, ${C.brandLight}, ${C.brand})` : 'rgba(255,255,255,0.08)',
                  color: i === tagline.length - 1 ? '#1a0f0a' : C.cream, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                  transform: `translateY(${(1 - p) * 30}px) scale(${0.85 + 0.15 * p})`, opacity: Math.min(1, p * 1.6),
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
        <div
          style={{
            opacity: fade(56), transform: `translateY(${(1 - fade(56)) * 20}px)`, fontFamily: geistMono,
            fontSize: portrait ? 30 : 26, padding: portrait ? '22px 30px' : '16px 26px', borderRadius: 16, background: 'rgba(10,8,7,0.7)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)', color: C.cream, whiteSpace: 'pre', textAlign: 'left',
            minWidth: portrait ? 820 : 1180,
          }}
        >
          <span style={{ color: C.brand }}>$ </span>
          {split > 0 && commandText.length > split
            ? `${commandText.slice(0, split)}\n  ${commandText.slice(split + 1)}`
            : commandText}
          <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: C.brand }}>▍</span>
        </div>
        <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center', gap: portrait ? 26 : 34, opacity: fade(98), transform: `translateY(${(1 - fade(98)) * 20}px)` }}>
          <div style={{ display: 'flex', gap: 18 }}>
            {badges.map((b) => (
              <Img key={b} src={staticFile(b === 'appstore' ? 'img/app-store.png' : 'img/google-play.png')} style={{ height: portrait ? 96 : 76 }} />
            ))}
          </div>
          <div style={{ fontSize: portrait ? 32 : 28, fontWeight: 500, color: C.muted }}>{url}</div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute', bottom: portrait ? 70 : 34, left: 80, right: 80, textAlign: 'center', fontSize: portrait ? 22 : 17,
          color: 'rgba(247,239,233,0.42)', opacity: fade(112, 20),
        }}
      >
        {disclaimer}
      </div>
    </AbsoluteFill>
  );
};

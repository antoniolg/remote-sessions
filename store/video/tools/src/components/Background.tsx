import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../theme';

/** Warm dark background: two drifting brand glows, a dot grid, film grain and a vignette. */
export const Background: React.FC<{ glow?: number }> = ({ glow = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;
  const r = Math.max(width, height);
  const ax = width * (0.7 + 0.06 * Math.sin(t * 0.35));
  const ay = height * (0.36 + 0.08 * Math.cos(t * 0.28));
  const bx = width * (0.2 + 0.05 * Math.cos(t * 0.22));
  const by = height * (0.86 + 0.05 * Math.sin(t * 0.3));
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(${r * 0.5}px ${r * 0.42}px at ${ax}px ${ay}px, rgba(217,119,87,${0.3 * glow}), transparent 70%)`,
            `radial-gradient(${r * 0.48}px ${r * 0.38}px at ${bx}px ${by}px, rgba(158,63,31,${0.32 * glow}), transparent 70%)`,
          ].join(', '),
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.075) 1.2px, transparent 1.2px)',
          backgroundSize: '38px 38px',
          backgroundPosition: `${(frame * 0.15) % 38}px 0px`,
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 25%, transparent 72%)',
          opacity: 0.55,
        }}
      />
      <Grain />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.6) 100%)' }} />
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.08, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(frame / 2)} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

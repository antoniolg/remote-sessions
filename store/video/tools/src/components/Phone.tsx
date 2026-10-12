import React from 'react';
import type { Platform } from '../copy';

/** Screen aspect of the captures: iPhone 17 Pro Max (1320×2868) and the Android emulator (1080×2400). */
export const screenAspect: Record<Platform, number> = { ios: 1320 / 2868, android: 1080 / 2400 };

/** Size of the device for a given total height, plus where the screen sits inside it. */
export const phoneMetrics = (platform: Platform, height: number) => {
  const rim = height * (platform === 'ios' ? 0.0065 : 0.006);
  const bezel = height * (platform === 'ios' ? 0.0115 : 0.0105);
  const sh = height - 2 * (rim + bezel);
  const sw = sh * screenAspect[platform];
  const width = sw + 2 * (rim + bezel);
  const screenRadius = sw * (platform === 'ios' ? 0.135 : 0.095);
  return { width, height, rim, bezel, sw, sh, screenRadius, radius: screenRadius + rim + bezel };
};

/** A device frame drawn in CSS; `children` fill the screen. */
export const Phone: React.FC<{ platform: Platform; height: number; children: React.ReactNode; glow?: number }> = ({
  platform, height, children, glow = 1,
}) => {
  const m = phoneMetrics(platform, height);
  const inset = m.rim + m.bezel;
  const ios = platform === 'ios';
  return (
    <div style={{ position: 'relative', width: m.width, height: m.height }}>
      {/* soft brand glow behind the device */}
      <div
        style={{
          position: 'absolute', inset: -m.width * 0.25, borderRadius: '50%', opacity: 0.55 * glow,
          background: 'radial-gradient(closest-side, rgba(217,119,87,0.45), transparent)', filter: 'blur(30px)',
        }}
      />
      {/* side buttons */}
      {(ios ? [[0.2, 0.045, 'L'], [0.285, 0.08, 'L'], [0.38, 0.08, 'L'], [0.3, 0.12, 'R'], [0.6, 0.06, 'R']] :
        [[0.24, 0.07, 'R'], [0.36, 0.12, 'R']]).map(([top, len, side], i) => (
        <div
          key={i}
          style={{
            position: 'absolute', top: m.height * (top as number), height: m.height * (len as number),
            width: m.width * 0.022, [side === 'L' ? 'left' : 'right']: -m.width * 0.012, borderRadius: 4,
            background: ios ? 'linear-gradient(90deg,#3c3835,#6b6560,#2a2725)' : 'linear-gradient(90deg,#26272a,#45474c,#1c1d20)',
          }}
        />
      ))}
      {/* body */}
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: m.radius,
          background: ios
            ? 'linear-gradient(150deg,#6a635e 0%,#36322f 22%,#1d1b1a 55%,#4d4743 100%)'
            : 'linear-gradient(150deg,#4a4c52 0%,#232428 30%,#151618 60%,#3a3c41 100%)',
          boxShadow: `0 ${m.height * 0.06}px ${m.height * 0.14}px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 0 1.5px rgba(255,255,255,0.16)`,
        }}
      />
      <div style={{ position: 'absolute', inset: m.rim, borderRadius: m.radius - m.rim, background: '#030303' }} />
      {/* screen */}
      <div
        style={{
          position: 'absolute', left: inset, top: inset, width: m.sw, height: m.sh, borderRadius: m.screenRadius,
          overflow: 'hidden', background: '#000', transform: 'translateZ(0)',
        }}
      >
        {children}
      </div>
      {ios ? (
        <div
          style={{
            position: 'absolute', left: (m.width - m.sw * 0.29) / 2, top: inset + m.sh * 0.0118,
            width: m.sw * 0.29, height: m.sh * 0.0385, borderRadius: m.sh, background: '#000',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute', left: m.width / 2 - m.sw * 0.017, top: inset + m.sh * 0.0105,
            width: m.sw * 0.034, height: m.sw * 0.034, borderRadius: '50%', background: '#000',
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05)',
          }}
        />
      )}
      {/* glass highlight */}
      <div
        style={{
          position: 'absolute', left: inset, top: inset, width: m.sw, height: m.sh, borderRadius: m.screenRadius,
          background: 'linear-gradient(118deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0) 26%)', pointerEvents: 'none',
        }}
      />
    </div>
  );
};

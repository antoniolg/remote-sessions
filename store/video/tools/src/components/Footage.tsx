import React from 'react';
import { AbsoluteFill, Freeze, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import type { Take } from '../footage';

const fill: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };

/** Plays the segments of a take back to back, with a ripple wherever the recording was tapped. */
export const Footage: React.FC<{ take: Take; hold?: number }> = ({ take, hold = 0 }) => {
  const rate = take.rate ?? 1;
  let offset = 0;
  return (
    <AbsoluteFill>
      {take.segments.map((s, i) => {
        const len = Math.round((s.to - s.from) / rate);
        const last = i === take.segments.length - 1;
        const from = offset;
        offset += len;
        const video = <OffthreadVideo src={staticFile(take.src)} trimBefore={s.from} trimAfter={s.to} playbackRate={rate} muted style={fill} />;
        return (
          <React.Fragment key={i}>
            <Sequence from={from} durationInFrames={len} layout="none">
              {video}
              {s.tap && <TapRipple at={Math.round((s.tap.at - s.from) / rate)} x={s.tap.x} y={s.tap.y} />}
            </Sequence>
            {last && hold > 0 && (
              <Sequence from={from + len} durationInFrames={hold} layout="none">
                <Freeze frame={len - 1}>{video}</Freeze>
              </Sequence>
            )}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

export const Still: React.FC<{ src: string }> = ({ src }) => <Img src={staticFile(src)} style={fill} />;

/** A finger tap: a dot that presses in and a ring that spreads out. Coordinates are fractions of the screen. */
export const TapRipple: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const frame = useCurrentFrame() - at;
  if (frame < -2 || frame > 20) return null;
  const dot = interpolate(frame, [-2, 3, 9, 16], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const press = interpolate(frame, [-2, 3, 8], [1.25, 0.85, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ring = interpolate(frame, [2, 18], [0.6, 2.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ringOpacity = interpolate(frame, [2, 6, 18], [0, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = '11%';
  const base: React.CSSProperties = {
    position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: size, aspectRatio: '1', borderRadius: '50%',
  };
  return (
    <>
      <div style={{ ...base, transform: `translate(-50%, -50%) scale(${press})`, opacity: dot * 0.55, background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 30px rgba(255,255,255,0.5)' }} />
      <div style={{ ...base, transform: `translate(-50%, -50%) scale(${ring})`, opacity: ringOpacity, border: '3px solid rgba(255,255,255,0.9)' }} />
    </>
  );
};

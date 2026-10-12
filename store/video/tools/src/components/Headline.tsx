import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, easeIn, geist } from '../theme';

type Word = { text: string; accent: boolean };

/** "Todas tus\nconversaciones, *en el móvil*." → lines of words; *…* marks the accent (may span words). */
export const parse = (text: string): Word[][] => {
  let accent = false;
  return text.split('\n').map((line) =>
    line.split(' ').filter(Boolean).map((raw) => {
      let word = raw;
      let starts = false;
      if (word.startsWith('*')) { accent = true; starts = true; word = word.slice(1); }
      const isAccent = accent || starts;
      // The closing star can be followed by punctuation: "*móvil*." or "*Conectar*."
      const close = word.indexOf('*');
      if (close >= 0) { accent = false; word = word.slice(0, close) + word.slice(close + 1); }
      return { text: word, accent: isAccent };
    }),
  );
};

export const accentStyle: React.CSSProperties = {
  backgroundImage: `linear-gradient(100deg, #F6C1A9 0%, ${C.brandLight} 35%, ${C.brand} 100%)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

/**
 * Kinetic headline: words rise in one after another with a spring and leave upwards at `out`.
 * `in`/`out` are frames relative to the parent sequence.
 */
export const Headline: React.FC<{
  text: string;
  in: number;
  out?: number;
  size: number;
  align?: 'left' | 'center';
  stagger?: number;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ text, in: start, out, size, align = 'left', stagger = 2.5, weight = 700, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = parse(text);
  let index = 0;
  return (
    <div
      style={{
        fontFamily: geist,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: '-0.035em',
        color: C.cream,
        textAlign: align,
        ...style,
      }}
    >
      {lines.map((words, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap' }}>
          {words.map((word, wi) => {
            const i = index++;
            const p = spring({ frame: frame - start - i * stagger, fps, config: { damping: 16, stiffness: 170, mass: 0.7 } });
            const o = out === undefined ? 0
              : interpolate(frame, [out + i * 0.7, out + 7 + i * 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeIn });
            const y = (1 - p) * 0.55 - o * 0.4;
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  marginRight: wi < words.length - 1 ? '0.24em' : 0,
                  transform: `translateY(${y}em)`,
                  opacity: Math.min(1, p * 1.4) * (1 - o),
                  filter: `blur(${(1 - Math.min(1, p)) * 10 + o * 8}px)`,
                  paddingBottom: '0.08em',
                  ...(word.accent ? accentStyle : {}),
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

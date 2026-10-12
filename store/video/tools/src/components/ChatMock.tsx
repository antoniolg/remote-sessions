import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Platform } from '../copy';
import { C, geistMono, roboto, sfPro } from '../theme';

type ChatCopy = { title: string; history: readonly string[]; user: string; answer: string; tools: string; reply: string; remote: string };

/** Base size of the screens in points/dp: everything is laid out there and scaled to the device. */
const base: Record<Platform, { w: number; h: number }> = { ios: { w: 440, h: 956 }, android: { w: 412, h: 915 } };

/** `code` spans in a monospace font, like the apps render inline code. */
const Rich: React.FC<{ text: string; mono: string }> = ({ text, mono }) => (
  <>
    {text.split('`').map((part, i) =>
      i % 2 ? (
        <span key={i} style={{ fontFamily: mono, fontSize: '0.88em', background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '0 3px' }}>
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

/**
 * A generic chat screen standing in for the Claude app (not its real UI): the conversation continues
 * from the phone. Frames are relative to when the screen appears.
 */
export const ChatMock: React.FC<{ platform: Platform; copy: ChatCopy; width: number; height: number }> = ({
  platform, copy, width, height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = base[platform];
  const scale = width / b.w;
  const font = platform === 'ios' ? sfPro : roboto;
  const typed = Math.round(interpolate(frame, [6, 26], [0, copy.user.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const sent = spring({ frame: frame - 30, fps, config: { damping: 15, stiffness: 180 } });
  const thinking = frame >= 34 && frame < 44;
  const answerChars = Math.round(interpolate(frame, [44, 66], [0, copy.answer.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  // Keep backtick pairs balanced while the answer streams in.
  let answer = copy.answer.slice(0, answerChars);
  if ((answer.split('`').length - 1) % 2) answer += '`';
  const bubble: React.CSSProperties = { maxWidth: '82%', padding: '10px 14px', borderRadius: 20, fontSize: 16.5, lineHeight: 1.38 };
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#1c1a19' }}>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: b.w, height: (height / width) * b.w, transform: `scale(${scale})`,
          transformOrigin: 'top left', fontFamily: font, color: C.cream, display: 'flex', flexDirection: 'column',
        }}
      >
        <StatusBar platform={platform} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: platform === 'ios' ? '6px 16px 12px' : '6px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {platform === 'ios' ? <path d="M15 4 7 12l8 8" /> : <path d="M20 12H5m6-7-7 7 7 7" />}
          </svg>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{copy.title}</div>
            <div style={{ fontSize: 12.5, color: '#8fd6a0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green }} />
              {copy.remote}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 14, padding: '16px 16px 12px' }}>
          {copy.history.map((text, i) =>
            i % 2 === 0 ? (
              <div key={i} style={{ ...bubble, alignSelf: 'flex-end', background: '#3a3330' }}>{text}</div>
            ) : (
              <div key={i} style={{ fontSize: 16.5, lineHeight: 1.45, color: 'rgba(247,239,233,0.9)' }}>
                <Rich text={text} mono={geistMono} />
              </div>
            ),
          )}
          {sent > 0.01 && (
            <div
              style={{
                ...bubble, alignSelf: 'flex-end', background: '#3a3330',
                transform: `translateY(${(1 - sent) * 30}px) scale(${0.9 + sent * 0.1})`, opacity: Math.min(1, sent * 1.5), transformOrigin: 'bottom right',
              }}
            >
              {copy.user}
            </div>
          )}
          {thinking && <Dots frame={frame} />}
          {answerChars > 0 && (
            <div style={{ fontSize: 16.5, lineHeight: 1.45 }}>
              <Rich text={answer} mono={geistMono} />
              <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(247,239,233,0.5)' }}>⚒ {copy.tools}</div>
            </div>
          )}
        </div>
        <div style={{ padding: platform === 'ios' ? '8px 14px 34px' : '8px 12px 22px' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, borderRadius: 24, padding: '6px 6px 6px 18px',
              background: '#2a2725', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ flex: 1, fontSize: 16.5, color: typed > 0 && sent < 0.5 ? C.cream : 'rgba(247,239,233,0.45)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {typed > 0 && sent < 0.5 ? copy.user.slice(0, typed) : copy.reply}
              {typed > 0 && typed < copy.user.length && <span style={{ color: C.brand }}>|</span>}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: typed > 0 && sent < 0.5 ? C.brand : '#4a4441', display: 'grid', placeItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5m-6 6 6-6 6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dots: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ display: 'flex', gap: 6, padding: '6px 2px' }}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: 8, height: 8, borderRadius: '50%', background: C.brand,
          opacity: 0.35 + 0.65 * Math.max(0, Math.sin((frame - i * 3) / 3)),
        }}
      />
    ))}
  </div>
);

/** The status bar the captures show (9:41, full signal and battery), redrawn for the mock. */
export const StatusBar: React.FC<{ platform: Platform }> = ({ platform }) =>
  platform === 'ios' ? (
    <div style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 34px 0 50px', fontFamily: sfPro }}>
      <span style={{ fontSize: 17.5, fontWeight: 600 }}>09:41</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="19" height="12" viewBox="0 0 19 12" fill={C.cream}>
          {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 5} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="1" />)}
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill={C.cream}>
          <path d="M8.5 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.6 10.6 0 0 0 8.5.4 10.6 10.6 0 0 0 1 3.4l1.2 1.3c1.7-1.6 3.9-2.5 6.3-2.5Zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3a7.1 7.1 0 0 0-9.8 0l1.2 1.3c1-.9 2.3-1.4 3.7-1.4Zm0 3.6c.5 0 .9.2 1.2.5L8.5 11.2 7.3 9.9c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.6" fill="none" stroke={C.cream} strokeOpacity="0.45" />
          <rect x="2" y="2" width="20" height="9" rx="2.4" fill={C.cream} />
          <path d="M25 4.4v4.2c.8-.3 1.4-1.1 1.4-2.1s-.6-1.8-1.4-2.1Z" fill={C.cream} fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  ) : (
    <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 0 26px', fontFamily: roboto }}>
      <span style={{ fontSize: 15, fontWeight: 500 }}>9:41</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="13" viewBox="0 0 17 13" fill={C.cream}><path d="M8.5 13 0 3.6A12.4 12.4 0 0 1 8.5.3c3.3 0 6.3 1.2 8.5 3.3L8.5 13Z" /></svg>
        <svg width="24" height="13" viewBox="0 0 24 13"><rect x="0" y="0" width="21" height="13" rx="3.5" fill={C.cream} /><rect x="21.6" y="4" width="2" height="5" rx="1" fill={C.cream} /></svg>
      </span>
    </div>
  );

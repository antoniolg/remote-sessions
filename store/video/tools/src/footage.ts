import type { Lang, Platform } from './copy';

/** A tap on the recorded screen: source frame and position as fractions of the screen. */
export type Tap = { at: number; x: number; y: number };
/** A stretch of a recording, in source frames (30 fps): [from, to). */
export type Segment = { from: number; to: number; tap?: Tap };
export type Take = { src: string; segments: Segment[]; rate?: number };

type Takes = { list: string; connect: Take; create: Take; welcome?: string; install?: string };

// Frame numbers come from `ffmpeg … freezedetect` on the 30 fps captures (see ../README.md): each segment keeps
// a little of the still screen before and after the transition that a tap starts.
const ios = { row: { x: 0.34, y: 0.228 }, connect: { x: 0.5, y: 0.929 }, plus: { x: 0.902, y: 0.088 },
  other: { x: 0.34, y: 0.735 }, projects: { x: 0.34, y: 0.3745 }, landing: { x: 0.34, y: 0.321 }, start: { x: 0.5, y: 0.9215 } };
const android = { row: { x: 0.385, y: 0.23 }, connect: { x: 0.5, y: 0.93 }, plus: { x: 0.699, y: 0.0902 },
  other: { x: 0.305, y: 0.7435 }, projects: { x: 0.2125, y: 0.3744 }, landing: { x: 0.2556, y: 0.3131 }, start: { x: 0.5, y: 0.9277 } };

const at = (frame: number, p: { x: number; y: number }): Tap => ({ at: frame, ...p });

export const footage: Record<Platform, Record<Lang, Takes>> = {
  ios: {
    es: {
      list: 'cap/ios-es-list.png',
      welcome: 'cap/ios-es-welcome.png',
      install: 'cap/ios-es-install.png',
      connect: { src: 'cap/ios-es-connect.mp4', segments: [
        { from: 122, to: 182, tap: at(138, ios.row) },
        { from: 287, to: 325, tap: at(298, ios.connect) },
      ] },
      create: { src: 'cap/ios-es-new.mp4', rate: 1.25, segments: [
        { from: 114, to: 156, tap: at(123, ios.plus) },
        { from: 269, to: 308, tap: at(278, ios.other) },
        { from: 337, to: 374, tap: at(346, ios.projects) },
        { from: 408, to: 446, tap: at(417, ios.landing) },
        { from: 563, to: 613, tap: at(572, ios.start) },
      ] },
    },
    en: {
      list: 'cap/ios-en-list.png',
      welcome: 'cap/ios-en-welcome.png',
      install: 'cap/ios-en-install.png',
      connect: { src: 'cap/ios-en-connect.mp4', segments: [
        { from: 103, to: 163, tap: at(119, ios.row) },
        { from: 251, to: 289, tap: at(262, ios.connect) },
      ] },
      create: { src: 'cap/ios-en-new.mp4', rate: 1.25, segments: [
        { from: 107, to: 149, tap: at(116, ios.plus) },
        { from: 273, to: 312, tap: at(282, ios.other) },
        { from: 343, to: 380, tap: at(352, ios.projects) },
        { from: 417, to: 455, tap: at(426, ios.landing) },
        { from: 564, to: 614, tap: at(573, ios.start) },
      ] },
    },
  },
  android: {
    es: {
      list: 'cap/and-es-list.png',
      connect: { src: 'cap/and-es-connect.mp4', segments: [
        { from: 114, to: 168, tap: at(130, android.row) },
        { from: 238, to: 276, tap: at(249, android.connect) },
      ] },
      create: { src: 'cap/and-es-new.mp4', rate: 1.25, segments: [
        { from: 124, to: 164, tap: at(132, android.plus) },
        { from: 227, to: 263, tap: at(236, android.other) },
        { from: 332, to: 367, tap: at(341, android.projects) },
        { from: 437, to: 472, tap: at(446, android.landing) },
        { from: 544, to: 592, tap: at(553, android.start) },
      ] },
    },
    en: {
      list: 'cap/and-en-list.png',
      connect: { src: 'cap/and-en-connect.mp4', segments: [
        { from: 116, to: 170, tap: at(132, android.row) },
        { from: 240, to: 278, tap: at(251, android.connect) },
      ] },
      create: { src: 'cap/and-en-new.mp4', rate: 1.25, segments: [
        { from: 125, to: 165, tap: at(133, android.plus) },
        { from: 227, to: 263, tap: at(236, android.other) },
        { from: 332, to: 367, tap: at(341, android.projects) },
        { from: 437, to: 472, tap: at(446, android.landing) },
        { from: 543, to: 591, tap: at(552, android.start) },
      ] },
    },
  },
};

/** Where the conversation states sit in the list, as fractions of the screen (for the zoom in the list scene). */
export const stateRows: Record<Platform, { y: number }> = {
  ios: { y: 0.435 },
  android: { y: 0.515 },
};

export const takeLength = (take: Take) =>
  take.segments.reduce((sum, s) => sum + Math.round((s.to - s.from) / (take.rate ?? 1)), 0);

/** Frames (relative to where the take starts) at which its taps happen, for the tap sounds. */
export const tapFrames = (take: Take) => {
  const rate = take.rate ?? 1;
  let offset = 0;
  const taps: number[] = [];
  for (const s of take.segments) {
    if (s.tap) taps.push(offset + Math.round((s.tap.at - s.from) / rate));
    offset += Math.round((s.to - s.from) / rate);
  }
  return taps;
};

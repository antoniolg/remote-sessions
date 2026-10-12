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
const android = { row: { x: 0.333, y: 0.23 }, connect: { x: 0.5, y: 0.93 }, plus: { x: 0.698, y: 0.0617 },
  other: { x: 0.3056, y: 0.715 }, projects: { x: 0.3056, y: 0.3454 }, landing: { x: 0.3056, y: 0.284 }, start: { x: 0.5, y: 0.9275 } };

const at = (frame: number, p: { x: number; y: number }): Tap => ({ at: frame, ...p });

export const footage: Record<Platform, Record<Lang, Takes>> = {
  ios: {
    es: {
      list: 'cap/ios-es-list.png',
      welcome: 'cap/ios-es-welcome.png',
      install: 'cap/ios-es-install.png',
      connect: { src: 'cap/ios-es-connect.mp4', segments: [
        { from: 112, to: 172, tap: at(128, ios.row) },
        { from: 318, to: 356, tap: at(329, ios.connect) },
      ] },
      create: { src: 'cap/ios-es-new.mp4', rate: 1.25, segments: [
        { from: 110, to: 152, tap: at(119, ios.plus) },
        { from: 178, to: 217, tap: at(187, ios.other) },
        { from: 353, to: 390, tap: at(361, ios.projects) },
        { from: 418, to: 456, tap: at(426, ios.landing) },
        { from: 575, to: 625, tap: at(583, ios.start) },
      ] },
    },
    en: {
      list: 'cap/ios-en-list.png',
      welcome: 'cap/ios-en-welcome.png',
      install: 'cap/ios-en-install.png',
      connect: { src: 'cap/ios-en-connect.mp4', segments: [
        { from: 95, to: 155, tap: at(111, ios.row) },
        { from: 249, to: 287, tap: at(260, ios.connect) },
      ] },
      create: { src: 'cap/ios-en-new.mp4', rate: 1.25, segments: [
        { from: 295, to: 337, tap: at(304, ios.plus) },
        { from: 440, to: 479, tap: at(449, ios.other) },
        { from: 515, to: 552, tap: at(523, ios.projects) },
        { from: 585, to: 623, tap: at(593, ios.landing) },
        { from: 740, to: 790, tap: at(748, ios.start) },
      ] },
    },
  },
  android: {
    es: {
      list: 'cap/and-es-list.png',
      connect: { src: 'cap/and-es-connect.mp4', segments: [
        { from: 70, to: 124, tap: at(86, android.row) },
        { from: 167, to: 205, tap: at(178, android.connect) },
      ] },
      create: { src: 'cap/and-es-new.mp4', rate: 1.25, segments: [
        { from: 76, to: 116, tap: at(84, android.plus) },
        { from: 146, to: 182, tap: at(155, android.other) },
        { from: 207, to: 242, tap: at(216, android.projects) },
        { from: 267, to: 302, tap: at(276, android.landing) },
        { from: 332, to: 380, tap: at(341, android.start) },
      ] },
    },
    en: {
      list: 'cap/and-en-list.png',
      connect: { src: 'cap/and-en-connect.mp4', segments: [
        { from: 71, to: 125, tap: at(87, android.row) },
        { from: 168, to: 206, tap: at(179, android.connect) },
      ] },
      create: { src: 'cap/and-en-new.mp4', rate: 1.25, segments: [
        { from: 77, to: 117, tap: at(85, android.plus) },
        { from: 146, to: 182, tap: at(155, android.other) },
        { from: 207, to: 242, tap: at(216, android.projects) },
        { from: 268, to: 303, tap: at(277, android.landing) },
        { from: 333, to: 381, tap: at(342, android.start) },
      ] },
    },
  },
};

/** Where the conversation states sit in the list, as fractions of the screen (for the zoom in the list scene). */
export const stateRows: Record<Platform, { y: number }> = {
  ios: { y: 0.435 },
  android: { y: 0.485 },
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

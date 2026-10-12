import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';
import { loadFont as loadGeistMono } from '@remotion/google-fonts/GeistMono';
import { loadFont as loadRoboto } from '@remotion/google-fonts/Roboto';
import { Easing } from 'remotion';

export const geist = loadGeist('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
}).fontFamily;
export const geistMono = loadGeistMono('normal', { weights: ['400', '500', '600'], subsets: ['latin'] }).fontFamily;
// The Claude-app mock on Android uses Roboto, like the rest of the platform.
export const roboto = loadRoboto('normal', { weights: ['400', '500'], subsets: ['latin', 'latin-ext'] }).fontFamily;
export const sfPro = '-apple-system, "SF Pro Text", "Helvetica Neue", sans-serif';

export const C = {
  bg: '#0B0908',
  brand: '#D97757',
  brandLight: '#EFA287',
  brandDeep: '#9E3F1F',
  cream: '#F7EFE9',
  muted: 'rgba(247, 239, 233, 0.62)',
  faint: 'rgba(247, 239, 233, 0.14)',
  green: '#30D158',
  orange: '#FF9F0A',
};

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);

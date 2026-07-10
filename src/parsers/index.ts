export {
  parseLyrics,
  TTMLParser,
  LRCParser,
  SRTParser,
  QRCParser,
  PlainParser,
  detectParser,
  parseTTMLContent,
} from './universal.js';
export { parseRichSync } from './richsync.js';
export type { UniversalLyricsResult, Lyric, LyricPart, SyncType } from './universal.js';
export type { RichSyncLine, RichSyncWord } from './richsync.js';

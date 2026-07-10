import {
  TTMLParser,
  LRCParser,
  SRTParser,
  QRCParser,
  PlainParser,
  detectParser,
  parseTTMLContent,
  type Lyric,
  type LyricPart,
  type SyncType,
} from '@braccato/parsers';
import { parseTTML } from '../ttml/parser.js';
import { parseRichSync } from './richsync.js';
import type { ParsedTTML } from '../ttml/types.js';

export interface UniversalLyricsResult {
  /** Detected or given format */
  format: 'ttml' | 'richsync' | 'lrc' | 'srt' | 'qrc' | 'plain';
  /** Standard Braccato Lyric[] objects */
  lyrics: Lyric[];
  /** Rich ParsedTTML structure if synced */
  parsed?: ParsedTTML;
  /** Whether lyrics have word/syllable sync */
  isWordSynced: boolean;
  /** Duration in ms */
  durationMs: number;
  /** Formatted LRC */
  toLrc: () => string;
  /** Clean Plain text */
  toPlainText: () => string;
  /** Clean JSON */
  toJSON: () => Lyric[];
}

/**
 * Universal Lyrics Parser for Node.js:
 * Parses TTML, RichSync, LRC, SRT, QRC, and Plain lyrics into clean structured JSON objects.
 */
export function parseLyrics(
  content: string,
  formatHint?: 'ttml' | 'richsync' | 'lrc' | 'srt' | 'qrc' | 'plain' | string,
  options?: { artist?: string; title?: string }
): UniversalLyricsResult {
  if (!content || typeof content !== 'string') {
    return {
      format: 'plain',
      lyrics: [],
      isWordSynced: false,
      durationMs: 0,
      toLrc: () => '',
      toPlainText: () => '',
      toJSON: () => [],
    };
  }

  const trimmed = content.trim();

  // 1. TTML XML
  if (
    formatHint === 'ttml' ||
    (trimmed.startsWith('<tt') || trimmed.includes('<tt xmlns') || trimmed.includes('</tt>'))
  ) {
    const parsed = parseTTML(trimmed);
    return {
      format: 'ttml',
      lyrics: parsed.lyrics,
      parsed,
      isWordSynced: parsed.hasWordSync,
      durationMs: parsed.durationMs,
      toLrc: () => parsed.toLrc(),
      toPlainText: () => parsed.toPlainText(),
      toJSON: () => parsed.lyrics,
    };
  }

  // 2. RichSync JSON (e.g. from Apple Music or QQ)
  if (
    formatHint === 'richsync' ||
    (trimmed.startsWith('[') && (trimmed.includes('"ts"') || trimmed.includes('"te"') || trimmed.includes('"l"')))
  ) {
    const parsed = parseRichSync(trimmed, options?.artist);
    return {
      format: 'richsync',
      lyrics: parsed.lyrics,
      parsed,
      isWordSynced: parsed.hasWordSync,
      durationMs: parsed.durationMs,
      toLrc: () => parsed.toLrc(),
      toPlainText: () => parsed.toPlainText(),
      toJSON: () => parsed.lyrics,
    };
  }

  // 3. QRC XML
  if (formatHint === 'qrc' || trimmed.includes('<QrcInfos>') || trimmed.includes('LyricContent=')) {
    try {
      const lyrics = QRCParser.parse(trimmed);
      const isWordSynced = lyrics.some((l) => l.parts && l.parts.length > 0);
      const maxTime = lyrics.reduce((max, l) => Math.max(max, l.startTimeMs + l.durationMs), 0);
      return {
        format: 'qrc',
        lyrics,
        isWordSynced,
        durationMs: maxTime,
        toLrc: () => lyricsToLrc(lyrics),
        toPlainText: () => lyrics.map((l) => l.words).join('\n'),
        toJSON: () => lyrics,
      };
    } catch {
      // Fallback
    }
  }

  // 4. SRT Subtitles
  if (formatHint === 'srt' || /^\d+\s*\n\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    try {
      const lyrics = SRTParser.parse(trimmed);
      const maxTime = lyrics.reduce((max, l) => Math.max(max, l.startTimeMs + l.durationMs), 0);
      return {
        format: 'srt',
        lyrics,
        isWordSynced: false,
        durationMs: maxTime,
        toLrc: () => lyricsToLrc(lyrics),
        toPlainText: () => lyrics.map((l) => l.words).join('\n'),
        toJSON: () => lyrics,
      };
    } catch {
      // Fallback
    }
  }

  // 5. LRC format
  if (formatHint === 'lrc' || /^\[\d{2}:\d{2}/m.test(trimmed)) {
    try {
      const lyrics = LRCParser.parse(trimmed);
      const isWordSynced = lyrics.some((l) => l.parts && l.parts.length > 0);
      const maxTime = lyrics.reduce((max, l) => Math.max(max, l.startTimeMs + l.durationMs), 0);
      return {
        format: 'lrc',
        lyrics,
        isWordSynced,
        durationMs: maxTime,
        toLrc: () => trimmed,
        toPlainText: () => lyrics.map((l) => l.words).join('\n'),
        toJSON: () => lyrics,
      };
    } catch {
      // Fallback
    }
  }

  // 6. Plain Text Fallback
  const plainLyrics = PlainParser.parse(trimmed);
  return {
    format: 'plain',
    lyrics: plainLyrics,
    isWordSynced: false,
    durationMs: 0,
    toLrc: () => trimmed,
    toPlainText: () => trimmed,
    toJSON: () => plainLyrics,
  };
}

function lyricsToLrc(lyrics: Lyric[]): string {
  return lyrics
    .map((l) => {
      const totalSec = Math.floor(l.startTimeMs / 1000);
      const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const sec = String(totalSec % 60).padStart(2, '0');
      const hundredths = String(Math.floor((l.startTimeMs % 1000) / 10)).padStart(2, '0');
      return `[${min}:${sec}.${hundredths}] ${l.words}`;
    })
    .join('\n');
}

export {
  TTMLParser,
  LRCParser,
  SRTParser,
  QRCParser,
  PlainParser,
  detectParser,
  parseTTMLContent,
};
export type { Lyric, LyricPart, SyncType };

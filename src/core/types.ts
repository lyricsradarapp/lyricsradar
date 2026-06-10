import type { ParsedTTML } from '../ttml/types.js';
import type { Lyric } from '@braccato/parsers';
import type { GeniusClientOptions, GeniusLyrics, GeniusSongHit } from '../genius/types.js';
import type {
  SyncedLyricsQuery,
  InternalProviderOptions,
  SyncedLyricsRawResult,
  LuminyLyricsQuery,
  LuminyClientOptions,
} from '../internal/types.js';

export interface LyricsRadarOptions {
  /** Optional Genius client options */
  genius?: GeniusClientOptions;
  /** Optional Luminy Lyrics options */
  luminy?: LuminyClientOptions;
  /** Global request timeout in ms */
  timeoutMs?: number;
}

export interface SyncedLyricsResult {
  /** Raw lyrics string (TTML XML, RichSync JSON, or LRC) */
  rawXml?: string;
  raw?: string;
  /** Parsed TTML structure with helpers (toLrc, toSrt, getLineAt, getWordAt) */
  parsed?: ParsedTTML;
  /** Braccato standard Lyric[] objects with parts and timestamps */
  lyrics?: Lyric[];
  /** LRC formatted synchronized string with proper word spacing */
  lrc?: string;
  /** Clean plain text lyrics */
  plainText?: string;
  /** Lyrics timing type ('Word' | 'Line' | 'None') */
  timing: 'Word' | 'Line' | 'None';
  /** Whether the lyrics have word-by-word timestamps */
  hasWordSync: boolean;
  /** Duration of the synced lyrics in milliseconds */
  durationMs: number;
  /** Matched track info from Catalog */
  track?: {
    id?: string;
    title?: string;
    artists?: Array<{ id?: string; name: string }>;
    durationMs?: number;
    cover?: { url: string; width: number; height: number };
  };
  /** Raw candidate information */
  best?: {
    format?: string;
    syncLevel?: string;
    quality?: number;
    content?: string;
  };
}

export interface UnifiedLyricsResult {
  /** Song title */
  title: string;
  /** Artist name */
  artist: string;
  /** Synced lyrics from Luminy (TTML / LRC + parsed) */
  synced?: SyncedLyricsResult;
  /** Braccato standard Lyric[] array */
  lyrics?: Lyric[];
  /** Genius lyrics and sections */
  genius?: GeniusLyrics;
  /** Best available plain text lyrics */
  plainText?: string;
  /** Best available LRC synchronized format */
  lrc?: string;
  /** Best available SRT subtitle format */
  srt?: string;
  /** Track information from metadata */
  track?: SyncedLyricsResult['track'];
}

export type {
  SyncedLyricsQuery,
  InternalProviderOptions,
  SyncedLyricsRawResult,
  LuminyLyricsQuery,
  LuminyClientOptions,
  Lyric,
};

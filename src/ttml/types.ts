import type { Lyric } from '@braccato/parsers';

export interface TTMLWord {
  text: string;
  beginMs: number;
  endMs: number;
  durationMs: number;
  beginFormatted: string;
  endFormatted: string;
}

export interface TTMLLine {
  text: string;
  beginMs: number;
  endMs: number;
  durationMs: number;
  beginFormatted: string;
  endFormatted: string;
  agent?: string;
  isBackground?: boolean;
  words?: TTMLWord[];
}

export interface TTMLMetadata {
  timing?: 'Word' | 'Line' | string;
  lang?: string;
  title?: string;
  artists?: string[];
  songwriters?: string[];
  translations?: string[];
  agents?: Array<{ id: string; type: string }>;
  rawAttributes?: Record<string, unknown>;
}

export interface ParsedTTML {
  metadata: TTMLMetadata;
  /** Detailed lines with words and formatted timestamps */
  lines: TTMLLine[];
  /** Braccato standard Lyric[] model */
  lyrics: Lyric[];
  rawXml: string;
  timing: 'Word' | 'Line' | 'None';
  durationMs: number;
  hasWordSync: boolean;

  /** Find the active line at a given playback timestamp in milliseconds */
  getLineAt(timestampMs: number): TTMLLine | undefined;

  /** Find the active word at a given playback timestamp in milliseconds */
  getWordAt(timestampMs: number): TTMLWord | undefined;

  /** Convert TTML to standard .lrc format */
  toLrc(options?: { includeWordSync?: boolean }): string;

  /** Convert TTML to plain text lyrics */
  toPlainText(): string;

  /** Convert TTML to .srt subtitle format */
  toSrt(): string;

  /** Return JSON array of lines */
  toJSON(): TTMLLine[];
}

export type { Lyric };

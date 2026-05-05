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
  words?: TTMLWord[];
}

export interface ParsedTTML {
  metadata: any;
  lines: TTMLLine[];
  rawXml?: string;
  timing: string;
  durationMs: number;
  hasWordSync: boolean;
  getLineAt(timestampMs: number): TTMLLine | undefined;
  getWordAt(timestampMs: number): TTMLWord | undefined;
  toLrc(): string;
  toPlainText(): string;
  toSrt(): string;
}

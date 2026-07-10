import type { Lyric, LyricPart } from '@braccato/parsers';
import type { ParsedTTML, TTMLLine, TTMLWord } from '../ttml/types.js';
import { formatMsToLrc, formatMsToSrt, formatMsToTtml } from '../ttml/time.js';

export interface RichSyncWord {
  c: string; // word content
  o?: number; // offset / start in seconds
  [key: string]: unknown;
}

export interface RichSyncLine {
  ts?: number; // timestamp start in seconds
  te?: number; // timestamp end in seconds
  l?: RichSyncWord[]; // words array
  x?: string; // full line text
  t?: string; // line text alternative
  [key: string]: unknown;
}

/**
 * Converts RichSync JSON string into a structured ParsedTTML object with word sync.
 */
export function parseRichSync(jsonStr: string, artistName = ''): ParsedTTML {
  let rawLines: RichSyncLine[] = [];
  try {
    rawLines = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  } catch {
    rawLines = [];
  }

  if (!Array.isArray(rawLines)) {
    rawLines = [];
  }

  const lines: TTMLLine[] = [];
  const braccatoLyrics: Lyric[] = [];
  let maxEndTimeMs = 0;
  let hasWordSync = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const beginSec = typeof rawLine.ts === 'number' ? rawLine.ts : 0;
    const endSec = typeof rawLine.te === 'number' ? rawLine.te : beginSec + 3;

    const beginMs = Math.round(beginSec * 1000);
    const endMs = Math.round(endSec * 1000);

    if (endMs > maxEndTimeMs) {
      maxEndTimeMs = endMs;
    }

    const words: TTMLWord[] = [];
    const parts: LyricPart[] = [];
    const rawWords = Array.isArray(rawLine.l) ? rawLine.l : [];

    if (rawWords.length > 0) {
      hasWordSync = true;
      for (let wIdx = 0; wIdx < rawWords.length; wIdx++) {
        const w = rawWords[wIdx];
        const nextW = rawWords[wIdx + 1];
        const wText = String(w.c || '').trim();
        if (!wText) continue;

        const wStartSec = typeof w.o === 'number' ? w.o : beginSec;
        const wStartMs = Math.round(wStartSec * 1000);
        const wEndSec = nextW && typeof nextW.o === 'number' ? nextW.o : endSec;
        const wEndMs = Math.round(wEndSec * 1000);

        if (wEndMs > maxEndTimeMs) {
          maxEndTimeMs = wEndMs;
        }

        const durationMs = Math.max(0, wEndMs - wStartMs);

        words.push({
          text: wText,
          beginMs: wStartMs,
          endMs: wEndMs,
          durationMs,
          beginFormatted: formatMsToTtml(wStartMs),
          endFormatted: formatMsToTtml(wEndMs),
        });

        parts.push({
          startTimeMs: wStartMs,
          durationMs,
          words: wText,
          isBackground: false,
        });
      }
    }

    let lineText = '';
    if (words.length > 0) {
      lineText = words.map((w) => w.text).join(' ');
    } else {
      lineText = String(rawLine.x || rawLine.t || '').replace(/\s+/g, ' ').trim();
    }

    if (lineText || words.length > 0) {
      lines.push({
        text: lineText,
        beginMs,
        endMs,
        durationMs: Math.max(0, endMs - beginMs),
        beginFormatted: formatMsToTtml(beginMs),
        endFormatted: formatMsToTtml(endMs),
        words: words.length > 0 ? words : undefined,
      });

      braccatoLyrics.push({
        key: String(idx),
        startTimeMs: beginMs,
        durationMs: Math.max(0, endMs - beginMs),
        words: lineText,
        parts: parts.length > 0 ? parts : undefined,
      });
    }
  }

  const generatedXml = richSyncToXml(lines, artistName);

  return {
    metadata: {
      timing: hasWordSync ? 'Word' : 'Line',
      songwriters: artistName ? [artistName] : undefined,
    },
    lines,
    lyrics: braccatoLyrics,
    rawXml: generatedXml,
    timing: hasWordSync ? 'Word' : 'Line',
    durationMs: maxEndTimeMs,
    hasWordSync,

    getLineAt(timestampMs: number): TTMLLine | undefined {
      if (typeof timestampMs !== 'number' || isNaN(timestampMs)) return undefined;
      for (const line of lines) {
        if (timestampMs >= line.beginMs && timestampMs <= line.endMs) {
          return line;
        }
      }
      let best: TTMLLine | undefined;
      for (const line of lines) {
        if (line.beginMs <= timestampMs) {
          best = line;
        } else {
          break;
        }
      }
      return best;
    },

    getWordAt(timestampMs: number): TTMLWord | undefined {
      const activeLine = this.getLineAt(timestampMs);
      if (!activeLine || !activeLine.words) return undefined;
      for (const word of activeLine.words) {
        if (timestampMs >= word.beginMs && timestampMs <= word.endMs) {
          return word;
        }
      }
      return undefined;
    },

    toLrc(options?: { includeWordSync?: boolean }): string {
      const lrcLines: string[] = [];

      for (const line of lines) {
        const timeTag = formatMsToLrc(line.beginMs);

        if (options?.includeWordSync && line.words && line.words.length > 0) {
          const wordTags = line.words
            .map((w) => `<${formatMsToTtml(w.beginMs)}>${w.text}`)
            .join(' ');
          lrcLines.push(`${timeTag} ${wordTags}`);
        } else {
          lrcLines.push(`${timeTag} ${line.text}`);
        }
      }

      return lrcLines.join('\n');
    },

    toPlainText(): string {
      return lines.map((l) => l.text).join('\n');
    },

    toSrt(): string {
      return lines
        .map((line, index) => {
          const num = index + 1;
          const start = formatMsToSrt(line.beginMs);
          const end = formatMsToSrt(line.endMs);
          return `${num}\n${start} --> ${end}\n${line.text}\n`;
        })
        .join('\n');
    },

    toJSON(): TTMLLine[] {
      return lines;
    },
  };
}

function richSyncToXml(lines: TTMLLine[], artistName: string): string {
  let bodyContent = '';
  for (const line of lines) {
    let spans = '';
    if (line.words && line.words.length > 0) {
      spans = line.words
        .map(
          (w) =>
            `<span begin="${w.beginFormatted}" end="${w.endFormatted}">${w.text} </span>`
        )
        .join('');
    } else {
      spans = line.text;
    }
    bodyContent += `      <p begin="${line.beginFormatted}" end="${line.endFormatted}">${spans}</p>\n`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" itunes:timing="Word" xml:lang="en">
  <head>
    <metadata>
      <iTunesMetadata>
        <songwriters>
          <songwriter>${artistName}</songwriter>
        </songwriters>
      </iTunesMetadata>
    </metadata>
  </head>
  <body>
    <div>
${bodyContent}    </div>
  </body>
</tt>`;
}

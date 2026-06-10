import * as cheerio from 'cheerio';
import type { ParsedTTML, TTMLLine, TTMLMetadata, TTMLWord } from './types.js';
import { formatMsToLrc, formatMsToSrt, formatMsToTtml, parseTimestampMs } from './time.js';
import { parseTTMLContent, type Lyric, type LyricPart } from '@braccato/parsers';

export class TTMLParseError extends Error {
  public cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'TTMLParseError';
    this.cause = cause;
  }
}

export function parseTTML(xml: string): ParsedTTML {
  if (!xml || typeof xml !== 'string') {
    throw new TTMLParseError('Invalid TTML input: expected non-empty string');
  }

  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(xml, { xml: true });
  } catch (err) {
    throw new TTMLParseError('Failed to parse TTML XML', err);
  }

  const ttEl = $('tt');
  const timingAttr = ttEl.attr('itunes:timing') || ttEl.attr('timing') || 'None';
  const langAttr = ttEl.attr('xml:lang') || ttEl.attr('lang');

  const songwriters: string[] = [];
  $('songwriters songwriter, iTunesMetadata songwriters songwriter').each((_, el) => {
    const text = $(el).text().trim();
    if (text) songwriters.push(text);
  });

  const translations: string[] = [];
  $('translations translation, iTunesMetadata translations translation').each((_, el) => {
    const text = $(el).text().trim();
    if (text) translations.push(text);
  });

  const agents: Array<{ id: string; type: string }> = [];
  $('metadata agent, ttm\\:agent, agent').each((_, el) => {
    const id = $(el).attr('xml:id') || $(el).attr('id') || '';
    const type = $(el).attr('type') || '';
    if (id || type) {
      agents.push({ id, type });
    }
  });

  const metadata: TTMLMetadata = {
    timing: timingAttr,
    lang: langAttr,
    songwriters: songwriters.length > 0 ? songwriters : undefined,
    translations: translations.length > 0 ? translations : undefined,
    agents: agents.length > 0 ? agents : undefined,
  };

  const lines: TTMLLine[] = [];
  let maxEndTimeMs = 0;
  let hasWordSync = false;

  const paragraphs = $('p');
  paragraphs.each((_, pEl) => {
    const p = $(pEl);
    const beginRaw = p.attr('begin');
    const endRaw = p.attr('end');
    const agent = p.attr('ttm:agent') || p.attr('agent') || undefined;

    const beginMs = parseTimestampMs(beginRaw);
    const endMs = parseTimestampMs(endRaw);

    if (endMs > maxEndTimeMs) {
      maxEndTimeMs = endMs;
    }

    const words: TTMLWord[] = [];
    const spans = p.find('span');

    if (spans.length > 0) {
      spans.each((_, spanEl) => {
        const span = $(spanEl);
        const wBeginRaw = span.attr('begin');
        const wEndRaw = span.attr('end');
        const rawText = span.text();

        if (wBeginRaw && wEndRaw) {
          hasWordSync = true;
          const wBeginMs = parseTimestampMs(wBeginRaw);
          const wEndMs = parseTimestampMs(wEndRaw);

          if (wEndMs > maxEndTimeMs) {
            maxEndTimeMs = wEndMs;
          }

          words.push({
            text: rawText,
            beginMs: wBeginMs,
            endMs: wEndMs,
            durationMs: Math.max(0, wEndMs - wBeginMs),
            beginFormatted: formatMsToTtml(wBeginMs),
            endFormatted: formatMsToTtml(wEndMs),
          });
        }
      });
    }

    let lineText = '';
    if (words.length > 0) {
      // Build line text with proper space preservation
      const parts: string[] = [];
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const trimmed = w.text.trim();
        if (!trimmed) continue;
        parts.push(trimmed);
      }
      lineText = parts.join(' ');
    } else {
      lineText = p.text().replace(/\s+/g, ' ').trim();
    }

    // Only add if there is text or duration
    if (lineText || words.length > 0) {
      lines.push({
        text: lineText,
        beginMs,
        endMs,
        durationMs: Math.max(0, endMs - beginMs),
        beginFormatted: formatMsToTtml(beginMs),
        endFormatted: formatMsToTtml(endMs),
        agent,
        isBackground: agent === 'v2' || agent === 'background',
        words: words.length > 0 ? words : undefined,
      });
    }
  });

  // Sort lines by begin timestamp
  lines.sort((a, b) => a.beginMs - b.beginMs);

  const timingType: 'Word' | 'Line' | 'None' =
    hasWordSync || timingAttr.toLowerCase() === 'word'
      ? 'Word'
      : lines.length > 0
      ? 'Line'
      : 'None';

  // Compute braccato Lyric[] model directly
  let braccatoLyrics: Lyric[] = [];
  try {
    const braccatoResult = parseTTMLContent(xml);
    braccatoLyrics = braccatoResult.lyrics;
  } catch {
    // Fallback: convert our parsed lines into braccato Lyric format
    braccatoLyrics = lines.map((l, idx) => ({
      key: String(idx),
      startTimeMs: l.beginMs,
      durationMs: l.durationMs,
      words: l.text,
      agent: l.agent,
      parts: l.words?.map((w) => ({
        startTimeMs: w.beginMs,
        durationMs: w.durationMs,
        words: w.text.trim(),
        isBackground: l.isBackground,
      })),
    }));
  }

  const result: ParsedTTML = {
    metadata,
    lines,
    lyrics: braccatoLyrics,
    rawXml: xml,
    timing: timingType,
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

      if (metadata.songwriters && metadata.songwriters.length > 0) {
        lrcLines.push(`[ar:${metadata.songwriters.join(', ')}]`);
      }

      for (const line of lines) {
        const timeTag = formatMsToLrc(line.beginMs);

        if (options?.includeWordSync && line.words && line.words.length > 0) {
          const wordTags = line.words
            .map((w) => `<${formatMsToTtml(w.beginMs)}>${w.text.trim()}`)
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

  return result;
}

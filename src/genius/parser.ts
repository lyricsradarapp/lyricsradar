import * as cheerio from 'cheerio';
import type { GeniusLyrics, GeniusSection, GeniusSectionType } from './types.js';

export class GeniusParseError extends Error {
  public cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'GeniusParseError';
    this.cause = cause;
  }
}

function determineSectionType(header: string): GeniusSectionType {
  const lower = header.toLowerCase();
  if (lower.includes('intro')) return 'intro';
  if (lower.includes('outro')) return 'outro';
  if (lower.includes('pre-chorus')) return 'pre-chorus';
  if (lower.includes('post-chorus')) return 'post-chorus';
  if (lower.includes('chorus') || lower.includes('refrain')) return 'chorus';
  if (lower.includes('hook')) return 'hook';
  if (lower.includes('bridge')) return 'bridge';
  if (lower.includes('verse')) return 'verse';
  if (lower.includes('instrumental')) return 'instrumental';
  if (lower.includes('solo')) return 'solo';
  return 'other';
}

function parseHeaderDetails(rawHeader: string): { name: string; type: GeniusSectionType; performer?: string } {
  const clean = rawHeader.replace(/^\[+|\]+$/g, '').trim();
  const colonIndex = clean.indexOf(':');

  let name = clean;
  let performer: string | undefined;

  if (colonIndex !== -1) {
    name = clean.slice(0, colonIndex).trim();
    performer = clean.slice(colonIndex + 1).trim();
  }

  const type = determineSectionType(name);
  return { name, type, performer };
}

function cleanLyricsText(rawText: string): string {
  let cleaned = rawText
    // Remove "You might also like" snippets inserted by Genius
    .replace(/You might also like/gi, '')
    // Remove embed counters, e.g. "123Embed", "74Embed", "Embed"
    .replace(/\s*\d*Embed\s*/gim, '')
    // Remove contributors prefix if present
    .replace(/^\d+\s+Contributors/gim, '')
    .replace(/See\s+.*?\s+LiveGet\s+tickets\s+as\s+low\s+as\s+\$\d+/gi, '')
    // Remove translations header banner if captured in text
    .replace(/^Translations[^\n]*\n?/gim, '')
    // Normalize newlines
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If the lyrics start with "... Lyrics", strip that header line
  cleaned = cleaned.replace(/^[^\n\[\]]*?\s+Lyrics\s*\n+/i, '');

  return cleaned.trim();
}

export function parseGeniusLyricsHtml(
  html: string,
  extraMetadata?: Partial<GeniusLyrics>
): GeniusLyrics {
  if (!html || typeof html !== 'string') {
    throw new GeniusParseError('Invalid HTML input for Genius lyrics parser');
  }

  const $ = cheerio.load(html);

  // Remove script, style, translation and header elements
  $(
    'script, style, noscript, iframe, [class*="Translations__"], [class*="LyricsHeader"], [class*="HeaderDesktop"], [class*="SongHeader"], .header_with_cover_art'
  ).remove();

  // Find all lyric containers
  const lyricContainers = $('[data-lyrics-container="true"]');
  const legacyContainer = $('.lyrics');

  let rawLyricsPieces: string[] = [];

  if (lyricContainers.length > 0) {
    lyricContainers.each((_, el) => {
      // Replace <br> with newline
      $(el).find('br').replaceWith('\n');
      const text = $(el).text();
      if (text) {
        rawLyricsPieces.push(text);
      }
    });
  } else if (legacyContainer.length > 0) {
    legacyContainer.find('br').replaceWith('\n');
    rawLyricsPieces.push(legacyContainer.text());
  }

  if (rawLyricsPieces.length === 0) {
    throw new GeniusParseError('No lyrics container found in the provided HTML');
  }

  const combinedLyrics = cleanLyricsText(rawLyricsPieces.join('\n'));

  // Parse sections [Verse 1], [Chorus], etc.
  const sections: GeniusSection[] = [];
  const lines = combinedLyrics.split('\n');

  let currentSection: GeniusSection = {
    rawHeader: '[Song]',
    name: 'Song',
    type: 'other',
    lines: [],
  };

  const headerRegex = /^\[(.*?)\]$/;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(headerRegex);

    if (match) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      const { name, type, performer } = parseHeaderDetails(trimmed);
      currentSection = {
        rawHeader: trimmed,
        name,
        type,
        performer,
        lines: [],
      };
    } else if (trimmed.length > 0) {
      currentSection.lines.push(line);
    }
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // Extract meta tags if not provided in extraMetadata
  const title =
    extraMetadata?.title ||
    $('meta[property="og:title"]').attr('content')?.replace(/\s*–\s*Lyrics.*$/i, '') ||
    $('title').text().replace(/\s*–\s*Lyrics.*$/i, '').trim() ||
    'Unknown Title';

  const artist =
    extraMetadata?.artist ||
    $('meta[name="twitter:creator"]').attr('content') ||
    '';

  const url =
    extraMetadata?.url ||
    $('meta[property="og:url"]').attr('content') ||
    '';

  const songArtImageUrl =
    extraMetadata?.songArtImageUrl ||
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content');

  const description =
    extraMetadata?.description ||
    $('meta[property="og:description"]').attr('content');

  return {
    id: extraMetadata?.id,
    title,
    artist,
    url,
    lyrics: combinedLyrics,
    sections,
    songArtImageUrl,
    headerImageUrl: extraMetadata?.headerImageUrl || songArtImageUrl,
    album: extraMetadata?.album,
    releaseDate: extraMetadata?.releaseDate,
    description,
  };
}

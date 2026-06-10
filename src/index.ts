import { LyricsRadar } from './core/radar.js';
import type {
  SyncedLyricsQuery,
  InternalProviderOptions,
  SyncedLyricsResult,
  UnifiedLyricsResult,
  LyricsRadarOptions,
  LuminyLyricsQuery,
  LuminyClientOptions,
  Lyric,
} from './core/types.js';
import type {
  GeniusClientOptions,
  GeniusLyrics,
  GeniusSearchOptions,
  GeniusSongHit,
} from './genius/types.js';
import { parseTTML } from './ttml/parser.js';
import { parseLyrics, parseRichSync } from './parsers/index.js';

// Default global radar instance
const defaultRadar = new LyricsRadar();

/**
 * Fetch synchronized lyrics (TTML / LRC / Word-sync) from Luminy provider.
 *
 * @example
 * ```ts
 * import { getSyncedLyrics } from 'lyricsradar';
 *
 * const result = await getSyncedLyrics({
 *   title: 'Shape of You',
 *   artist: 'Ed Sheeran'
 * });
 * console.log(result.lyrics); // Lyric[]
 * console.log(result.lrc);
 * ```
 */
export async function getSyncedLyrics(
  query: SyncedLyricsQuery,
  options?: InternalProviderOptions
): Promise<SyncedLyricsResult> {
  return defaultRadar.getSyncedLyrics(query, options);
}

/**
 * Alias for getSyncedLyrics.
 */
export const getLuminyLyrics = getSyncedLyrics;

/**
 * Search and get Genius lyrics for a song.
 */
export async function getGeniusLyrics(
  titleOrQuery: string,
  artist?: string,
  options?: { signal?: AbortSignal }
): Promise<GeniusLyrics | null> {
  return defaultRadar.getGeniusLyrics(titleOrQuery, artist, options);
}

/**
 * Search Genius for songs.
 */
export async function searchGenius(
  query: string,
  options?: GeniusSearchOptions
): Promise<GeniusSongHit[]> {
  return defaultRadar.searchGenius(query, options);
}

/**
 * Unified search: fetches both Synced (Luminy) and Genius lyrics in parallel.
 */
export async function searchLyrics(
  query: SyncedLyricsQuery,
  options?: {
    syncedOptions?: InternalProviderOptions;
    geniusOptions?: { signal?: AbortSignal };
  }
): Promise<UnifiedLyricsResult> {
  return defaultRadar.search(query, options);
}

export { LyricsRadar, parseTTML, parseLyrics, parseRichSync };

// Re-export submodules
export * from './core/types.js';
export * from './genius/index.js';
export * from './ttml/index.js';
export * from './parsers/index.js';

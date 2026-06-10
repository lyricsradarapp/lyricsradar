import { GeniusClient } from '../genius/client.js';
import { fetchSyncedLyrics } from './bridge.js';
import { parseLyrics } from '../parsers/universal.js';
import { parseTTML } from '../ttml/parser.js';
import type {
  LyricsRadarOptions,
  SyncedLyricsResult,
  UnifiedLyricsResult,
  SyncedLyricsQuery,
  InternalProviderOptions,
} from './types.js';
import type {
  GeniusClientOptions,
  GeniusLyrics,
  GeniusSearchOptions,
  GeniusSongHit,
} from '../genius/types.js';

export class LyricsRadar {
  public genius: GeniusClient;
  private defaultSyncedOptions?: InternalProviderOptions;
  private timeoutMs?: number;

  constructor(options?: LyricsRadarOptions) {
    this.genius = new GeniusClient(options?.genius);
    this.defaultSyncedOptions = options?.luminy;
    this.timeoutMs = options?.timeoutMs;
  }

  /**
   * Fetches synchronized lyrics from Luminy provider.
   */
  async getSyncedLyrics(
    query: SyncedLyricsQuery,
    options?: InternalProviderOptions
  ): Promise<SyncedLyricsResult> {
    const mergedOptions: InternalProviderOptions = {
      timeoutMs: this.timeoutMs,
      ...this.defaultSyncedOptions,
      ...options,
    };

    const rawResult = await fetchSyncedLyrics(query, mergedOptions);

    const title = query.s || query.song || query.songName || query.title || query.q || '';
    const artist = query.a || query.artist || query.artistName || '';

    const rawContent =
      rawResult.best?.content ||
      rawResult.ttml ||
      rawResult.lrc ||
      rawResult.plain ||
      '';

    const formatHint = rawResult.best?.format || (rawResult.ttml ? 'ttml' : rawResult.lrc ? 'lrc' : 'plain');

    const universal = parseLyrics(rawContent, formatHint, {
      title,
      artist: artist || rawResult.track?.artists?.[0]?.name,
    });

    const lrc = universal.toLrc() || rawResult.lrc || undefined;
    const plainText = universal.toPlainText() || rawResult.plain || undefined;
    const timing = universal.isWordSynced ? 'Word' : universal.lyrics.length > 0 ? 'Line' : 'None';
    const durationMs = universal.durationMs || rawResult.track?.durationMs || 0;

    return {
      rawXml: rawResult.ttml || (universal.format === 'ttml' ? rawContent : undefined),
      raw: rawContent,
      parsed: universal.parsed,
      lyrics: universal.lyrics,
      lrc,
      plainText,
      timing,
      hasWordSync: universal.isWordSynced,
      durationMs,
      track: rawResult.track,
      best: rawResult.best || undefined,
    };
  }

  /**
   * Alias for getSyncedLyrics.
   */
  async getLuminyLyrics(
    query: SyncedLyricsQuery,
    options?: InternalProviderOptions
  ): Promise<SyncedLyricsResult> {
    return this.getSyncedLyrics(query, options);
  }

  /**
   * Searches and parses lyrics from Genius.
   */
  async getGeniusLyrics(
    titleOrQuery: string,
    artist?: string,
    options?: { signal?: AbortSignal }
  ): Promise<GeniusLyrics | null> {
    return this.genius.searchAndGetLyrics(titleOrQuery, artist, options);
  }

  /**
   * Search Genius for songs.
   */
  async searchGenius(
    query: string,
    options?: GeniusSearchOptions
  ): Promise<GeniusSongHit[]> {
    return this.genius.search(query, options);
  }

  /**
   * Unified search: Fetches both Synced (Luminy) and Genius lyrics simultaneously.
   */
  async search(
    query: SyncedLyricsQuery,
    options?: {
      syncedOptions?: InternalProviderOptions;
      geniusOptions?: { signal?: AbortSignal };
    }
  ): Promise<UnifiedLyricsResult> {
    const title = query.s || query.song || query.songName || query.title || query.q || '';
    const artist = query.a || query.artist || query.artistName || '';

    const [syncedPromise, geniusPromise] = await Promise.allSettled([
      this.getSyncedLyrics(query, options?.syncedOptions),
      this.getGeniusLyrics(title, artist, options?.geniusOptions),
    ]);

    const synced =
      syncedPromise.status === 'fulfilled' ? syncedPromise.value : undefined;
    const genius =
      geniusPromise.status === 'fulfilled' && geniusPromise.value
        ? geniusPromise.value
        : undefined;

    let plainText: string | undefined;
    let lrc: string | undefined;
    let srt: string | undefined;

    if (synced) {
      plainText = synced.plainText || synced.parsed?.toPlainText();
      lrc = synced.lrc || synced.parsed?.toLrc();
      srt = synced.parsed?.toSrt();
    }

    if (!plainText && genius) {
      plainText = genius.lyrics;
    }

    return {
      title,
      artist,
      synced,
      lyrics: synced?.lyrics,
      genius,
      plainText,
      lrc,
      srt,
      track: synced?.track,
    };
  }

  static parseLyrics(
    content: string,
    formatHint?: string,
    options?: { artist?: string; title?: string }
  ) {
    return parseLyrics(content, formatHint, options);
  }

  static parseTTML(xml: string) {
    return parseTTML(xml);
  }
}

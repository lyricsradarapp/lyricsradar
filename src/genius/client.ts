import type {
  GeniusClientOptions,
  GeniusLyrics,
  GeniusSearchOptions,
  GeniusSongHit,
} from './types.js';
import { parseGeniusLyricsHtml, GeniusParseError } from './parser.js';

export class GeniusApiError extends Error {
  public statusCode?: number;
  public details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'GeniusApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class GeniusClient {
  private accessToken?: string;
  private timeoutMs: number;
  private userAgent: string;
  private customHeaders: Record<string, string>;

  constructor(options?: GeniusClientOptions) {
    this.accessToken = options?.accessToken;
    this.timeoutMs = options?.timeoutMs || 10000;
    this.userAgent =
      options?.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.customHeaders = options?.headers || {};
  }

  private async fetchJson(url: string, signal?: AbortSignal): Promise<any> {
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': this.userAgent,
      ...this.customHeaders,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let controller: AbortController | undefined;
    let effectiveSignal = signal;

    if (!effectiveSignal && this.timeoutMs) {
      controller = new AbortController();
      effectiveSignal = controller.signal;
      setTimeout(() => controller?.abort(), this.timeoutMs);
    }

    let response: Response;
    try {
      response = await fetch(url, { headers, signal: effectiveSignal });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new GeniusApiError('Genius API request timed out', 408);
      }
      throw new GeniusApiError(`Genius API network error: ${err?.message || err}`, 500, err);
    }

    if (!response.ok) {
      throw new GeniusApiError(
        `Genius API request failed with status ${response.status}`,
        response.status
      );
    }

    return response.json();
  }

  private async fetchHtml(url: string, signal?: AbortSignal): Promise<string> {
    const headers: Record<string, string> = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': this.userAgent,
      'Accept-Language': 'en-US,en;q=0.9',
      ...this.customHeaders,
    };

    let controller: AbortController | undefined;
    let effectiveSignal = signal;

    if (!effectiveSignal && this.timeoutMs) {
      controller = new AbortController();
      effectiveSignal = controller.signal;
      setTimeout(() => controller?.abort(), this.timeoutMs);
    }

    let response: Response;
    try {
      response = await fetch(url, { headers, signal: effectiveSignal });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new GeniusApiError('Genius HTML request timed out', 408);
      }
      throw new GeniusApiError(`Genius HTML request failed: ${err?.message || err}`, 500, err);
    }

    if (!response.ok) {
      throw new GeniusApiError(
        `Failed to fetch Genius song page (${response.status} ${response.statusText})`,
        response.status
      );
    }

    return response.text();
  }

  /**
   * Search for songs on Genius
   */
  async search(query: string, options?: GeniusSearchOptions): Promise<GeniusSongHit[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const trimmed = query.trim();
    let url: string;

    if (this.accessToken) {
      url = `https://api.genius.com/search?q=${encodeURIComponent(trimmed)}`;
    } else {
      url = `https://genius.com/api/search/multi?q=${encodeURIComponent(trimmed)}`;
    }

    const data = await this.fetchJson(url, options?.signal);
    const results: GeniusSongHit[] = [];

    // Authenticated API response format
    if (data?.response?.hits) {
      for (const item of data.response.hits) {
        if (item.type === 'song' && item.result) {
          results.push(this.transformHit(item.result));
        }
      }
    }
    // Public multi-search response format
    else if (data?.response?.sections) {
      const songSection = data.response.sections.find((s: any) => s.type === 'song' || s.type === 'top_hit');
      if (songSection && Array.isArray(songSection.hits)) {
        for (const item of songSection.hits) {
          if (item.result) {
            results.push(this.transformHit(item.result));
          }
        }
      }
    }

    const limit = options?.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * Search specifically for a single song by title and optional artist name
   */
  async searchSong(
    title: string,
    artist?: string,
    options?: GeniusSearchOptions
  ): Promise<GeniusSongHit | null> {
    const query = artist ? `${artist} ${title}` : title;
    const hits = await this.search(query, options);

    if (hits.length === 0) {
      return null;
    }

    if (!artist) {
      return hits[0];
    }

    // Rank hits by matching artist and title
    const normArtist = artist.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const hit of hits) {
      const hitArtist = (hit.artistNames || hit.primaryArtist?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const hitTitle = hit.title.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (hitArtist.includes(normArtist) || normArtist.includes(hitArtist)) {
        if (hitTitle.includes(normTitle) || normTitle.includes(hitTitle)) {
          return hit;
        }
      }
    }

    return hits[0];
  }

  /**
   * Get song metadata by Genius song ID
   */
  async getSongById(songId: number, signal?: AbortSignal): Promise<GeniusSongHit> {
    const url = this.accessToken
      ? `https://api.genius.com/songs/${songId}`
      : `https://genius.com/api/songs/${songId}`;

    const data = await this.fetchJson(url, signal);
    if (!data?.response?.song) {
      throw new GeniusApiError(`Song with id ${songId} not found`, 404);
    }

    return this.transformHit(data.response.song);
  }

  /**
   * Fetch and parse lyrics for a given Genius song URL or ID or Search Hit
   */
  async getLyrics(
    target: string | number | GeniusSongHit,
    options?: { signal?: AbortSignal }
  ): Promise<GeniusLyrics> {
    let url: string;
    let metadata: Partial<GeniusLyrics> = {};

    if (typeof target === 'object' && target !== null && 'url' in target) {
      url = target.url;
      metadata = {
        id: target.id,
        title: target.title,
        artist: target.artistNames || target.primaryArtist?.name,
        url: target.url,
        headerImageUrl: target.headerImageUrl,
        songArtImageUrl: target.songArtImageUrl,
      };
    } else if (typeof target === 'number') {
      const song = await this.getSongById(target, options?.signal);
      url = song.url;
      metadata = {
        id: song.id,
        title: song.title,
        artist: song.artistNames || song.primaryArtist?.name,
        url: song.url,
        headerImageUrl: song.headerImageUrl,
        songArtImageUrl: song.songArtImageUrl,
      };
    } else if (typeof target === 'string') {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        url = target;
      } else {
        const hit = await this.searchSong(target, undefined, { signal: options?.signal });
        if (!hit) {
          throw new GeniusApiError(`No song found for query: ${target}`, 404);
        }
        url = hit.url;
        metadata = {
          id: hit.id,
          title: hit.title,
          artist: hit.artistNames || hit.primaryArtist?.name,
          url: hit.url,
          headerImageUrl: hit.headerImageUrl,
          songArtImageUrl: hit.songArtImageUrl,
        };
      }
    } else {
      throw new GeniusApiError('Invalid target provided for getLyrics');
    }

    const html = await this.fetchHtml(url, options?.signal);
    return parseGeniusLyricsHtml(html, metadata);
  }

  /**
   * One-step search and fetch lyrics
   */
  async searchAndGetLyrics(
    title: string,
    artist?: string,
    options?: { signal?: AbortSignal }
  ): Promise<GeniusLyrics | null> {
    const hit = await this.searchSong(title, artist, options);
    if (!hit) return null;
    return this.getLyrics(hit, options);
  }

  private transformHit(raw: any): GeniusSongHit {
    return {
      id: raw.id,
      title: raw.title,
      titleWithFeatured: raw.title_with_featured,
      fullTitle: raw.full_title,
      artistNames: raw.artist_names || raw.primary_artist?.name || '',
      url: raw.url,
      path: raw.path,
      headerImageUrl: raw.header_image_url,
      songArtImageUrl: raw.song_art_image_url || raw.header_image_thumbnail_url,
      lyricsState: raw.lyrics_state,
      stats: {
        hot: raw.stats?.hot,
        pageviews: raw.stats?.pageviews,
        unreviewedAnnotations: raw.stats?.unreviewed_annotations,
      },
      primaryArtist: {
        id: raw.primary_artist?.id,
        name: raw.primary_artist?.name,
        url: raw.primary_artist?.url,
        imageUrl: raw.primary_artist?.image_url,
        headerImageUrl: raw.primary_artist?.header_image_url,
      },
    };
  }
}

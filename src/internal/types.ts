export interface SyncedLyricsQuery {
  /** Song title (corresponds to 's', 'song', 'songName', 'title') */
  title?: string;
  song?: string;
  songName?: string;
  s?: string;

  /** Artist name (corresponds to 'a', 'artist', 'artistName') */
  artist?: string;
  artistName?: string;
  a?: string;

  /** Album name (corresponds to 'al', 'album', 'albumName') */
  album?: string;
  albumName?: string;
  al?: string;

  /** Duration in seconds (corresponds to 'd', 'duration') */
  duration?: number | string;
  d?: number | string;

  /** Raw full query */
  q?: string;

  /** Optional API Key */
  apiKey?: string;
}

export type LuminyLyricsQuery = SyncedLyricsQuery;

export interface InternalProviderOptions {
  /** Custom Luminy Lyrics endpoint URL */
  luminyUrl?: string;
  baseUrl?: string;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** Custom AbortSignal */
  signal?: AbortSignal;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
  /** Optional custom secret override */
  secret?: string;
}

export type LuminyClientOptions = InternalProviderOptions;

export interface SyncedLyricsRawResult {
  ttml?: string | null;
  lrc?: string | null;
  plain?: string | null;
  best?: {
    format?: string;
    syncLevel?: string;
    quality?: number;
    content?: string;
  } | null;
  track?: {
    id?: string;
    title?: string;
    artists?: Array<{ id?: string; name: string }>;
    durationMs?: number;
    cover?: { url: string; width: number; height: number };
  };
  bestSyncLevel?: string | null;
  [key: string]: unknown;
}

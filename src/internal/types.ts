export interface SyncedLyricsQuery {
  title?: string;
  song?: string;
  songName?: string;
  s?: string;
  artist?: string;
  artistName?: string;
  a?: string;
  album?: string;
  albumName?: string;
  al?: string;
  duration?: number | string;
  d?: number | string;
  q?: string;
}

export interface InternalProviderOptions {
  luminyUrl?: string;
  baseUrl?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface SyncedLyricsRawResult {
  ttml?: string | null;
  lrc?: string | null;
  plain?: string | null;
  best?: any;
  track?: any;
}

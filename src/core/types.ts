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

export interface SyncedLyricsResult {
  raw?: string;
  lyrics?: any[];
  lrc?: string;
  plainText?: string;
  timing: 'Word' | 'Line' | 'None';
  hasWordSync: boolean;
  durationMs: number;
  track?: any;
}

export interface UnifiedLyricsResult {
  title: string;
  artist: string;
  synced?: SyncedLyricsResult;
  genius?: any;
  plainText?: string;
  lrc?: string;
}

export interface LyricsRadarOptions {
  genius?: any;
  luminy?: any;
  timeoutMs?: number;
}

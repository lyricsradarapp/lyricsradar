export interface GeniusArtist {
  id: number;
  name: string;
  url: string;
  imageUrl?: string;
  headerImageUrl?: string;
}

export interface GeniusSongHit {
  id: number;
  title: string;
  titleWithFeatured?: string;
  fullTitle: string;
  artistNames: string;
  primaryArtist: GeniusArtist;
  url: string;
  headerImageUrl?: string;
  songArtImageUrl?: string;
  lyricsState?: string;
  path?: string;
  stats?: {
    hot?: boolean;
    pageviews?: number;
    unreviewedAnnotations?: number;
  };
}

export type GeniusSectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'post-chorus'
  | 'hook'
  | 'bridge'
  | 'outro'
  | 'instrumental'
  | 'solo'
  | 'other';

export interface GeniusSection {
  rawHeader: string;
  name: string;
  type: GeniusSectionType;
  performer?: string;
  lines: string[];
}

export interface GeniusLyrics {
  id?: number;
  title: string;
  artist: string;
  url: string;
  lyrics: string;
  sections: GeniusSection[];
  headerImageUrl?: string;
  songArtImageUrl?: string;
  album?: string;
  releaseDate?: string;
  description?: string;
}

export interface GeniusClientOptions {
  /** Optional Genius API Client Access Token for authenticated requests */
  accessToken?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Custom User-Agent header */
  userAgent?: string;
  /** Custom headers to send with requests */
  headers?: Record<string, string>;
}

export interface GeniusSearchOptions {
  /** Limit search results (default: 10) */
  limit?: number;
  /** Abort signal for cancelling request */
  signal?: AbortSignal;
}

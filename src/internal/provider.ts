import type { SyncedLyricsQuery, InternalProviderOptions, SyncedLyricsRawResult } from './types.js';
import { signRequest } from './signer/signer.js';
import { getNativeSigner } from './signer/native.js';

const DEFAULT_BASE = 'https://lyrics-api.luminy.tech';
const DEFAULT_PATH = '/v1/lyrics';

let moduleInitialized = false;

function ensureModuleInitialized(baseUrl: string): void {
  if (moduleInitialized) return;
  moduleInitialized = true;
  try {
    const native = getNativeSigner();
    if (native) {
      native.initModule(baseUrl);
    }
  } catch {
  }
}

export class LuminyLyricsError extends Error {
  public statusCode?: number;
  public details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'LuminyLyricsError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const InternalProviderError = LuminyLyricsError;

export async function fetchSyncedLyricsInternal(
  query: SyncedLyricsQuery,
  options?: InternalProviderOptions
): Promise<SyncedLyricsRawResult> {
  const song = query.s ?? query.song ?? query.songName ?? query.title ?? query.q;
  const artist = query.a ?? query.artist ?? query.artistName;
  const album = query.al ?? query.album ?? query.albumName;
  const duration = query.d ?? query.duration;

  if (!song) {
    throw new LuminyLyricsError(
      'Song title parameter is required.',
      400
    );
  }

  const base =
    options?.luminyUrl ||
    options?.baseUrl ||
    (options as any)?.luminyUrl ||
    (typeof process !== 'undefined' && process.env?.LUMINY_LYRICS_URL) ||
    (typeof process !== 'undefined' && process.env?.LYRICSRADAR_luminyUrl_URL) ||
    DEFAULT_BASE;

  const url = new URL(DEFAULT_PATH, base);

  url.searchParams.set('s', String(song).trim());
  if (artist) {
    url.searchParams.set('a', String(artist).trim());
  }
  if (album) {
    url.searchParams.set('al', String(album).trim());
  }
  if (duration !== undefined && duration !== null && duration !== '') {
    url.searchParams.set('d', String(duration).trim());
  }

  ensureModuleInitialized(base);

  const signed = signRequest('POST', DEFAULT_PATH);

  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': 'LuminyLyrics/1.0',
    ...signed.headers,
    ...(options?.headers || {}),
  };

  let controller: AbortController | undefined;
  let signal = options?.signal;

  if (!signal && options?.timeoutMs) {
    controller = new AbortController();
    signal = controller.signal;
    setTimeout(() => controller?.abort(), options.timeoutMs);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: signed.body,
      signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new LuminyLyricsError('Request timed out', 408);
    }
    throw new LuminyLyricsError(
      `Network request to Luminy failed: ${err?.message || err}`,
      500,
      err
    );
  }

  if (!response.ok) {
    let errorBody: any;
    try {
      errorBody = await response.json();
    } catch {
      try {
        errorBody = await response.text();
      } catch {
        errorBody = null;
      }
    }

    const msg =
      typeof errorBody === 'object' && errorBody?.message
        ? errorBody.message
        : typeof errorBody === 'object' && errorBody?.error
        ? errorBody.error
        : `Request failed with status ${response.status} (${response.statusText})`;

    throw new LuminyLyricsError(msg, response.status, errorBody);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err: any) {
    throw new LuminyLyricsError('Failed to parse response as JSON', 502, err);
  }

  if (!data || typeof data !== 'object') {
    throw new LuminyLyricsError('Invalid response received from Luminy', 502, data);
  }

  return data as SyncedLyricsRawResult;
}

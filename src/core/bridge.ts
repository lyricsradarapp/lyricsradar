import { fetchSyncedLyricsInternal } from '../internal/provider.js';
import type {
  SyncedLyricsQuery,
  InternalProviderOptions,
  SyncedLyricsRawResult,
} from '../internal/types.js';

export async function fetchSyncedLyrics(
  query: SyncedLyricsQuery,
  options?: InternalProviderOptions
): Promise<SyncedLyricsRawResult> {
  return fetchSyncedLyricsInternal(query, options);
}

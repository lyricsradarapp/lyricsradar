/**
 * Parses TTML / Media timestamps into milliseconds.
 * Supports formats:
 * - "00:01.234", "01:23.456" (mm:ss.xxx)
 * - "00:01:23.456", "01:23:45.678" (hh:mm:ss.xxx)
 * - "12.345s", "12s" (seconds)
 * - "12345ms" (milliseconds)
 */
export function parseTimestampMs(timeStr: string | number | undefined | null): number {
  if (timeStr === undefined || timeStr === null) return 0;
  if (typeof timeStr === 'number') return Math.max(0, timeStr);

  const str = String(timeStr).trim();
  if (!str) return 0;

  if (str.endsWith('ms')) {
    const val = parseFloat(str.slice(0, -2));
    return isNaN(val) ? 0 : Math.max(0, val);
  }

  if (str.endsWith('s')) {
    const val = parseFloat(str.slice(0, -1));
    return isNaN(val) ? 0 : Math.max(0, Math.round(val * 1000));
  }

  const parts = str.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return Math.max(0, Math.round((hours * 3600 + minutes * 60 + seconds) * 1000));
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.max(0, Math.round((minutes * 60 + seconds) * 1000));
  } else if (parts.length === 1) {
    const seconds = parseFloat(parts[0]) || 0;
    return Math.max(0, Math.round(seconds * 1000));
  }

  return 0;
}

/**
 * Format milliseconds into mm:ss.xxx (e.g. 01:23.456)
 */
export function formatMsToTtml(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = safeMs % 1000;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const xxx = String(milliseconds).padStart(3, '0');

  return `${mm}:${ss}.${xxx}`;
}

/**
 * Format milliseconds into LRC timestamp [mm:ss.xx]
 */
export function formatMsToLrc(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safeMs % 1000) / 10);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const xx = String(hundredths).padStart(2, '0');

  return `[${mm}:${ss}.${xx}]`;
}

/**
 * Format milliseconds into SRT timestamp 00:01:23,456
 */
export function formatMsToSrt(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = safeMs % 1000;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const xxx = String(milliseconds).padStart(3, '0');

  return `${hh}:${mm}:${ss},${xxx}`;
}

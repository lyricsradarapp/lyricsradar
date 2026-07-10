# 📡 LyricsRadar

Node.js library for lyrics search and parsing. Supports Apple TTML (with word-by-word sync), LRC, QRC, SRT, and the Genius API. Implements `@braccato/parsers` for standardized lyric models.

## Installation

```bash
npm install git+https://github.com/lyricsradarapp/lyricsradar.git
```

## 📂 Architecture & File Structure

```text
lyricsradar/
├── dist/                      # Compiled JS/TS definitions
├── prebuilds/                 # HMAC request signers
├── src/                       # TypeScript source code
│   ├── core/                  # Main library facade
│   ├── genius/                # Genius API client & HTML parser
│   ├── parsers/               # @braccato/parsers integration
│   ├── ttml/                  # TTML XML parsing logic
└── package.json
```

## Usage

### 1. Synchronized Lyrics

Retrieves synchronized lyrics from the `luminy-lyrics` provider.

```typescript
import { getSyncedLyrics } from 'lyricsradar';

const result = await getSyncedLyrics({
  song: 'Shape of You',
  artist: 'Ed Sheeran',
  album: '÷ (Divide)', // Optional
  duration: 233,       // Duration in seconds
});

console.log('Word-level Sync:', result.hasWordSync);
console.log('LRC format:', result.lrc);

// Structured Lyric[] array
console.log(result.lyrics);

// Lookup active line at specific playback time (ms)
const active = result.parsed?.getLineAt(10500);
console.log('Current line:', active?.text);
```

### 2. Format Parser

Parses raw text strings (TTML, RichSync, LRC, QRC, SRT, Plain) into unified JSON structures.

```typescript
import { parseLyrics } from 'lyricsradar';

const parsed = parseLyrics('[00:05.10] Hello world\n[00:08.50] Next line');
console.log('Format:', parsed.format);
console.log('Structured Lines:', parsed.lyrics);
```

### 3. Genius Lyrics

Searches and retrieves plain-text lyrics from Genius.

```typescript
import { getGeniusLyrics } from 'lyricsradar';

const song = await getGeniusLyrics('Shape of You', 'Ed Sheeran');
if (song) {
  console.log('Title:', song.title);
  console.log('Sections:', song.sections.map(s => s.name));
  console.log('Lyrics:\n', song.lyrics);
}
```

### 4. Unified Search

Executes parallel searches across both the synced provider and Genius.

```typescript
import { searchLyrics } from 'lyricsradar';

const data = await searchLyrics({
  title: 'Shape of You',
  artist: 'Ed Sheeran',
  album: '÷ (Divide)',
  duration: 233
});

console.log('Synced Available:', !!data.synced);
console.log('Genius Available:', !!data.genius);
```

### 📦 Native Signer Module
The package includes a precompiled native binary (`lyricsradar_signer.node`). The `luminy-lyrics` API will not return lyrics without requests being signed by this specific module. It was reverse-engineered directly from the LuminyLyrics Desktop App. I couldn't fully crack it, so i just pasted it here and call it same way that official app does. I figured out that it basicly does some proof-of-work captcha before signing the first request, so luminy-lyrics api probably requires it before giving out lyrics.

## License
MIT

<br>
<p style="color: #666; font-size: 0.85em; opacity: 0.7;">
  Note: This module is not affiliated with Genius or Luminy-Lyrics. We use their data in an unofficial way.
</p>

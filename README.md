# LyricsRadar

Node.js library for lyrics search and parsing. Supports Apple TTML with word-by-word sync and the Genius API.

## Installation

```bash
npm install git+https://github.com/lyricsradarapp/lyricsradar.git
```

## Usage

```typescript
import { getSyncedLyrics } from 'lyricsradar';

const result = await getSyncedLyrics({
  song: 'Shape of You',
  artist: 'Ed Sheeran',
});
```

## License

MIT

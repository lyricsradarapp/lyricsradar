import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseGeniusLyricsHtml } from '../dist/genius/index.mjs';

const sampleGeniusHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Ed Sheeran – Shape of You Lyrics | Genius Lyrics</title>
  <meta property="og:title" content="Shape of You – Lyrics" />
  <meta name="twitter:creator" content="Ed Sheeran" />
  <meta property="og:image" content="https://images.genius.com/sample.png" />
</head>
<body>
  <div data-lyrics-container="true">
    [Verse 1: Ed Sheeran]<br>
    The club isn't the best place to find a lover<br>
    So the bar is where I go<br>
    Me and my friends at the table doing shots<br>
    Drinking fast and then we talk slow
  </div>
  <div data-lyrics-container="true">
    [Chorus]<br>
    I'm in love with the shape of you<br>
    We push and pull like a magnet do<br>
    Although my heart is falling too<br>
    I'm in love with your body
    74Embed
  </div>
</body>
</html>
`;

describe('Genius Parser', () => {
  test('parses HTML into clean lyrics and structured sections', () => {
    const result = parseGeniusLyricsHtml(sampleGeniusHtml);

    assert.strictEqual(result.title, 'Shape of You');
    assert.strictEqual(result.artist, 'Ed Sheeran');
    assert.ok(result.lyrics.includes("The club isn't the best place to find a lover"));
    assert.ok(result.lyrics.includes("I'm in love with the shape of you"));
    // Ensure "74Embed" was cleaned
    assert.strictEqual(result.lyrics.includes('74Embed'), false);

    assert.strictEqual(result.sections.length, 2);

    const verse = result.sections[0];
    assert.strictEqual(verse.name, 'Verse 1');
    assert.strictEqual(verse.type, 'verse');
    assert.strictEqual(verse.performer, 'Ed Sheeran');
    assert.strictEqual(verse.lines.length, 4);

    const chorus = result.sections[1];
    assert.strictEqual(chorus.name, 'Chorus');
    assert.strictEqual(chorus.type, 'chorus');
    assert.strictEqual(chorus.performer, undefined);
    assert.strictEqual(chorus.lines.length, 4);
  });
});

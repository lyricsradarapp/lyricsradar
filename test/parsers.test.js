import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseLyrics, parseRichSync, TTMLParser, LRCParser } from '../dist/index.mjs';

describe('Client-Side Universal Parsers & Braccato Integration', () => {
  test('parses LRC format with Braccato into Lyric[] models', () => {
    const lrc = '[00:09.73] The club isn\'t the best place to find a lover\n[00:12.10] So the bar is where I go';
    const res = parseLyrics(lrc, 'lrc');

    assert.strictEqual(res.format, 'lrc');
    assert.strictEqual(res.lyrics.length, 2);
    assert.strictEqual(res.lyrics[0].startTimeMs, 9730);
    assert.strictEqual(res.lyrics[0].words, "The club isn't the best place to find a lover");
    assert.strictEqual(res.lyrics[1].startTimeMs, 12100);
    assert.strictEqual(res.lyrics[1].words, 'So the bar is where I go');
  });

  test('parses RichSync JSON format directly on client with words and syllables', () => {
    const richSyncJson = JSON.stringify([
      {
        ts: 9.731,
        te: 12.105,
        l: [
          { c: 'The', o: 9.731 },
          { c: 'club', o: 9.927 },
          { c: "isn't", o: 10.284 },
          { c: 'the', o: 10.57 },
          { c: 'best', o: 10.721 },
          { c: 'place', o: 10.996 },
        ],
      },
    ]);

    const res = parseLyrics(richSyncJson, 'richsync');

    assert.strictEqual(res.format, 'richsync');
    assert.strictEqual(res.isWordSynced, true);
    assert.strictEqual(res.lyrics.length, 1);

    const first = res.lyrics[0];
    assert.strictEqual(first.startTimeMs, 9731);
    assert.strictEqual(first.durationMs, 2374);
    assert.strictEqual(first.words, "The club isn't the best place");
    assert.strictEqual(first.parts?.length, 6);
    assert.strictEqual(first.parts?.[0].words, 'The');
    assert.strictEqual(first.parts?.[1].words, 'club');

    const lrc = res.toLrc();
    assert.ok(lrc.includes("[00:09.73] The club isn't the best place"));
  });

  test('parses TTML into Lyric[] models and ParsedTTML', () => {
    const ttml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" itunes:timing="Word">
  <body>
    <div>
      <p begin="00:01.000" end="00:03.000">
        <span begin="00:01.000" end="00:01.500">Hello </span>
        <span begin="00:01.500" end="00:02.000">world </span>
      </p>
    </div>
  </body>
</tt>`;

    const res = parseLyrics(ttml, 'ttml');
    assert.strictEqual(res.format, 'ttml');
    assert.strictEqual(res.isWordSynced, true);
    assert.ok(res.lyrics.length > 0);
  });
});

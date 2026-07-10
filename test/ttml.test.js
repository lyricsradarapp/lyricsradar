import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseTTML, parseTimestampMs, formatMsToLrc, formatMsToSrt, formatMsToTtml } from '../dist/ttml/index.mjs';

const sampleTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" itunes:timing="Word" xml:lang="en">
  <head>
    <metadata>
      <ttm:agent type="person" xml:id="v1"/>
      <ttm:agent type="person" xml:id="v2"/>
      <iTunesMetadata xmlns="http://music.apple.com/lyric-ttml-internal">
        <songwriters>
          <songwriter>Edward Christopher Sheeran</songwriter>
          <songwriter>Steve Mac</songwriter>
        </songwriters>
      </iTunesMetadata>
    </metadata>
  </head>
  <body>
    <div>
      <p begin="00:08.200" end="00:11.450" ttm:agent="v1">
        <span begin="00:08.200" end="00:08.650">The </span>
        <span begin="00:08.650" end="00:09.100">club </span>
        <span begin="00:09.100" end="00:09.300">isn't </span>
        <span begin="00:09.300" end="00:09.600">the </span>
        <span begin="00:09.600" end="00:10.000">best </span>
        <span begin="00:10.000" end="00:10.400">place </span>
        <span begin="00:10.400" end="00:10.600">to </span>
        <span begin="00:10.600" end="00:10.900">find </span>
        <span begin="00:10.900" end="00:11.100">a </span>
        <span begin="00:11.100" end="00:11.450">lover</span>
      </p>
      <p begin="00:11.700" end="00:15.200" ttm:agent="v1">
        <span begin="00:11.700" end="00:12.000">So </span>
        <span begin="00:12.000" end="00:12.300">the </span>
        <span begin="00:12.300" end="00:12.800">bar </span>
        <span begin="00:12.800" end="00:13.100">is </span>
        <span begin="00:13.100" end="00:13.400">where </span>
        <span begin="00:13.400" end="00:13.700">I </span>
        <span begin="00:13.700" end="00:14.200">go</span>
      </p>
      <p begin="00:15.500" end="00:18.000" ttm:agent="v2">
        <span begin="00:15.500" end="00:18.000">(Background harmony)</span>
      </p>
    </div>
  </body>
</tt>`;

describe('TTML Parser', () => {
  test('parses metadata and songwriters', () => {
    const parsed = parseTTML(sampleTtml);
    assert.strictEqual(parsed.timing, 'Word');
    assert.strictEqual(parsed.hasWordSync, true);
    assert.strictEqual(parsed.metadata.lang, 'en');
    assert.deepStrictEqual(parsed.metadata.songwriters, [
      'Edward Christopher Sheeran',
      'Steve Mac',
    ]);
  });

  test('parses lines and timestamps accurately', () => {
    const parsed = parseTTML(sampleTtml);
    assert.strictEqual(parsed.lines.length, 3);

    const line0 = parsed.lines[0];
    assert.strictEqual(line0.beginMs, 8200);
    assert.strictEqual(line0.endMs, 11450);
    assert.strictEqual(line0.durationMs, 3250);
    assert.strictEqual(line0.text, "The club isn't the best place to find a lover");
    assert.strictEqual(line0.words?.length, 10);
    assert.strictEqual(line0.isBackground, false);

    const line2 = parsed.lines[2];
    assert.strictEqual(line2.isBackground, true);
  });

  test('getLineAt and getWordAt helper methods', () => {
    const parsed = parseTTML(sampleTtml);

    const line = parsed.getLineAt(9000);
    assert.ok(line);
    assert.strictEqual(line?.text, "The club isn't the best place to find a lover");

    const word = parsed.getWordAt(8800);
    assert.ok(word);
    assert.strictEqual(word?.text, 'club ');
  });

  test('converts to LRC and plain text', () => {
    const parsed = parseTTML(sampleTtml);
    const lrc = parsed.toLrc();
    assert.ok(lrc.includes('[00:08.20] The club isn\'t the best place to find a lover'));

    const plain = parsed.toPlainText();
    assert.ok(plain.includes("The club isn't the best place to find a lover"));
    assert.ok(plain.includes("So the bar is where I go"));

    const srt = parsed.toSrt();
    assert.ok(srt.includes('00:00:08,200 --> 00:00:11,450'));
  });

  test('time parsing utility helpers', () => {
    assert.strictEqual(parseTimestampMs('01:23.456'), 83456);
    assert.strictEqual(parseTimestampMs('01:02:03.400'), 3723400);
    assert.strictEqual(parseTimestampMs('15.5s'), 15500);
    assert.strictEqual(formatMsToTtml(83456), '01:23.456');
    assert.strictEqual(formatMsToLrc(83456), '[01:23.45]');
    assert.strictEqual(formatMsToSrt(83456), '00:01:23,456');
  });
});

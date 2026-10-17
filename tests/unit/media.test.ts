import { describe, expect, it } from 'vitest';
import {
  mediaDefaults,
  mediaOptions,
  mediaPresets,
  guardMediaMemory,
  estimateMediaMemory,
  MEDIA_MEMORY_LIMIT,
} from '../../src/modules/media/options';
import { mediaHeader, parseMediaProbe } from '../../src/modules/media/inspect';
import { mediaArguments } from '../../src/modules/media/arguments';
import { readFile } from 'node:fs/promises';
describe('media safeguards and parameters', () => {
  it('maps presets and rejects invalid parameters', () => {
    expect(mediaPresets.high).toMatchObject({
      crf: 34,
      height: 480,
      audioKbps: 64,
    });
    expect(mediaOptions(mediaDefaults)).toEqual(mediaDefaults);
    for (const patch of [
      { crf: NaN },
      { height: 99999 },
      { videoKbps: -1 },
      { audioKbps: 3 },
      { format: 'http://external' },
    ])
      expect(() => mediaOptions({ ...mediaDefaults, ...patch })).toThrow(
        'options',
      );
  });
  it('rejects memory over 1.5 GiB, malformed dimensions and excessive inputs', () => {
    expect(estimateMediaMemory(1024, 1920, 1080)).toBeLessThan(
      MEDIA_MEMORY_LIMIT,
    );
    expect(() => guardMediaMemory(1024, 1920, 1080)).not.toThrow();
    for (const args of [
      [1.5 * 1024 ** 3, 0, 0],
      [32 * 1024 ** 2, 3840, 2160],
      [1024, 9000, 1],
      [0, 0, 0],
      [1024, NaN, 0],
    ])
      expect(() =>
        guardMediaMemory(...(args as [number, number, number])),
      ).toThrow('memory');
  });
  it('validates actual MP4 / M4A / MP3 headers and rejects playlists', async () => {
    for (const [name, type] of [
      ['sample.mp4', 'mp4'],
      ['tone.m4a', 'mp4'],
      ['tone.mp3', 'mp3'],
    ])
      expect(
        await mediaHeader(
          new File([await readFile(`tests/fixtures/${name}`)], name),
        ),
      ).toBe(type);
    await expect(
      mediaHeader(new File(['#EXTM3U\nhttps://example.com/a'], 'fake.mp3')),
    ).rejects.toThrow('unsupported');
  });
  it('parses real stream metadata and ignores album art', () => {
    const text = JSON.stringify({
      format: { duration: '3.2' },
      streams: [
        { codec_type: 'audio', channels: 2 },
        {
          codec_type: 'video',
          width: 300,
          height: 300,
          disposition: { attached_pic: 1 },
        },
      ],
    });
    expect(parseMediaProbe(text)).toEqual({
      duration: 3.2,
      audio: true,
      video: false,
      width: 0,
      height: 0,
    });
    for (const text of [
      'bad',
      '{}',
      '{"streams":[],"format":{"duration":"NaN"}}',
    ])
      expect(() => parseMediaProbe(text)).toThrow();
  });
  it('uses safe local inputs, strips metadata, maps streams and handles no-audio input', () => {
    const info = {
      duration: 3,
      video: true,
      audio: true,
      width: 640,
      height: 360,
    };
    const args = mediaArguments('mp4', info, mediaDefaults);
    expect(args).toContain('file');
    expect(args).toContain('-map_metadata');
    expect(args).toContain('-crf');
    const bitrate = mediaArguments('mp4', info, {
      ...mediaDefaults,
      videoKbps: 1000,
    });
    expect(bitrate).toContain('1000k');
    expect(bitrate).not.toContain('-crf');
    expect(
      mediaArguments('mp3', { ...info, video: false }, mediaDefaults),
    ).toContain('color=c=black:s=640x360:r=25');
    expect(() =>
      mediaArguments(
        'mp4',
        { ...info, audio: false },
        { ...mediaDefaults, format: 'mp3' },
      ),
    ).toThrow('noAudio');
  });
});

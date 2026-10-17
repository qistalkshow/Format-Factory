import { chromium } from '@playwright/test';
/* global location, btoa */
import { writeFile } from 'node:fs/promises';
import { startStaticServer } from '../tests/e2e/static-server.ts';
// 完全以 FFmpeg 測試色塊與正弦波產生，不使用外部或使用者素材。
const server = await startStaticServer('/');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(server.url);
  const generated = await page.evaluate(async () => {
    const root = new URL('media-engine/', location.href);
    const { FFmpeg } = await import(new URL('wrapper/index.js', root).href);
    const engine = new FFmpeg();
    await engine.load({
      coreURL: new URL('ffmpeg-core.js', root).href,
      wasmURL: new URL('ffmpeg-core.wasm', root).href,
      classWorkerURL: new URL('wrapper/worker.js', root).href,
    });
    const recipes = {
      'sample.mp4': [
        '-f',
        'lavfi',
        '-i',
        'testsrc2=size=640x360:rate=25',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=44100',
        '-t',
        '3',
        '-c:v',
        'libx264',
        '-crf',
        '0',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '320k',
      ],
      'tone.m4a': [
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=44100',
        '-t',
        '3',
        '-c:a',
        'aac',
        '-b:a',
        '320k',
      ],
      'tone.mp3': [
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=44100',
        '-t',
        '3',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '320k',
      ],
      'silent.mp4': [
        '-f',
        'lavfi',
        '-i',
        'color=c=blue:s=320x240:r=25',
        '-t',
        '1',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
      ],
    };
    const results = {};
    for (const [name, args] of Object.entries(recipes)) {
      if (
        await engine.exec([
          ...args,
          '-metadata',
          'title=SELF_CREATED_TEST',
          name,
        ])
      )
        throw new Error('Fixture encoding failed');
      const bytes = await engine.readFile(name);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 32768)
        binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      results[name] = btoa(binary);
    }
    engine.terminate();
    return results;
  });
  for (const [name, content] of Object.entries(generated)) {
    const bytes = Buffer.from(content, 'base64');
    await writeFile(`tests/fixtures/${name}`, bytes);
    console.log(name, bytes.length);
  }
} finally {
  await browser.close();
  await server.close();
}

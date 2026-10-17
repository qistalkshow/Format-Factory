import type { FFmpeg } from '@ffmpeg/ffmpeg';
import type { Converter } from '@/core/converter';
import {
  guardMediaMemory,
  mediaOptions,
  mediaMimes,
  MAX_MEDIA_OUTPUT,
  MEDIA_TIMEOUT,
} from './options';
import { mediaHeader, parseMediaProbe } from './inspect';
import { mediaArguments } from './arguments';

async function probe(engine: FFmpeg, path: string, format?: string) {
  const code = await engine.ffprobe(
    [
      '-v',
      'error',
      '-protocol_whitelist',
      'file',
      ...(format ? ['-f', format] : []),
      '-i',
      path,
      '-show_entries',
      'format=duration:stream=codec_type,width,height,channels:stream_disposition=attached_pic',
      '-show_error',
      '-of',
      'json',
      '-o',
      'probe.json',
    ],
    30000,
  );
  // core 0.12.10 的 ffprobe 成功時可能保留 ret=-1；必須另驗證完整 JSON。
  if (code !== 0 && code !== -1) throw new Error('corrupt');
  const text = await engine.readFile('probe.json', 'utf8');
  if (typeof text !== 'string' || text.length > 65536)
    throw new Error('corrupt');
  return parseMediaProbe(text);
}
export const runMedia: Converter['run'] = async (files, options, ctx) => {
  if (files.length !== 1) throw new Error('unsupported');
  const file = files[0],
    o = mediaOptions(options);
  ctx.signal.throwIfAborted();
  guardMediaMemory(file.size);
  const format = await mediaHeader(file);
  ctx.signal.throwIfAborted();
  const root = new URL(
    `${import.meta.env.BASE_URL}media-engine/`,
    location.href,
  );
  let engine: FFmpeg | undefined;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stop = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    stop = () => {
      engine?.terminate();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    ctx.signal.addEventListener('abort', stop, { once: true });
    timer = setTimeout(() => {
      timedOut = true;
      engine?.terminate();
      reject(new Error('timeout'));
    }, MEDIA_TIMEOUT);
  });
  const execute = async () => {
    const url = new URL('wrapper/index.js', root).href;
    const module: typeof import('@ffmpeg/ffmpeg') = await import(
      /* @vite-ignore */ url
    ).catch(() => {
      throw new Error('engine');
    });
    ctx.signal.throwIfAborted();
    if (timedOut) throw new Error('timeout');
    engine = new module.FFmpeg();
    try {
      await engine.load({
        classWorkerURL: new URL('wrapper/worker.js', root).href,
        coreURL: new URL('ffmpeg-core.js', root).href,
        wasmURL: new URL('ffmpeg-core.wasm', root).href,
      });
    } catch {
      ctx.signal.throwIfAborted();
      throw new Error('engine');
    }
    ctx.onProgress(0.08);
    ctx.signal.throwIfAborted();
    // 官方 writeFile 將 ArrayBuffer 以 Transferable 交給工作 Worker。
    const bytes = new Uint8Array(await file.arrayBuffer());
    ctx.signal.throwIfAborted();
    if (timedOut) throw new Error('timeout');
    await engine.writeFile('input', bytes);
    const info = await probe(engine, 'input', format === 'mp4' ? 'mov' : 'mp3');
    guardMediaMemory(file.size, info.width, info.height);
    ctx.onProgress(0.15);
    let last = 0.15;
    engine.on('progress', ({ time }) => {
      const next = Math.max(
        last,
        Math.min(0.94, 0.15 + (time / 1000000 / info.duration) * 0.79),
      );
      if (Number.isFinite(next)) {
        last = next;
        ctx.onProgress(next);
      }
    });
    // 不訂閱／輸出 FFmpeg log，避免持久紀錄檔案內容或中繼資料。
    const code = await engine.exec(
      mediaArguments(format, info, o),
      MEDIA_TIMEOUT,
    );
    ctx.signal.throwIfAborted();
    if (code !== 0) throw new Error('convert');
    const outputInfo = await probe(engine, `output.${o.format}`);
    if (
      Math.abs(outputInfo.duration - info.duration) >
      Math.max(0.3, info.duration * 0.01)
    )
      throw new Error('output');
    const output = await engine.readFile(`output.${o.format}`);
    if (
      typeof output === 'string' ||
      !output.length ||
      output.length >= MAX_MEDIA_OUTPUT
    )
      throw new Error('output');
    ctx.signal.throwIfAborted();
    ctx.onProgress(1);
    return [
      new Blob([output as Uint8Array<ArrayBuffer>], {
        type: mediaMimes[o.format],
      }),
    ];
  };
  try {
    return await Promise.race([execute(), interrupted]);
  } catch (error) {
    ctx.signal.throwIfAborted();
    const allowed = [
      'options',
      'memory',
      'unsupported',
      'corrupt',
      'duration',
      'noAudio',
      'engine',
      'convert',
      'output',
      'timeout',
    ];
    throw new Error(
      error instanceof Error && allowed.includes(error.message)
        ? error.message
        : 'convert',
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
    ctx.signal.removeEventListener('abort', stop);
    // 終止會一併清除虛擬檔案系統與 WASM 記憶體，不保留輸入或核心實例。
    engine?.terminate();
  }
};

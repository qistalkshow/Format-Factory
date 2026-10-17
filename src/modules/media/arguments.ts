import type { MediaInfo } from './inspect';
import { MAX_MEDIA_OUTPUT, type MediaOptions } from './options';
export function mediaArguments(
  inputFormat: 'mp3' | 'mp4',
  info: MediaInfo,
  o: MediaOptions,
) {
  if (o.format !== 'mp4' && !info.audio) throw new Error('noAudio');
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-protocol_whitelist',
    'file',
    '-f',
    inputFormat === 'mp4' ? 'mov' : 'mp3',
    '-i',
    'input',
  ];
  if (o.format === 'mp4' && !info.video) {
    // 音訊轉影片以固定黑底輸入，不接受使用者提供濾鏡或任意命令。
    args.push(
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=640x360:r=25',
      '-map',
      '1:v:0',
      '-map',
      '0:a:0',
    );
  } else if (o.format === 'mp4') args.push('-map', '0:V:0', '-map', '0:a:0?');
  else args.push('-map', '0:a:0', '-vn');
  args.push('-map_metadata', '-1', '-map_chapters', '-1', '-sn', '-dn');
  if (o.format === 'mp4') {
    const scale = `scale=w=-2:h='min(${o.height},ih)':force_divisible_by=2,pad=ceil(iw/2)*2:ceil(ih/2)*2`;
    args.push(
      '-vf',
      scale,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-threads',
      '1',
    );
    if (o.videoKbps)
      args.push(
        '-b:v',
        `${o.videoKbps}k`,
        '-maxrate',
        `${o.videoKbps}k`,
        '-bufsize',
        `${o.videoKbps * 2}k`,
      );
    else args.push('-crf', String(o.crf));
  }
  args.push(
    '-c:a',
    o.format === 'mp3' ? 'libmp3lame' : 'aac',
    '-b:a',
    `${o.audioKbps}k`,
    '-ac',
    '2',
    '-ar',
    '44100',
  );
  if (o.format !== 'mp3') args.push('-movflags', '+faststart');
  // -fs 為最後一道防線；完成後另檢查大小與時間，拒絕截斷輸出。
  args.push(
    '-t',
    String(info.duration),
    '-fs',
    String(MAX_MEDIA_OUTPUT),
    `output.${o.format}`,
  );
  return args;
}

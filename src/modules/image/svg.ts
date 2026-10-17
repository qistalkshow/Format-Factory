import {
  checkDimensions,
  outputDimensions,
  type ImageOptions,
} from './options';
export function prepareSvg(text: string) {
  if (text.length > 2 * 1024 ** 2) throw new Error('tooLarge');
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))
    throw new Error('unsafeSvg');
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg' || doc.querySelector('parsererror'))
    throw new Error('corrupt');
  const elements = Array.from(doc.getElementsByTagName('*'));
  if (elements.length > 10_000) throw new Error('tooLarge');
  for (const element of elements) {
    let parent = element.parentElement;
    let depth = 0;
    while (parent) {
      if (++depth > 80) throw new Error('tooLarge');
      parent = parent.parentElement;
    }
    if (
      [
        'script',
        'filter',
        'foreignobject',
        'image',
        'use',
        'animate',
        'animatetransform',
        'animatemotion',
        'set',
        'feimage',
      ].includes(element.localName.toLowerCase())
    )
      throw new Error('unsafeSvg');
    for (const attr of Array.from(element.attributes)) {
      if (
        /^on/i.test(attr.name) ||
        attr.localName === 'href' ||
        attr.name === 'xml:base'
      )
        throw new Error('unsafeSvg');
      if (
        /\\|@import|(?:https?:|file:|data:|javascript:|\/\/)/i.test(
          attr.value,
        ) &&
        !attr.name.startsWith('xmlns')
      )
        throw new Error('unsafeSvg');
      if (/url\s*\(/i.test(attr.value.replace(/url\(\s*(['"]?)#[^)]*\)/gi, '')))
        throw new Error('unsafeSvg');
    }
    if (
      element.localName === 'style' &&
      /\\|@import|url\s*\(/i.test(element.textContent ?? '')
    )
      throw new Error('unsafeSvg');
  }
  const box = root
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const length = (value: string | null) => {
    const match = value?.trim().match(/^([\d.]+)(px|in|cm|mm|pt|pc)?$/);
    const units: Record<string, number> = {
      px: 1,
      in: 96,
      cm: 96 / 2.54,
      mm: 96 / 25.4,
      pt: 96 / 72,
      pc: 16,
    };
    return match ? Number(match[1]) * units[match[2] ?? 'px'] : undefined;
  };
  let width = length(root.getAttribute('width')),
    height = length(root.getAttribute('height'));
  if (
    box?.length === 4 &&
    box.every(Number.isFinite) &&
    box[2] > 0 &&
    box[3] > 0
  ) {
    width ??= height ? (height * box[2]) / box[3] : box[2];
    height ??= (width * box[3]) / box[2];
  }
  if (!width || !height) throw new Error('svgDimensions');
  checkDimensions(width, height);
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  return { text: new XMLSerializer().serializeToString(root), width, height };
}
export async function rasterizeSvg(
  file: File,
  type: 'image/png' | 'image/jpeg',
  options: ImageOptions,
  signal: AbortSignal,
  progress: (p: number) => void,
): Promise<Blob> {
  signal.throwIfAborted();
  const svg = prepareSvg(await file.text());
  signal.throwIfAborted();
  progress(0.15);
  const size = outputDimensions(svg.width, svg.height, options);
  // Worker 的 createImageBitmap 對 SVG 支援不一致，故僅 SVG 使用主執行緒 Image + Canvas。
  // SVG 先經保守驗證，永不插入頁面 DOM；Image 圖片模式不執行腳本。
  const url = URL.createObjectURL(
    new Blob([svg.text], { type: 'image/svg+xml' }),
  );
  const image = new Image();
  const canvas = document.createElement('canvas');
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error);
        else resolve();
      };
      const abort = () => {
        image.src = '';
        finish(new DOMException('Cancelled', 'AbortError'));
      };
      const timeout = setTimeout(() => finish(new Error('corrupt')), 15_000);
      image.onload = () => finish();
      image.onerror = () => finish(new Error('corrupt'));
      signal.addEventListener('abort', abort, { once: true });
      image.src = url;
    });
    signal.throwIfAborted();
    progress(0.4);
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('browserUnsupported');
    if (type === 'image/jpeg') {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, size.width, size.height);
    }
    ctx.drawImage(image, 0, 0, size.width, size.height);
    progress(0.7);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('corrupt'))),
        type,
        options.quality / 100,
      ),
    );
    signal.throwIfAborted();
    if (blob.type !== type) throw new Error('browserUnsupported');
    progress(1);
    return blob;
  } finally {
    image.src = '';
    URL.revokeObjectURL(url);
    canvas.width = 0;
    canvas.height = 0;
  }
}

// 只處理 TIFF IFD 的方向與尺寸，保留其他欄位；限制遍歷避免惡意循環。
export function normalizeExif(
  input: Uint8Array,
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(input);
  const view = new DataView(bytes.buffer);
  if (bytes.length < 8) throw new Error('metadataInvalid');
  const little = view.getUint16(0) === 0x4949;
  if (
    (!little && view.getUint16(0) !== 0x4d4d) ||
    view.getUint16(2, little) !== 42
  )
    throw new Error('metadataInvalid');
  const seen = new Set<number>();
  const visit = (offset: number) => {
    if (!offset) return;
    if (seen.has(offset) || seen.size > 16 || offset + 2 > bytes.length)
      throw new Error('metadataInvalid');
    seen.add(offset);
    const count = view.getUint16(offset, little);
    const end = offset + 2 + count * 12;
    if (end + 4 > bytes.length) throw new Error('metadataInvalid');
    for (let p = offset + 2; p < end; p += 12) {
      const tag = view.getUint16(p, little),
        type = view.getUint16(p + 2, little),
        size = view.getUint32(p + 4, little);
      if ((tag === 0x8769 || tag === 0x8825) && type === 4 && size === 1)
        visit(view.getUint32(p + 8, little));
      const value =
        tag === 0x112
          ? 1
          : [0x100, 0xa002].includes(tag)
            ? width
            : [0x101, 0xa003].includes(tag)
              ? height
              : undefined;
      if (value !== undefined && size === 1) {
        if (type === 3) view.setUint16(p + 8, value, little);
        if (type === 4) view.setUint32(p + 8, value, little);
      }
    }
    // 不再引用舊縮圖 IFD；避免檢視器顯示旋轉或尺寸過時的縮圖。
    view.setUint32(end, 0, little);
  };
  visit(view.getUint32(4, little));
  return bytes;
}

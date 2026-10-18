// PDF 常記錄 PostScript 名稱；Word 需要字型家族名稱。
// 下列別名已對照 Windows 字型的 name 表，並非替換成外觀近似的其他字型。
const families = new Map([
  ['dfkaishu-sb-estd-bf', 'DFKai-SB'],
  ['arialmt', 'Arial'],
  ['timesnewromanpsmt', 'Times New Roman'],
  ['timesnewromanps', 'Times New Roman'],
  ['microsoftjhengheiregular', 'Microsoft JhengHei'],
  ['microsoftjhenghei', 'Microsoft JhengHei'],
]);

export function originalFontFamily(name: string): string | undefined {
  const original = name.replace(/^[A-Z]{6}\+/, '').trim();
  if (
    !original ||
    original.length > 255 ||
    [...original].some((c) => c.charCodeAt(0) < 32)
  )
    return undefined;
  const family = original.replace(
    /[-,](?:BoldItalic|BoldOblique|Bold|Italic|Oblique|Regular)(?:MT)?$/i,
    '',
  );
  return (
    families.get(original.toLowerCase()) ??
    families.get(family.toLowerCase()) ??
    family
  );
}

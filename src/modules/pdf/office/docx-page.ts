import { elements, readXml, type Archive } from './archive';
export interface FlowPage {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export function docxPage(archive: Archive): FlowPage | undefined {
  const sections = elements(readXml(archive, 'word/document.xml'), 'sectPr');
  const pages = sections.map((section) => {
    const size = elements(section, 'pgSz')[0],
      margin = elements(section, 'pgMar')[0];
    const number = (element: typeof size, name: string, fallback: number) => {
      const raw = element?.getAttributeNS(
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        name,
      );
      return raw ? Number(raw) / 20 : fallback;
    };
    const page = {
      width: number(size, 'w', 612),
      height: number(size, 'h', 792),
      left: number(margin, 'left', 72),
      right: number(margin, 'right', 72),
      top: number(margin, 'top', 72),
      bottom: number(margin, 'bottom', 72),
    };
    if (
      !Object.values(page).every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 1584,
      ) ||
      page.width - page.left - page.right < 20 ||
      page.height - page.top - page.bottom < 40
    )
      throw new Error('officeUnsupported');
    return page;
  });
  // 不將不同分節紙張及邊界悄悄套成同一頁；目前排版器只支援一致的分節設定。
  if (pages.some((page) => JSON.stringify(page) !== JSON.stringify(pages[0])))
    throw new Error('officeUnsupported');
  return pages[0];
}

import { describe, expect, test } from 'vitest';
import { Document, Packer, Paragraph } from 'docx';
import { unzipSync, strFromU8, strToU8 } from 'fflate';
import {
  docxRuns,
  pageGeometry,
} from '../../src/modules/pdf/office/docx-format';
import { textLines } from '../../src/modules/pdf/office/model';
import { inlineText } from '../../src/modules/pdf/office/inline-text';
import { xml } from '../../src/modules/pdf/office/archive';
import { docxPage } from '../../src/modules/pdf/office/docx-page';
import { parsePdfOptions } from '../../src/modules/pdf/options';

describe('Office formatting regression', () => {
  test('preserves mixed runs and raised/lowered small text without merging columns', async () => {
    const lines = textLines([
      { text: 'x', x: 54, y: 100, width: 8, size: 16, bold: true },
      { text: '2', x: 62, y: 94, width: 5, size: 10, italic: true },
      { text: 'H', x: 100, y: 100, width: 12, size: 16 },
      { text: '2', x: 112, y: 104, width: 6, size: 10 },
      { text: 'O', x: 118, y: 100, width: 12, size: 16 },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].cells).toHaveLength(2);
    const blob = await Packer.toBlob(
      new Document({
        sections: [
          {
            properties: pageGeometry(612, 792, lines).properties,
            children: [
              new Paragraph({ children: docxRuns(lines[0].cells, lines[0].y) }),
            ],
          },
        ],
      }),
    );
    const source = strFromU8(
      unzipSync(new Uint8Array(await blob.arrayBuffer()))['word/document.xml'],
    );
    expect(source).toContain('<w:b/>');
    expect(source).toContain('<w:i/>');
    expect(source).toContain('w:position w:val="6pt"');
    expect(source).toContain('w:position w:val="-4pt"');
    expect(source).toContain('w:w="12240"');
    expect(source).toContain('w:h="15840"');
    expect(source).toContain('w:left="1080"');
  });
  test('retains nested inline styles, line breaks and script semantics', () => {
    const runs = inlineText(
      xml(
        '<p>Plain <strong>Bold <em>Both</em></strong><u>Under</u><sup>2</sup><sub>3</sub><br/>End</p>',
      ).documentElement!,
    );
    expect(runs).toContainEqual({ text: 'Both', bold: true, italic: true });
    expect(runs).toContainEqual({ text: 'Under', underline: true });
    expect(runs).toContainEqual({ text: '2', script: 'sup' });
    expect(runs).toContainEqual({ text: '3', script: 'sub' });
    expect(runs.map((r) => r.text).join('')).toContain('\nEnd');
  });
  test('reads actual DOCX page margins and refuses incompatible sections', () => {
    const section =
      '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:left="1080" w:right="1080" w:top="720" w:bottom="720"/></w:sectPr>';
    const archive = (sections: string) => ({
      'word/document.xml': strToU8(
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${sections}</w:body></w:document>`,
      ),
    });
    expect(docxPage(archive(section))).toEqual({
      width: 612,
      height: 792,
      left: 54,
      right: 54,
      top: 36,
      bottom: 36,
    });
    expect(() =>
      docxPage(archive(section + section.replace('12240', '16000'))),
    ).toThrow('officeUnsupported');
    expect(() => pageGeometry(Infinity, 792, [])).toThrow();
    expect(() => parsePdfOptions({ docxMode: 'unknown' })).toThrow('options');
  });
});

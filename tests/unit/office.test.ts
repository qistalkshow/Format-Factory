import { guardBlocks } from '../../src/modules/pdf/office/model';
import { describe, test, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  textLines,
  tableRows,
  blocksFromLines,
} from '../../src/modules/pdf/office/model';
import {
  openOffice,
  relationshipPath,
  xml,
} from '../../src/modules/pdf/office/archive';
const archive = (extra: Record<string, Uint8Array> = {}) =>
  zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'word/document.xml': strToU8('<document/>'),
    ...extra,
  });
const blob = (data: Uint8Array) => new Blob([new Uint8Array(data)]);
describe('Office structure and resource safety', () => {
  test('groups positioned text into paragraphs and aligned table rows', () => {
    const lines = textLines([
      { text: 'Title', x: 20, y: 10, width: 50, size: 20 },
      { text: 'Item', x: 20, y: 50, width: 25, size: 12 },
      { text: 'Value', x: 180, y: 50, width: 30, size: 12 },
      { text: 'Alpha', x: 20, y: 75, width: 30, size: 12 },
      { text: '12', x: 180, y: 75, width: 12, size: 12 },
    ]);
    expect(tableRows(lines.slice(1))).toEqual([
      ['Item', 'Value'],
      ['Alpha', '12'],
    ]);
    expect(blocksFromLines(lines).map((b) => b.kind)).toEqual([
      'text',
      'table',
    ]);
  });
  test('merges word fragments but keeps separate columns', () => {
    const lines = textLines([
      { text: 'Hello', x: 0, y: 1, width: 25, size: 10 },
      { text: 'world', x: 28, y: 1, width: 25, size: 10 },
      { text: '42', x: 150, y: 1, width: 12, size: 10 },
    ]);
    expect(lines[0].cells.map((c) => c.text)).toEqual(['Hello world', '42']);
    expect(tableRows(lines)).toBeUndefined();
  });
  test('accepts a local package and rejects wrong type or encrypted legacy input', async () => {
    expect(
      (await openOffice(blob(archive()), 'docx'))['word/document.xml'],
    ).toBeDefined();
    await expect(openOffice(blob(archive()), 'xlsx')).rejects.toThrow(
      'corrupt',
    );
    await expect(
      openOffice(blob(Uint8Array.of(0xd0, 0xcf)), 'docx'),
    ).rejects.toThrow('officeEncrypted');
  });
  test('rejects traversal, macros, XML entities and external image relationships', async () => {
    const cases: Record<string, Uint8Array>[] = [
      { '../secret': strToU8('x') },
      { 'word/vbaProject.bin': strToU8('x') },
      {
        'word/settings.xml': strToU8(
          '<!DOCTYPE x [<!ENTITY y SYSTEM "file:///private">]><x/>',
        ),
      },
      {
        'word/_rels/document.xml.rels': strToU8(
          '<Relationships><Relationship Id="r1" Type="image" Target="https://example.invalid/image.png" TargetMode="External"/></Relationships>',
        ),
      },
    ];
    for (const extra of cases)
      await expect(openOffice(blob(archive(extra)), 'docx')).rejects.toThrow();
  });
  test('rejects oversized central-directory entries before decompression', async () => {
    const bytes = archive(),
      view = new DataView(bytes.buffer);
    for (let i = 0; i < bytes.length - 46; i++)
      if (view.getUint32(i, true) === 0x02014b50) {
        view.setUint32(i + 24, 0x7fffffff, true);
        break;
      }
    await expect(openOffice(blob(bytes), 'docx')).rejects.toThrow(
      'officeLimit',
    );
  });
  test('resolves internal slide image paths without allowing URL or root escape', () => {
    expect(
      relationshipPath('ppt/slides/slide1.xml', '../media/image1.png'),
    ).toBe('ppt/media/image1.png');
    expect(() => relationshipPath('ppt/a.xml', '../../secret')).toThrow();
    expect(() => relationshipPath('ppt/a.xml', 'https://bad')).toThrow();
    expect(() => xml('<!DOCTYPE x><x/>')).toThrow();
  });
});

test('Office layout rejects excessive total text and cells before rendering', () => {
  expect(() =>
    guardBlocks([{ kind: 'text', text: 'x'.repeat(1_000_001) }]),
  ).toThrow('officeLimit');
  expect(() =>
    guardBlocks([
      { kind: 'table', rows: [Array.from({ length: 20001 }, () => 'x')] },
    ]),
  ).toThrow('officeLimit');
  expect(() =>
    guardBlocks([
      { kind: 'text', text: '中文 safe' },
      { kind: 'table', rows: [['A', 'B']] },
    ]),
  ).not.toThrow();
});

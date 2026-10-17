import { unzipSync, strFromU8 } from 'fflate';
import { DOMParser, type Document, type Element } from '@xmldom/xmldom';
import { OFFICE_LIMITS, type OfficeKind } from './model';
export type Archive = Record<string, Uint8Array>;
const hasControl = (text: string) =>
  [...text].some((char) => char.charCodeAt(0) < 32);
export function xml(source: string, html = false): Document {
  if (source.length > OFFICE_LIMITS.entry || /<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error('unsafeOffice');
  try {
    return new DOMParser({
      onError: (level) => {
        if (level !== 'warning') throw new Error('corrupt');
      },
    }).parseFromString(source, html ? 'text/html' : 'text/xml');
  } catch {
    throw new Error('corrupt');
  }
}
export const elements = (node: Document | Element, name: string): Element[] =>
  Array.from(node.getElementsByTagNameNS('*', name));
export const childElements = (node: Element): Element[] =>
  Array.from(node.childNodes).filter((n): n is Element => n.nodeType === 1);
export function readXml(archive: Archive, path: string) {
  if (!archive[path]) throw new Error('corrupt');
  return xml(strFromU8(archive[path]));
}
export function relationshipPath(owner: string, target: string): string {
  if (
    !target ||
    /[\\?#:%]/.test(target) ||
    hasControl(target) ||
    target.startsWith('//')
  )
    throw new Error('unsafeOffice');
  const parts = target.startsWith('/') ? [] : owner.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (part === '..') {
      if (!parts.length) throw new Error('unsafeOffice');
      parts.pop();
    } else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}
export function relationships(archive: Archive, owner: string) {
  const split = owner.lastIndexOf('/'),
    path =
      owner.slice(0, split + 1) + '_rels/' + owner.slice(split + 1) + '.rels';
  const map = new Map<string, string>();
  if (archive[path])
    for (const rel of elements(readXml(archive, path), 'Relationship')) {
      if (rel.getAttribute('TargetMode') === 'External') continue;
      const id = rel.getAttribute('Id'),
        target = rel.getAttribute('Target');
      if (id && target) map.set(id, relationshipPath(owner, target));
    }
  return map;
}
export async function openOffice(
  file: Blob,
  kind: OfficeKind,
): Promise<Archive> {
  if (file.size > OFFICE_LIMITS.input) throw new Error('officeLimit');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf)
    throw new Error('officeEncrypted');
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('corrupt');
  let count = 0,
    total = 0;
  let archive: Archive;
  try {
    archive = unzipSync(bytes, {
      filter: (e) => {
        total += e.originalSize;
        count++;
        if (
          count > OFFICE_LIMITS.entries ||
          total > OFFICE_LIMITS.expanded ||
          e.originalSize > OFFICE_LIMITS.entry
        )
          throw new Error('officeLimit');
        if (
          e.name.startsWith('/') ||
          /(^|\/)\.\.($|\/)|\\/.test(e.name) ||
          hasControl(e.name)
        )
          throw new Error('unsafeOffice');
        return true;
      },
    });
  } catch (e) {
    if (
      e instanceof Error &&
      ['officeLimit', 'unsafeOffice'].includes(e.message)
    )
      throw e;
    throw new Error('corrupt', { cause: e });
  }
  const main = {
    docx: 'word/document.xml',
    xlsx: 'xl/workbook.xml',
    pptx: 'ppt/presentation.xml',
  }[kind];
  if (!archive[main] || !archive['[Content_Types].xml'])
    throw new Error('corrupt');
  let actual = 0;
  for (const [name, data] of Object.entries(archive)) {
    actual += data.length;
    if (actual > OFFICE_LIMITS.expanded) throw new Error('officeLimit');
    if (!name.endsWith('/') && /vbaProject|activeX|embeddings\//i.test(name))
      throw new Error('unsafeOffice');
    if (/\.(?:xml|rels)$/.test(name)) {
      const source = strFromU8(data);
      if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('unsafeOffice');
      if (name.endsWith('.rels'))
        for (const rel of elements(xml(source), 'Relationship'))
          if (
            rel.getAttribute('TargetMode') === 'External' &&
            !/\/hyperlink$/.test(rel.getAttribute('Type') ?? '')
          )
            throw new Error('externalOffice');
    }
  }
  return archive;
}

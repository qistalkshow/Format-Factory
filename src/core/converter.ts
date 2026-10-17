export interface Converter {
  id: string;
  from: string[];
  to: string;
  tier: 1 | 2 | 3;
  run(
    input: File[],
    options: unknown,
    ctx: {
      onProgress(p: number): void;
      signal: AbortSignal;
    },
  ): Promise<Blob[]>;
}

export class ConverterRegistry {
  private converters = new Map<string, Converter>();
  register(converter: Converter): void {
    if (this.converters.has(converter.id))
      throw new Error('Duplicate converter');
    this.converters.set(converter.id, converter);
  }
  get(id: string): Converter {
    const converter = this.converters.get(id);
    if (!converter) throw new Error('Unknown converter');
    return converter;
  }
  forType(mime: string): Converter[] {
    return [...this.converters.values()].filter((item) =>
      item.from.includes(mime),
    );
  }
}

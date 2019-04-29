export = cssSize;

declare function cssSize(
  css: string,
  options: cssSize.ProcessOptions,
  processor?: cssSize.Processor
): Promise<cssSize.Result<string>>;

declare namespace cssSize {
  function table(
    css: string,
    options: ProcessOptions,
    processor?: Processor
  ): Promise<string>;

  function numeric(
    css: string,
    options: ProcessOptions,
    processor?: Processor
  ): Promise<Result<number>>;

  interface HasCss {
    css: string;
  }
  interface ProcessOptions {
    [opt: string]: any;
  }
  type Processor = (css: string, options: ProcessOptions) => Promise<HasCss>;

  /**
   * The size before and after, the absolute different and the percent improvement.
   */
  interface SizeInfo<T extends string | number> {
    original: T;
    processed: T;
    difference: T;
    percent: T;
  }

  /**
   *  Size deltas of the css in various formats.
   */
  interface Result<T extends string | number> {
    uncompressed: SizeInfo<T>;
    gzip: SizeInfo<T>;
    brotli: SizeInfo<T>;
  }
}

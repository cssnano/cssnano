import prettyBytes from 'pretty-bytes';
import { sync as gzip } from 'gzip-size';
import { sync as brotli } from 'brotli-size';
import Table from 'cli-table';
import round from 'round-precision';
import nano from 'cssnano';

const getBinarySize = (string) => {
  return Buffer.byteLength(string, 'utf8');
};

const percentDifference = (original, minified) => {
  return round((minified / original) * 100, 2) + '%';
};

const cssSize = (css, opts, processor) => {
  processor = processor || nano.process.bind(nano);
  css = css.toString();
  return processor(css, opts).then((result) => {
    let sizes = computeSizes(css, result.css);
    deltasAsStrings(sizes.uncompressed);
    deltasAsStrings(sizes.gzip);
    deltasAsStrings(sizes.brotli);
    return sizes;
  });
};

const deltasAsStrings = (sizes) => {
  sizes.difference = prettyBytes(sizes.original - sizes.processed);
  sizes.percent = percentDifference(sizes.original, sizes.processed);
  sizes.original = prettyBytes(sizes.original);
  sizes.processed = prettyBytes(sizes.processed);
};

const computeSizes = (original, minified) => {
  return {
    uncompressed: {
      original: getBinarySize(original),
      processed: getBinarySize(minified),
    },
    gzip: {
      original: gzip(original),
      processed: gzip(minified),
    },
    brotli: {
      original: brotli(original),
      processed: brotli(minified),
    },
  };
};

const tableize = (data) => {
  return {
    head: ['', 'Uncompressed', 'Gzip', 'Brotli'],
    rows: [
      {
        Original: [
          data.uncompressed.original,
          data.gzip.original,
          data.brotli.original,
        ],
      },
      {
        Processed: [
          data.uncompressed.processed,
          data.gzip.processed,
          data.brotli.processed,
        ],
      },
      {
        Difference: [
          data.uncompressed.difference,
          data.gzip.difference,
          data.brotli.difference,
        ],
      },
      {
        Percent: [
          data.uncompressed.percent,
          data.gzip.percent,
          data.brotli.percent,
        ],
      },
    ],
  };
};

export function table(css, opts, processor) {
  return cssSize(css, opts, processor).then((data) => {
    let result = tableize(data);
    let output = new Table({ head: result.head });
    output.push.apply(output, result.rows);
    return output.toString();
  });
}

export function numeric(css, opts, processor) {
  processor = processor || nano.process.bind(nano);
  css = css.toString();
  return processor(css, opts).then((result) => {
    let sizes = computeSizes(css, result.css);
    deltasAsNumbers(sizes.uncompressed);
    deltasAsNumbers(sizes.gzip);
    deltasAsNumbers(sizes.brotli);
    return sizes;
  });
}

const deltasAsNumbers = (sizes) => {
  sizes.difference = sizes.original - sizes.processed;
  sizes.percent = round(sizes.processed / sizes.original, 4);
};

export default cssSize;

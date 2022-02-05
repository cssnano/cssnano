'use strict';
const zlib = require('zlib');
const postcss = require('postcss');
const nano = require('cssnano');

/* From https://github.com/sindresorhus/pretty-bytes/ */
function prettyBytes(number) {
  const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  if (number < 1) {
    return number + ' ' + UNITS[0];
  }

  const exponent = Math.min(
    Math.floor(Math.log10(number) / 3),
    UNITS.length - 1
  );
  number /= Math.pow(1000, exponent);
  number = number.toPrecision(3);
  const unit = UNITS[exponent];
  return Number(number) + ' ' + unit;
}

/* Returns the size of the gzipped input */
function gzip(input) {
  return zlib.gzipSync(input, { level: 9 }).byteLength;
}

/* Returns the size of the brotli-compressed input */
function brotli(input) {
  return zlib.brotliCompressSync(input, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: getBinarySize(input),
    },
  }).byteLength;
}

const getBinarySize = (string) => {
  return Buffer.byteLength(string, 'utf8');
};

const percentDifference = (original, minified) => {
  return parseFloat(((minified / original) * 100).toFixed(2)) + '%';
};

const minifyCss = (css, opts, processor) => {
  const cssnano = postcss([nano]);
  processor = processor || cssnano.process.bind(cssnano);
  css = css.toString();
  return processor(css, opts);
};

const cssSize = (css, opts, processor) => {
  return minifyCss(css, opts, processor).then((result) => {
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

function table(css, opts, processor) {
  return cssSize(css, opts, processor).then((data) => {
    let output = '';
    output += '┌────────────┬──────────────┬────────┬────────┐';
    output += '\n';
    output += '│            │ Uncompressed │ Gzip   │ Brotli │';
    output += '\n';
    output += '├────────────┼──────────────┼────────┼────────┤';
    output += '\n';
    output += '│ Original   │ ';
    output +=
      data.uncompressed.original +
      ' '.repeat(13 - data.uncompressed.original.length) +
      '│';
    output +=
      ' ' +
      data.gzip.original +
      ' '.repeat(7 - data.gzip.original.length) +
      '│';
    output +=
      ' ' +
      data.brotli.original +
      ' '.repeat(7 - data.brotli.original.length) +
      '│';
    output += '\n';
    output += '├────────────┼──────────────┼────────┼────────┤';
    output += '\n';
    output += '│ Processed  │ ';
    output +=
      data.uncompressed.processed +
      ' '.repeat(13 - data.uncompressed.processed.length) +
      '│';
    output +=
      ' ' +
      data.gzip.processed +
      ' '.repeat(7 - data.gzip.processed.length) +
      '│';
    output +=
      ' ' +
      data.brotli.processed +
      ' '.repeat(7 - data.brotli.processed.length) +
      '│';
    output += '\n';
    output += '├────────────┼──────────────┼────────┼────────┤';
    output += '\n';
    output += '│ Difference │ ';
    output +=
      data.uncompressed.difference +
      ' '.repeat(13 - data.uncompressed.difference.length) +
      '│';
    output +=
      ' ' +
      data.gzip.difference +
      ' '.repeat(7 - data.gzip.difference.length) +
      '│';
    output +=
      ' ' +
      data.brotli.difference +
      ' '.repeat(7 - data.brotli.difference.length) +
      '│';
    output += '\n';
    output += '├────────────┼──────────────┼────────┼────────┤';
    output += '\n';
    output += '│ Percent    │ ';
    output +=
      data.uncompressed.percent +
      ' '.repeat(13 - data.uncompressed.percent.length) +
      '│';
    output +=
      ' ' + data.gzip.percent + ' '.repeat(7 - data.gzip.percent.length) + '│';
    output +=
      ' ' +
      data.brotli.percent +
      ' '.repeat(7 - data.brotli.percent.length) +
      '│';
    output += '\n';
    output += '└────────────┴──────────────┴────────┴────────┘';
    return output;
  });
}

function numeric(css, opts, processor) {
  return minifyCss(css, opts, processor).then((result) => {
    let sizes = computeSizes(css, result.css);
    deltasAsNumbers(sizes.uncompressed);
    deltasAsNumbers(sizes.gzip);
    deltasAsNumbers(sizes.brotli);
    return sizes;
  });
}

const deltasAsNumbers = (sizes) => {
  sizes.difference = sizes.original - sizes.processed;
  sizes.percent = parseFloat((sizes.processed / sizes.original).toFixed(4));
};

module.exports = cssSize;
module.exports.numeric = numeric;
module.exports.table = table;

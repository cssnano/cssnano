import { random } from '../../../../util/fuzzRng.js';

export const BRANCHES = [
  'relative-path',
  'windows-path',
  'root-relative',
  'absolute-http',
  'data-url',
  'escapes-and-unicode',
  'at-namespace',
  'at-import',
  'passthrough-decl',
];

// oxlint-disable-next-line no-control-regex
const NON_PRINTABLE_REGEX = /[\u0000-\u0008\u000B\u000E-\u001F\u007F]/v;

const QUOTES = ['', '"', "'"];

const RELATIVE_SEGMENTS = [
  '.',
  '..',
  'img',
  'foo',
  'bar',
  'css',
  'font',
  'assets',
  'sub:dir',
  '%7Euser',
];
const FILE_NAMES = [
  'icon.png',
  'cat.jpg',
  'style.css',
  'font.woff2',
  'sprite.svg',
  'icon:1.png',
  'cat%2D2.jpg',
];
const DELIMITERS = [
  '',
  '?v=1',
  '?a=1&b=2',
  '#top',
  '#layer',
  '?redirect=/a/../b#icon',
];
const WINDOWS_DRIVES = ['c:', 'C:', 'd:', 'D:', 'z:'];

const PASSTHROUGH_DECLS = [
  'color:red',
  'margin:10px 20px',
  'font-size:14px',
  'z-index:10',
  'display:flex',
  'opacity:0.85',
  'background:\\75rl(foo.png)',
  'shape-outside:circle()',
  'background:url()',
];

/**
 * @typedef {{
 *   css: string,
 *   branch: string,
 *   isPassthrough?: boolean,
 *   hasDrive?: string,
 *   hasNonPrintable?: boolean
 * }} FuzzCase
 */

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @param {string} quote
 * @return {FuzzCase}
 */
function generateRelativePathCase(rng, quote) {
  const segCount = rng.int(4);
  const segs = [];
  for (let i = 0; i < segCount; i++) segs.push(rng.pick(RELATIVE_SEGMENTS));
  const file = rng.pick(FILE_NAMES);
  const delim = rng.pick(DELIMITERS);
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*?:/v.test(segs[0] ?? file)) {
    segs.unshift(rng.pick(['.', 'a/..']));
  }
  const path = (segs.length > 0 ? segs.join('/') + '/' : '') + file + delim;
  return {
    branch: 'relative-path',
    css: `h1{background:url(${quote}${path}${quote})}`,
  };
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @param {string} quote
 * @return {FuzzCase}
 */
function generateWindowsPathCase(rng, quote) {
  const drive = rng.pick(WINDOWS_DRIVES);
  const isExcess = rng.chance(0.4);
  let path;
  if (isExcess) {
    const excessPatterns = [
      `${drive}/../foo.png`,
      `${drive}/foo/../../bar.png`,
      `${drive}/..`,
      `${drive}/.`,
      `${drive}/`,
    ];
    path = rng.pick(excessPatterns);
  } else {
    const segCount = rng.int(3);
    const segs = [drive];
    for (let i = 0; i < segCount; i++) segs.push(rng.pick(RELATIVE_SEGMENTS));
    segs.push(rng.pick(FILE_NAMES));
    path = segs.join('/');
  }
  return {
    branch: 'windows-path',
    hasDrive: drive.toLowerCase(),
    css: `h1{background:url(${quote}${path}${quote})}`,
  };
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @return {FuzzCase}
 */
function generateNamespaceCase(rng) {
  const prefix = rng.pick(['', 'svg ', 'prefix ', 'islands ']);
  const nsUrl = rng.pick([
    'http://example.com/ns',
    'http://www.w3.org/2000/svg',
    'http://bar.yandex.ru/ui/islands',
  ]);
  const format = rng.pick([
    `url("${nsUrl}")`,
    `url('${nsUrl}')`,
    `url(${nsUrl})`,
    `"${nsUrl}"`,
    `'${nsUrl}'`,
    `url("  ${nsUrl}  ")`,
  ]);
  return {
    branch: 'at-namespace',
    css: `@namespace ${prefix}${format};`,
  };
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @return {FuzzCase}
 */
function generateImportCase(rng) {
  const importUrl = rng.pick([
    'style.css',
    'sub/../main.css',
    './foo:bar.css',
    '%7Euser/theme.css',
    'https://example.com/font.css',
    'https://example.com:443/font.css',
    'data:text/css;base64,abc',
  ]);
  const format = rng.pick([
    `url("${importUrl}")`,
    `url('${importUrl}')`,
    `url(${importUrl})`,
    `"${importUrl}"`,
    `'${importUrl}'`,
    `url("  ${importUrl}  ")`,
  ]);
  const trailing = rng.pick(['', ' layer(base)', ' screen', ' print']);
  return {
    branch: 'at-import',
    css: `@import ${format}${trailing};`,
  };
}

/**
 * Generate reproducible CSS test cases exercising url normalization.
 * @param {number} seed
 * @param {number} count
 * @return {FuzzCase[]}
 */
export function generate(seed, count) {
  const rng = random(seed);
  /** @type {FuzzCase[]} */
  const cases = [];

  for (let index = 0; index < count; index++) {
    const branch = BRANCHES[index % BRANCHES.length];
    const quote = rng.pick(QUOTES);

    switch (branch) {
      case 'relative-path':
        cases.push(generateRelativePathCase(rng, quote));
        break;

      case 'windows-path':
        cases.push(generateWindowsPathCase(rng, quote));
        break;

      case 'root-relative': {
        const segCount = rng.int(4);
        const segs = [''];
        for (let i = 0; i < segCount; i++)
          segs.push(rng.pick(RELATIVE_SEGMENTS));
        if (rng.chance(0.3)) {
          // Parent traversal at root
          segs.push('..');
        }
        segs.push(rng.pick(FILE_NAMES));
        const path = segs.join('/') + rng.pick(DELIMITERS);
        cases.push({
          branch,
          css: `h1{background:url(${quote}${path}${quote})}`,
        });
        break;
      }

      case 'absolute-http': {
        const scheme = rng.pick(['http://', 'https://', '//']);
        const host = rng.pick([
          'example.com',
          'example.com:80',
          'example.com:443',
          'example.com:8080',
          '[::1]',
          '[::1]:80',
          '[::1]:443',
          '[::1]:8080',
          'user:pass@example.com',
        ]);
        const path = rng.pick([
          '',
          '/',
          '/img.png',
          '/a/../b.png',
          '/foo//bar.png',
        ]);
        const delim = rng.pick(DELIMITERS);
        const fullUrl = `${scheme}${host}${path}${delim}`;
        cases.push({
          branch,
          css: `h1{background:url(${quote}${fullUrl}${quote})}`,
        });
        break;
      }

      case 'data-url': {
        const dataPayload = rng.pick([
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"></svg>',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==',
          'data:text/plain;charset=utf-8,Hello%20World',
          'data:,',
        ]);
        cases.push({
          branch,
          css: `h1{background:url(${quote}${dataPayload}${quote})}`,
        });
        break;
      }

      case 'escapes-and-unicode': {
        const specials = [
          'foo\\bar.png',
          'foo\\a bar.png',
          'foo\\"bar.png',
          "foo\\'bar.png",
          'foo\\(bar\\).png',
          'foo bar.png',
          'foo\x01bar.png',
          'foo\x07bar.png',
          'foo\u00E9.png',
          'foo/bär.png',
          'foo\\20bar.png',
        ];
        const chosen = rng.pick(specials);
        const hasNonPrintable = NON_PRINTABLE_REGEX.test(chosen);
        const formatted =
          quote === '' && hasNonPrintable
            ? chosen.replace(
                NON_PRINTABLE_REGEX,
                (match) => `\\${match.charCodeAt(0).toString(16)} `
              )
            : chosen;
        cases.push({
          branch,
          hasNonPrintableQuotes: hasNonPrintable,
          css: `h1{background:url(${quote}${formatted}${quote})}`,
        });
        break;
      }

      case 'at-namespace':
        cases.push(generateNamespaceCase(rng));
        break;

      case 'at-import':
        cases.push(generateImportCase(rng));
        break;

      case 'passthrough-decl': {
        const decl = rng.pick(PASSTHROUGH_DECLS);
        cases.push({
          branch,
          isPassthrough: true,
          css: `h1{${decl}}`,
        });
        break;
      }
    }
  }

  return cases;
}

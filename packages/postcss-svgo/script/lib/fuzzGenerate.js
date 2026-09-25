import { random } from '../../../../util/fuzzRng.js';

export const BRANCHES = [
  'valid-svg-unencoded',
  'valid-svg-encoded',
  'valid-svg-base64',
  'invalid-or-malformed',
  'passthrough',
  'syntax-edge-cases',
];

const QUOTES = ['', '"', "'"];

const SVG_SHAPES = [
  '<circle cx="50" cy="50" r="40" fill="yellow"/>',
  '<circle cx="10" cy="10" r="8" fill="%23ff0000"/>',
  '<rect width="100" height="80" fill="blue" stroke="black"/>',
  '<rect x="10" y="10" width="30" height="30" fill="none"/>',
  '<path d="M10 10 H 90 V 90 H 10 Z" fill="red"/>',
  '<line x1="0" y1="0" x2="100" y2="100" stroke="green" stroke-width="2"/>',
  '<text x="20" y="35" class="small">My SVG</text>',
  '<text font-size="12">hello world</text>',
  '<g id="group1"><circle cx="5" cy="5" r="5" fill="%2300ff00"/></g>',
  '<polygon points="100,10 40,198 190,78 10,78 160,198" fill="lime"/>',
  '<circle data-info="a &gt; b" fill="%23ff0"/>',
  '<circle aria-label="a/&gt;b" fill="%23ff0000"/>',
  '<rect data-x="%23anchor" width="4" height="4"/>',
];

const FRAGMENTS = [
  '',
  '#icon',
  '#layer-1',
  '#view(0,0)',
  '#view(10,20,30,40)',
  '#filter',
];

const PASSTHROUGH_URLS = [
  'url(unicorn.svg)',
  'url("https://example.com/asset.svg")',
  'url("../icon.png")',
  'url()',
  'url("")',
  "url('')",
  'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=)',
  'url(data:image/svg;charset=utf-8,<svg><circle/></svg>)',
  'url(xdata:image/svg+xml,<svg><circle/></svg>)',
  'url("data:image/svg+xml foo bar")',
];

/**
 * @typedef {{
 *   css: string,
 *   branch: string,
 *   isPassthrough?: boolean,
 *   hasFragment?: boolean,
 *   opts?: import('svgo').Config & { encode?: boolean },
 * }} FuzzCase
 */

/**
 * Builds an SVG document string from components.
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @param {string} shape
 * @param {boolean} withXmlDecl
 * @param {boolean} withComment
 * @param {boolean} [selfClosing]
 * @param {boolean} [hostileProlog] prolog comment containing a close tag and a
 *   hash-bearing root attribute, which corrupts naive fragment extraction
 * @return {string}
 */
function buildSvg(
  rng,
  shape,
  withXmlDecl,
  withComment,
  selfClosing = false,
  hostileProlog = false
) {
  const xml = withXmlDecl ? '<?xml version="1.0" encoding="utf-8"?>' : '';
  const comment = withComment ? '<!--fuzz-comment-->' : '';
  const prolog = hostileProlog ? '<!-- </svg> -->' : '';
  const hashAttr = hostileProlog ? ' data-x="%23ff0"' : '';
  if (selfClosing) {
    return `${xml}${prolog}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${hashAttr}/>`;
  }
  return `${xml}${prolog}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${hashAttr}>${comment}${shape}</svg>`;
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @return {FuzzCase}
 */
function generateValidUnencodedCase(rng) {
  const shape = rng.pick(SVG_SHAPES);
  const svg = buildSvg(
    rng,
    shape,
    rng.chance(0.3),
    rng.chance(0.3),
    rng.chance(0.1),
    rng.chance(0.2)
  );
  const charset = rng.pick([
    '',
    ';charset=utf-8',
    ';charset="utf-8"',
    ";charset='utf-8'",
    ';utf-8',
  ]);
  const quote = rng.pick(QUOTES);
  const frag = rng.pick(FRAGMENTS);
  const isPassthrough =
    charset.includes('iso-8859-1') || charset.includes('US-ASCII');

  // Inject characters that exercise quote escaping if inside quotes
  let payload = svg;
  if (rng.chance(0.3)) {
    payload = payload.replace('hello world', 'hello\\a world');
  }

  const urlBody = `data:image/svg+xml${charset},${payload}${frag}`;
  // If unquoted and payload has characters forbidden in unquoted URLs (like space, <, >), wrap in quotes or escape
  const effectiveQuote = quote === '' ? '"' : quote;
  const escaped =
    effectiveQuote === "'"
      ? urlBody.replaceAll("'", "\\'")
      : urlBody.replaceAll('"', '\\"');

  return {
    branch: 'valid-svg-unencoded',
    css: `h1{background:url(${effectiveQuote}${escaped}${effectiveQuote})}`,
    hasFragment: frag.length > 0,
    isPassthrough,
  };
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @return {FuzzCase}
 */
function generateValidEncodedCase(rng) {
  const shape = rng.pick(SVG_SHAPES);
  const svg = buildSvg(
    rng,
    shape,
    rng.chance(0.2),
    rng.chance(0.2),
    rng.chance(0.15),
    rng.chance(0.2)
  );
  const quote = rng.pick(QUOTES);
  const charset = rng.pick(
    quote === ''
      ? ['', ';charset=utf-8', ';charset=utf8', ';utf-8']
      : [
          '',
          ';charset=utf-8',
          ';charset="utf-8"',
          ";charset='utf-8'",
          ';charset=utf8',
          ';utf-8',
        ]
  );
  const frag = rng.pick(FRAGMENTS);

  let encoded = encodeURIComponent(svg);
  // Optionally vary hex case (%3c vs %3C)
  if (rng.chance(0.5)) {
    encoded = encoded.replaceAll('%3C', '%3c').replaceAll('%3E', '%3e');
  }

  const urlContent = `data:image/svg+xml${charset},${encoded}${frag}`;
  let css;
  if (quote === '') {
    // If unquoted and fragment contains forbidden parens, escape them in input
    const unquotedSafe = urlContent
      .replaceAll('(', '\\(')
      .replaceAll(')', '\\)')
      .replaceAll(' ', '%20');
    css = `h1{background:url(${unquotedSafe})}`;
  } else {
    css = `h1{background:url(${quote}${urlContent}${quote})}`;
  }

  return {
    branch: 'valid-svg-encoded',
    css,
    hasFragment: frag.length > 0,
  };
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @return {FuzzCase}
 */
function generateValidBase64Case(rng) {
  const shape = rng.pick(SVG_SHAPES);
  const svg = buildSvg(
    rng,
    shape,
    rng.chance(0.3),
    rng.chance(0.3),
    rng.chance(0.1)
  );
  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  const quote = rng.pick(QUOTES);
  const charset = rng.pick(
    quote === ''
      ? ['', ';charset=utf-8', ';charset=utf8', ';utf-8']
      : [
          '',
          ';charset=utf-8',
          ';charset="utf-8"',
          ";charset='utf-8'",
          ';charset=utf8',
          ';utf-8',
        ]
  );
  const frag = rng.pick(FRAGMENTS);

  const prefix = `data:image/svg+xml${charset};base64,${base64}${frag}`;
  let css;
  if (quote === '') {
    const unquotedSafe = prefix.replaceAll('(', '\\(').replaceAll(')', '\\)');
    css = `h1{background:url(${unquotedSafe})}`;
  } else {
    css = `h1{background:url(${quote}${prefix}${quote})}`;
  }

  return {
    branch: 'valid-svg-base64',
    css,
    hasFragment: frag.length > 0,
  };
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @return {FuzzCase}
 */
function generateInvalidOrMalformedCase(rng) {
  const malformedPayloads = [
    '<svg><unclosed-tag>',
    'not an svg at all',
    '%FF%FE%FD',
    '<svg><circle></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="invalid</svg>',
    '<svg><circle fill="#ff0"/></svg>',
    '<svg fill="#ff0"/>#frag',
  ];
  const payload = rng.pick(malformedPayloads);
  const quote = rng.pick(['"', "'"]);
  const escaped =
    quote === "'"
      ? payload.replaceAll("'", "\\'")
      : payload.replaceAll('"', '\\"');

  return {
    branch: 'invalid-or-malformed',
    css: `h1{background:url(${quote}data:image/svg+xml,${escaped}${quote})}`,
    isPassthrough: true,
  };
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @return {FuzzCase}
 */
function generatePassthroughCase(rng) {
  const target = rng.pick(PASSTHROUGH_URLS);
  return {
    branch: 'passthrough',
    css: `h1{background:${target}}`,
    isPassthrough: true,
  };
}

/**
 * @param {import('../../../../util/fuzzRng.js').Rng} rng
 * @return {FuzzCase}
 */
function generateSyntaxEdgeCases(rng) {
  const baseSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
  const edgeVariants = [
    // Multiple URLs in one decl
    `url("data:image/svg+xml,${baseSvg}") url("data:image/svg+xml,${baseSvg}")`,
    // Trailing comment inside url
    `url("data:image/svg+xml,${baseSvg}" /* trailing comment */)`,
    // Single-quoted charset in base64
    `url("data:image/svg+xml;charset='utf-8';base64,${Buffer.from(baseSvg).toString('base64')}")`,
    // Escaped function name
    `u\\72l("data:image/svg+xml,${baseSvg}")`,
  ];

  return {
    branch: 'syntax-edge-cases',
    css: `h1{background:${rng.pick(edgeVariants)}}`,
  };
}

/**
 * Generates an iterable of fuzz cases.
 * @param {number} seed
 * @param {number} count
 * @return {Iterable<FuzzCase>}
 */
export function* generate(seed, count) {
  const rng = random(seed);

  for (let i = 0; i < count; i++) {
    const branchChoice = rng.int(6);
    switch (branchChoice) {
      case 0:
        yield generateValidUnencodedCase(rng);
        break;
      case 1:
        yield generateValidEncodedCase(rng);
        break;
      case 2:
        yield generateValidBase64Case(rng);
        break;
      case 3:
        yield generateInvalidOrMalformedCase(rng);
        break;
      case 4:
        yield generatePassthroughCase(rng);
        break;
      case 5:
        yield generateSyntaxEdgeCases(rng);
        break;
      default:
        yield generatePassthroughCase(rng);
    }
  }
}

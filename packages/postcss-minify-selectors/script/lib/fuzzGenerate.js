import { random } from '../../../../util/fuzzRng.js';

const tagNames = [
  'div',
  'span',
  'p',
  'a',
  'article',
  'section',
  'nav',
  'ul',
  'li',
  'button',
];
const classNames = [
  'foo',
  'bar',
  'baz',
  'active',
  'selected',
  'hidden',
  'primary',
];
const ids = ['id1', 'id2', 'main', 'sidebar', 'content'];
const attributes = ['href', 'data-test', 'aria-label', 'title', 'type'];
const attributeValues = ['value1', 'value2', 'test', 'button'];
const escapedNames = [
  '.\\61 ',
  '.\\31 23',
  '.private-\\e000',
  '.\\e0000\\e001',
];
const pseudoClasses = [
  ':hover',
  ':focus',
  ':active',
  ':visited',
  ':link',
  ':first-child',
  ':last-child',
  ':nth-child(1)',
  ':nth-child(2n)',
  ':nth-of-type(1)',
  ':nth-child(2n of .foo, #main)',
  ':is(:where(.foo, .bar), :not(.baz))',
  ':has(> .selected)',
  ':has( > .selected)',
  ':has( /* relative whitespace */ + .selected)',
  ':has(\t~\n.selected)',
  ':has(/**/ > /**/ .selected)',
  ':host(.foo)',
  ':host-context(.bar)',
  '::before',
  '::after',
];
const pseudoClassesForIs = [':hover', ':focus', ':link', ':visited'];
// Invalid cases stay outside the DOM differential oracle: two rejected
// querySelectorAll calls prove neither validity nor selector equivalence.
const malformedSelectors = [
  ',.item',
  '.item,',
  '.item,,.other',
  ':nth-child(+ n)',
  ':nth-child(+ 1)',
  ':has(:has(.item))',
  ':not(.item,::before)',
  '*div',
  '.item*#other',
  '::',
];

// These are intentionally authored as selector strings plus expected safety,
// rather than derived from the minifier. They force the fuzzer to exercise the
// fold path, which random selector lists reach only infrequently.
const foldMiddleSets = [
  { middles: ['.a', '.b', '.c'], folds: true },
  { middles: ['a.foo', 'b.bar', 'c.baz'], folds: true },
  { middles: [':hover', ':focus', ':active'], folds: true },
  { middles: ['[data-a]', '[data-b]', '[data-c]'], folds: true },
  { middles: [':hover', 'b.foo'], folds: false },
  { middles: ['.a', 'button'], folds: false },
  { middles: ['#one', '.two'], folds: false },
  { middles: [':not(.a)', ':not(.b)', ':not(.c)'], folds: false },
  { middles: ['svg|a', 'svg|b', 'svg|c'], folds: false },
  { middles: ['[lang=en i]', '[lang=fr i]', '[lang=nl i]'], folds: false },
];

// Prefixes usable in HTML markup via the foreign-content algorithm (`<svg>`,
// `<math>` switch namespace during HTML parsing), so a generated selector's
// namespace prefix can actually be exercised against real namespaced elements.
const namespaceDeclarations = [
  { prefix: 'svg', uri: 'http://www.w3.org/2000/svg' },
  { prefix: 'math', uri: 'http://www.w3.org/1998/Math/MathML' },
];
const namespacePrefixes = namespaceDeclarations.map(({ prefix }) => prefix);

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string} one simple selector or combinator combo
 */
function simpleSelector(rng) {
  const parts = [];

  if (rng.chance(0.2)) {
    const form = rng.pick(['prefix', 'any', 'none']);
    const subject = rng.chance(0.3) ? rng.pick(tagNames) : '*';
    if (form === 'prefix') {
      const prefix = rng.pick(namespacePrefixes);
      parts.push(`${prefix}|${subject}`);
    } else if (form === 'any') {
      parts.push(`*|${subject}`);
    } else {
      parts.push(`|${subject}`);
    }
  } else if (rng.chance(0.3)) {
    parts.push(rng.pick(tagNames));
  }

  if (rng.chance(0.4)) {
    parts.push(`#${rng.pick(ids)}`);
  }

  if (rng.chance(0.5)) {
    for (let i = 0; i < rng.int(3) + 1; i++) {
      parts.push(`.${rng.pick(classNames)}`);
    }
  }

  if (rng.chance(0.15)) parts.push(rng.pick(escapedNames));

  if (rng.chance(0.3)) {
    const attr = rng.pick(attributes);
    const value = rng.pick(attributeValues);
    const modes = ['', '~=', '^=', '$=', '*=', '|='];
    const mode = rng.pick(modes);
    if (mode) {
      const modifier = rng.chance(0.25) ? ` ${rng.pick(['i', 's'])}` : '';
      parts.push(`[${attr}${mode}"${value}"${modifier}]`);
    } else {
      parts.push(`[${attr}]`);
    }
  }

  if (rng.chance(0.3)) {
    parts.push(rng.pick(pseudoClasses));
  }

  if (rng.chance(0.15)) {
    parts.push(rng.pick(pseudoClassesForIs));
  }

  if (parts.length === 0) {
    parts.push(rng.chance(0.5) ? rng.pick(tagNames) : '*');
  }

  return parts.join('');
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string} a compound selector (no combinators, single element level)
 */
function compoundSelector(rng) {
  return simpleSelector(rng);
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string} a selector with combinators
 */
function complexSelector(rng) {
  const compounds = [];
  const combinators = [' ', '>', '+', '~', ' /* c */ > ', ' + /*! c */ '];

  for (let i = 0; i < rng.int(3) + 1; i++) {
    if (i > 0) {
      compounds.push(rng.pick(combinators));
    }
    compounds.push(compoundSelector(rng));
  }

  return compounds.join('');
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string} a selector list (comma-separated), possibly with duplicates
 */
function selectorList(rng) {
  const selectors = [];
  const count = rng.int(3) + 2;

  for (let i = 0; i < count; i++) {
    selectors.push(complexSelector(rng));
  }

  if (rng.chance(0.3) && selectors.length > 1) {
    selectors.push(rng.pick(selectors));
  }

  return selectors.join(',');
}

/**
 * @param {ReturnType<typeof random>} rng
 * @return {string} a complete CSS rule with selectors
 */
function rule(rng) {
  const selector = selectorList(rng);
  return `${selector}{color:red}`;
}

/**
 * Builds HTML markup for a small, nested DOM tree, plus optional namespaced
 * (SVG/MathML) subtrees reached through the HTML foreign-content algorithm.
 * Every element carries a `data-fz` tracking attribute, since ids are drawn
 * from the same pool selectors use and are not unique. Scale is kept minimal
 * to stay within the fuzzing time budget.
 *
 * @param {ReturnType<typeof random>} rng
 * @return {{html: string, css: string}}
 */
function domTree(rng) {
  let uid = 0;
  const nextId = () => uid++;

  function attrsFragment() {
    let attrs = '';

    if (rng.chance(0.3)) {
      attrs += ` id="${rng.pick(ids)}"`;
    }

    if (rng.chance(0.4)) {
      const classes = Array.from({ length: rng.int(2) + 1 }, () =>
        rng.pick(classNames)
      );
      attrs += ` class="${classes.join(' ')}"`;
    }

    if (rng.chance(0.3)) {
      attrs += ` ${rng.pick(attributes)}="${rng.pick(attributeValues)}"`;
    }

    return attrs;
  }

  function buildElement(depth) {
    const tag = rng.pick(tagNames);
    const children =
      depth > 0 && rng.chance(0.5)
        ? buildSiblings(depth - 1, rng.int(2) + 1)
        : '';
    return `<${tag} data-fz="${nextId()}"${attrsFragment()}>${children}</${tag}>`;
  }

  function buildSiblings(depth, count) {
    return Array.from({ length: count }, () => buildElement(depth)).join('');
  }

  function buildNamespacedSubtree(tag, childTag) {
    const children = Array.from(
      { length: rng.int(2) + 1 },
      () =>
        `<${childTag} data-fz="${nextId()}"${attrsFragment()}></${childTag}>`
    ).join('');
    return `<${tag} data-fz="${nextId()}"${attrsFragment()}>${children}</${tag}>`;
  }

  let html = buildSiblings(2, rng.int(3) + 2);

  if (rng.chance(0.4)) {
    html += buildNamespacedSubtree('svg', 'circle');
  }

  if (rng.chance(0.3)) {
    html += buildNamespacedSubtree('math', 'mrow');
  }

  const css = namespaceDeclarations
    .map(({ prefix, uri }) => `@namespace ${prefix} "${uri}";`)
    .join('');

  return { html, css };
}

/**
 * @param {number} seed
 * @param {number} count
 * @return {{rule: string, tree: {html: string, css: string}}[]}
 */
function generate(seed, count) {
  const rng = random(seed);

  return Array.from({ length: count }, () => {
    const tree = domTree(rng);
    return {
      rule: rule(rng),
      tree,
    };
  });
}

/**
 * Generates selector lists with a guaranteed shared prefix and suffix, making
 * :is() folding decisions observable independently of DOM matching.
 *
 * @param {number} seed
 * @param {number} count
 * @return {{selector: string, folds: boolean}[]}
 */
function generateFoldCandidates(seed, count) {
  const rng = random(seed);
  return Array.from({ length: count }, () => {
    const { middles, folds } = rng.pick(foldMiddleSets);
    return {
      selector: middles.map((middle) => `.scope ${middle} .tail`).join(','),
      folds,
    };
  });
}

/**
 * Generates malformed selector corpus entries for recovery testing. They are
 * intentionally not passed through jsdom's matching oracle.
 * @param {number} seed
 * @param {number} count
 * @return {string[]}
 */
function generateMalformed(seed, count) {
  const rng = random(seed);
  return Array.from({ length: count }, () => rng.pick(malformedSelectors));
}

/**
 * Removes selectors one at a time from a selector list, keeping the minimal case.
 *
 * @param {string} css
 * @param {(css: string) => boolean} fails
 * @return {string}
 */
function shrink(css, fails) {
  const match = /^([^{]+)\{/.exec(css);
  if (!match) return css;

  let selectors = match[1].split(',').map((s) => s.trim());
  const body = css.substring(match[0].length - 1);

  for (let i = selectors.length - 1; i >= 0; i--) {
    const candidate = selectors.filter((_, idx) => idx !== i).join(',');

    if (candidate && fails(`${candidate}${body}`)) {
      selectors = candidate.split(',').map((s) => s.trim());
    }
  }

  return `${selectors.join(',')}${body}`;
}

export { generate, generateFoldCandidates, generateMalformed, shrink };

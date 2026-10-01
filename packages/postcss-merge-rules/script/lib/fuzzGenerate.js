const modes = ['IE 6', 'IE 7', 'IE 11', 'Chrome 60', 'Chrome 120', 'defaults'];
// `invalid` marks selectors that Selectors 4 rejects. Browsers drop a whole
// selector list containing one, so merging it would change which rules apply.
const explicit = [
  ['a]', 'malformed-delimiter', true],
  ['a)', 'malformed-delimiter', true],
  ['a::', 'malformed-pseudo', true],
  ['[(])', 'mismatched-nesting', true],
  ['[data-x="a]b)c"]', 'string-delimiters'],
  ['[data-x="a\\]b\\)\\[\\("]', 'escaped-delimiters'],
  ['a/* ] ) [ ( */:not([x="("])', 'comments-and-functions'],
  ['svg|a > :is(.x, [data-y~="z"]):not(:has(+ b))', 'nested-selector-list'],
  ['+n', 'invalid-selector', true],
  ['a>', 'invalid-selector', true],
  ['a>>b', 'invalid-selector', true],
  [':lang(en fr)', 'invalid-selector', true],
  ['a*', 'invalid-selector', true],
  [':nth-child(foo)', 'invalid-selector', true],
  [':not()', 'invalid-selector', true],
  [':dir(x y)', 'invalid-selector', true],
  ['a||b', 'invalid-selector', true],
  ['a /deep/ b', 'invalid-selector', true],
  ['#1a', 'invalid-selector', true],
  ['a::before b', 'invalid-selector', true],
];

function random(seed) {
  let state = Number(seed) % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const pick = (rand, values) => values[Math.floor(rand() * values.length)];

function selectorAtoms(rand, index) {
  return [
    `.${pick(rand, ['a', 'b', 'item', `x${index}`])}`,
    `#x${index}`,
    pick(rand, ['a', 'button', '*', 'svg|a', '|a', 'ns|*']),
    `[data-${index}]`,
    `[href${pick(rand, ['=', '~=', '|=', '^=', '$=', '*='])}"v${index}"]`,
    `[data-x="v${index}" i]`,
    pick(rand, [
      ':hover',
      ':not(.x)',
      ':is(a, b)',
      ':nth-child(2n + 1)',
      ':nonsense',
      '::-webkit-thing',
    ]),
  ];
}

// Each template is invalid whatever valid atoms fill it. They are never
// wrapped in `:is()`, whose forgiving argument list would make them valid.
const invalidTemplates = [
  (a) => `+${a}`,
  (a) => `${a}>`,
  (a, b) => `${a}>>${b}`,
  (a, b) => `${a}||${b}`,
  (a, b) => `${a} /deep/ ${b}`,
  (a, b, index) => `#${index}a ${b}`,
];

function invalidSelector(rand, index) {
  const atoms = selectorAtoms(rand, index);
  return pick(rand, invalidTemplates)(
    pick(rand, atoms),
    pick(rand, atoms),
    index
  );
}

// A pseudo-element ends its complex selector, so `::x > a` is invalid unless
// the forgiving `:is()` argument list wraps it.
function generatedSelector(rand, index) {
  const atoms = selectorAtoms(rand, index);
  let selector = pick(rand, atoms);
  let invalid = false;
  if (rand() < 0.65) {
    invalid = selector.startsWith('::');
    selector +=
      pick(rand, [' > ', ' + ', ' ~ ', ' ', '/*c*/>']) + pick(rand, atoms);
  }
  if (rand() < 0.28) {
    selector = `:is(${selector}, :not(${pick(rand, atoms)}))`;
    invalid = false;
  }
  if (rand() < 0.2) selector = `  ${selector}  `;
  return { selector, invalid };
}

/** Return deterministic inputs and coverage metadata for a seed. */
export function generateCases(seed = 0x5eed, count = 400) {
  const rand = random(seed);
  const cases = explicit.map(([selector, branch, invalid], index) => ({
    selector,
    branch,
    browsers: modes[index % modes.length],
    features: featureMetadata(selector),
    invalid: invalid === true,
  }));
  while (cases.length < count) {
    const { selector, invalid } =
      rand() < 0.12
        ? { selector: invalidSelector(rand, cases.length), invalid: true }
        : generatedSelector(rand, cases.length);
    cases.push({
      selector,
      branch: invalid ? 'invalid-selector' : 'compositional',
      browsers: pick(rand, modes),
      features: featureMetadata(selector),
      invalid,
    });
  }
  return cases.slice(0, count);
}

export function featureMetadata(selector) {
  const features = [];
  if (/[>+~]/v.test(selector)) features.push('combinator');
  if (selector.includes('[')) features.push('attribute');
  if (/\bi\]/iv.test(selector)) features.push('attribute-flag');
  if (selector.includes(':')) features.push('pseudo');
  if (selector.includes('\\')) features.push('escape');
  if (selector.includes('/*')) features.push('comment');
  if (/["']/v.test(selector)) features.push('string');
  return features;
}

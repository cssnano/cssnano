import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import { pseudoElements } from '../src/lib/ensureCompatibility.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

const pseudoKeys = Object.keys(pseudoElements);

const compatibilityCases = [
  ...pseudoKeys.map((pseudo) => ({
    name: `recognized pseudo ${pseudo}`,
    first: pseudo,
    browsers: 'IE 6',
    expected: 'first',
  })),
  {
    name: 'unknown pseudo',
    first: ':nonsense',
    browsers: 'Chrome 120',
    expected: 'first',
  },
  {
    name: 'unknown vendor pseudo',
    first: '::-webkit-nonsense',
    second: '::-webkit-other',
    browsers: 'IE 6',
    expected: 'merged',
  },
  {
    name: 'general sibling combinator',
    first: 'a ~ b',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'child combinator',
    first: 'a > b',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'adjacent sibling combinator',
    first: 'a + b',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'combinators in a functional pseudo',
    first: ':is(a ~ b, c > d, e + f)',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'attribute presence',
    first: '[href]',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'attribute exact operator',
    first: '[href="foo"]',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'attribute word operator',
    first: '[href~="foo"]',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'attribute dash operator',
    first: '[href|="foo"]',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'attribute prefix operator',
    first: '[href^="foo"]',
    browsers: 'IE 7',
    expected: 'first',
  },
  {
    name: 'attribute suffix operator',
    first: '[href$="foo"]',
    browsers: 'IE 7',
    expected: 'first',
  },
  {
    name: 'attribute substring operator',
    first: '[href*="foo"]',
    browsers: 'IE 7',
    expected: 'first',
  },
  {
    name: 'case-insensitive attribute flag',
    first: '[href="foo" i]',
    browsers: 'Edge 15',
    expected: 'first',
  },
  {
    name: 'unquoted attribute value equal to the case-insensitive flag',
    first: '[data-mode=i]',
    browsers: 'IE 7',
    expected: 'merged',
  },
  {
    name: 'unquoted attribute value equal to the case-sensitive flag',
    first: '[data-mode=s]',
    browsers: 'IE 7',
    expected: 'merged',
  },
  {
    name: 'quoted attribute value containing selector delimiters',
    first: '[data-value="a>b+c~d,e"]',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'attribute operator separated by comments',
    first: '[href/* comment */~/* comment */="foo"]',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'comments and whitespace',
    first: 'a/* comment */ >\n b',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'nested functional pseudos',
    first: ':not(:is(a > b))',
    browsers: 'IE 6',
    expected: 'first',
  },
  {
    name: 'raw pseudo case spelling',
    first: ':HOVER',
    browsers: 'Chrome 120',
    expected: 'first',
  },
  {
    name: 'raw pseudo escape spelling',
    first: ':ho\\76 er',
    browsers: 'Chrome 120',
    expected: 'first',
  },
  {
    name: 'mixin selector',
    first: 'paper-card:',
    browsers: 'Chrome 120',
    expected: 'first',
  },
  {
    name: ':host pseudo',
    first: ':host(.thing)',
    browsers: 'Chrome 120',
    expected: 'first',
  },
  {
    name: 'malformed tolerated selector',
    first: 'a::',
    browsers: 'Chrome 120',
    expected: 'first',
  },
  {
    name: 'unmatched closing square bracket',
    first: 'a]',
    browsers: 'Chrome 120',
    expected: 'first',
  },
  {
    name: 'unmatched closing parenthesis',
    first: 'a)',
    browsers: 'Chrome 120',
    expected: 'first',
  },
  {
    name: 'incompatible token before malformed suffix',
    first: `a > b${' '.repeat(1000)}a::`,
    browsers: 'IE 6',
    expected: 'first',
  },
];

for (const {
  name,
  first,
  second = 'h1',
  browsers,
  expected,
} of compatibilityCases) {
  test(`compatibility characterization: ${name}`, () => {
    const input = `${first}{color:blue}${second}{color:blue}`;
    const output =
      expected === 'merged' ? `${first},${second}{color:blue}` : input;
    return processCSS(input, output, { overrideBrowserslist: browsers })();
  });
}

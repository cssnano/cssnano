import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import plugin from '../src/index.js';

const mergingFixtures = [
  '.a{color:red}.b{width:1px}.a{height:1px}',
  '.a{height:1px}.b{width:1px}.a{width:2px}',
  '.a{color:red}.b{width:1px}.a{height:1px}.c{top:0}.a{left:0}',
  '.a{color:red}@media print{.b{width:1px}}.a{height:1px}',
  '.a{color:red}.x{height:1px}.b{color:red}',
  '.a,.b{color:red}.x{height:1px}.c,.d{color:red}',
  '@media print{.a{color:red}.x{height:1px}.b{color:red}}',
  '.a{color:red;top:0}.b{color:red;left:0}.c{color:red;right:0}',
  '.a{color:red}.x{height:1px}.c{top:0;color:red;left:0}',
  '.a{color:red}.x{height:1px}.some-long-selector{color:red}',
  // A partial merge splits `.b` around `a` and leaves two `.b` rules apart.
  '.b{background-color:red;color:blue}a{margin:0;color:blue}.b{color:blue}',
  '.a{margin:0;color:red}.c{color:red}.a{color:blue}',
  '.c{color:red}.a,.b{color:blue}.c{width:1px;color:blue}',
  '.a{margin-top:1px;color:red}.c{width:1px;color:red}.a{color:red}',
  '.a::before{color:blue;left:0;margin-top:1px}.a .b{color:blue;margin-top:1px}.a::before{margin-top:1px}',
  // The scan leaves two `.c` rules apart inside the same @layer.
  '@layer x{.c{}.a::before{background-color:red}}@layer x{.c{}}',
  // The scan joins `.c` rules inside a block that was already merged.
  '@supports (display:grid){.b{color:blue}}@supports (display:grid){.c{color:red}.c{margin:0}.b{width:1px;margin:0}}',
];

for (const fixture of mergingFixtures) {
  test(`should converge in one pass for ${fixture}`, async () => {
    const once = await postcss(plugin()).process(fixture, { from: undefined });
    const twice = await postcss(plugin()).process(once.css, {
      from: undefined,
    });
    assert.equal(twice.css, once.css);
  });
}

// Few selectors and properties make rules collide often, so the scan
// leaves same-selector rules apart for the later joins to find.
function generateStylesheet(seed) {
  const { int, pick, chance } = random(seed);
  const selectors = ['.a', '.b', '.c', '.a,.b'];
  const declarations = [
    'color:red',
    'color:blue',
    'width:1px',
    'height:1px',
    'margin:0',
    'margin-top:1px',
  ];
  const rule = () =>
    `${pick(selectors)}{${Array.from({ length: 1 + int(3) }, () => pick(declarations)).join(';')}}`;
  const group = () =>
    `${pick(['@media print', '@supports (display:grid)'])}{${Array.from({ length: 1 + int(3) }, rule).join('')}}`;
  return Array.from({ length: 2 + int(10) }, () =>
    chance(0.2) ? group() : rule()
  ).join('');
}

// Each join and each scan merge shortens the stylesheet, so repeating the
// joins after the scan must stop; a rewrite that grew it could cycle.
test(
  'should terminate with no longer output, settled after one run, for generated stylesheets',
  { timeout: 60_000 },
  async () => {
    for (let seed = 1; seed <= 1500; seed++) {
      const input = generateStylesheet(seed);
      const once = await postcss(plugin()).process(input, { from: undefined });
      const twice = await postcss(plugin()).process(once.css, {
        from: undefined,
      });
      assert.ok(once.css.length <= input.length, `longer output for ${input}`);
      assert.equal(twice.css, once.css, `not settled for ${input}`);
    }
  }
);

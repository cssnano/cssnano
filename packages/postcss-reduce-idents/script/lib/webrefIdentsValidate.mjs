/**
 * @typedef {import('./webrefIdents.mjs').IdentSlots} IdentSlots
 */

/**
 * Checks that the data contains at least some known keywords.
 *
 * @param {IdentSlots} data
 * @return {void}
 */
export function validate(data) {
  expectAll(
    data.cssWideKeywords,
    ['inherit', 'initial', 'revert', 'unset'],
    'the CSS-wide keywords'
  );
  expectAll(
    data.keyframes.properties,
    ['animation', 'animation-name'],
    'the keyframes name properties'
  );
  expectAll(
    data.counterStyle.properties,
    ['list-style', 'list-style-type'],
    'the counter style properties'
  );
  expectAll(
    data.counterStyle.descriptors,
    ['fallback', 'speak-as', 'system'],
    'the counter style descriptors'
  );
  expectAll(
    data.counterStyle.functionProperties,
    ['content'],
    'the counter style function properties'
  );
  expectAll(
    data.counter.properties,
    ['counter-increment', 'counter-reset', 'counter-set'],
    'the counter properties'
  );
  expectAll(
    data.counter.functionProperties,
    ['content', 'string-set'],
    'the counter function properties'
  );
  expectAll(
    data.grid.templateProperties,
    [
      'grid',
      'grid-template',
      'grid-template-areas',
      'grid-template-columns',
      'grid-template-rows',
    ],
    'the grid template properties'
  );
  expectAll(
    data.grid.referenceProperties,
    [
      'grid-area',
      'grid-column',
      'grid-column-end',
      'grid-column-start',
      'grid-row',
      'grid-row-end',
      'grid-row-start',
    ],
    'the grid line properties'
  );

  // Pin the argument a counter name or style sits at, which decides the
  // renames in `counter(x, y)`.
  for (const [name, expected] of /** @type {[string, number[]][]} */ ([
    ['counter()', [0]],
    ['counters()', [0]],
    ['target-counter()', [1]],
    ['target-counters()', [1]],
  ])) {
    assertArguments(data.counter.functions, name, expected, 'counter name');
  }
  for (const [name, expected] of /** @type {[string, number[]][]} */ ([
    ['counter()', [1]],
    ['counters()', [2]],
    ['target-counter()', [2]],
    ['target-counters()', [3]],
  ])) {
    assertArguments(
      data.counterStyle.functions,
      name,
      expected,
      'counter style'
    );
  }

  // Reject a name listed as both a bare and a function property: renaming it
  // bare would rename the wrong word.
  for (const name of data.counterStyle.functionProperties) {
    if (data.counterStyle.properties.includes(name)) {
      throw new Error(
        `${name} is listed as taking a counter style both bare and in a function`
      );
    }
  }

  // Expect the keywords a name in the same declaration would be ambiguous
  // with; empty lists would make every such name renameable.
  expectAll(
    data.keyframes.reservedKeywords,
    ['ease', 'infinite', 'linear', 'none', 'paused', 'reverse'],
    'the keywords an animation value can hold'
  );
  expectAll(
    data.counterStyle.reservedKeywords,
    ['inside', 'none', 'outside'],
    'the keywords a list style value can hold'
  );
  expectAll(
    data.counterStyle.reservedKeywords,
    ['bullets', 'extends', 'fixed', 'spell-out', 'words'],
    'the keywords a counter style descriptor can hold'
  );
  expectAll(
    data.grid.reservedKeywords,
    ['auto', 'auto-flow', 'dense', 'none', 'span', 'subgrid'],
    'the keywords a grid value can hold'
  );
  // Expect function names to stay unreserved: they are written with an
  // argument list.
  for (const keyword of ['minmax', 'repeat', 'fit-content']) {
    if (data.grid.reservedKeywords.includes(keyword)) {
      throw new Error(`Expected the function ${keyword}() not to be a keyword`);
    }
  }
}

/**
 * @param {string[]} actual
 * @param {string[]} expected
 * @param {string} what
 */
function expectAll(actual, expected, what) {
  for (const name of expected) {
    if (!actual.includes(name)) {
      throw new Error(`Expected ${what} to include ${name}`);
    }
  }
}

/**
 * @param {Map<string, number[]>} functions
 * @param {string} name
 * @param {number[]} expected
 * @param {string} what
 * @return {void}
 */
function assertArguments(functions, name, expected, what) {
  const actual = functions.get(name);
  if (actual?.join() !== expected.join()) {
    throw new Error(
      `Expected ${name} to take a ${what} at argument ${expected.join()}, got ${actual?.join() ?? 'nothing'}`
    );
  }
}

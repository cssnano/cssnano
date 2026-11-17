import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from '#utils';
import {
  addSemanticFact,
  addSpecificity,
  buildSelectorArena,
  createSemanticFacts,
  isFoldEligible,
  semanticFacts,
} from '../../src/plugins/postcss-minify-selectors/lib/arena.js';
import { verifySelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/arenaVerify.js';
import { serializeNormalized } from '../../src/plugins/postcss-minify-selectors/lib/serializeArena.js';
import { buildVerified, parseVerified } from './checkedArena.js';

const { tokens } = cssnanoUtils;

function nestedArena(source) {
  const tokenList = tokens(source);
  let compound = -1;
  let pseudo = -1;
  const arena = buildVerified(source, tokenList, (builder) => {
    const list = builder.open('list', 0, tokenList.length, {
      payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
    });
    const complex = builder.open('complex', 0, tokenList.length);
    compound = builder.open('compound', 0, tokenList.length);
    builder.leaf('class', 0, 2);
    pseudo = builder.open('pseudo', 2, tokenList.length, {
      payload: builder.payload('pseudos', {
        name: 'is',
        nameToken: 3,
        colonCount: 1,
        pseudoKind: 'class',
        specificityPolicy: 'maximum-argument',
        argumentGrammar: 'forgiving-selector-list',
      }),
    });
    const argument = builder.open('list', 4, tokenList.length - 1, {
      payload: builder.payload('lists', { mode: 'forgiving' }),
    });
    builder.leaf('complex', 4, tokenList.length - 1);
    builder.closeSummary(argument);
    builder.closeSummary(pseudo);
    builder.closeSummary(compound);
    builder.closeSummary(complex);
    builder.closeSummary(list);
  });
  return { arena, compound, pseudo, tokenList };
}

test('completed arenas use exclusive spans and immutable preorder nodes', () => {
  const { arena, compound, pseudo, tokenList } =
    nestedArena('.card:is(.active)');
  assert.equal(arena.nodes[0].endToken, tokenList.length);
  assert.equal(arena.nodes[compound].subtreeEnd, 7);
  assert.equal(arena.nodes[pseudo].subtreeEnd, 7);
  assert.equal(arena.payloads.lists[0].mode, 'outer-unforgiving');
  assert.throws(() => {
    arena.nodes[compound].status = 'opaque';
  }, TypeError);
  assert.throws(() => arena.nodes.push(arena.nodes[0]), TypeError);
});

test('an empty list over an empty token stream builds and spans no source text', () => {
  const arena = buildVerified('', [], (builder) => {
    const root = builder.open('list', 0, 0, {
      payload: builder.payload('lists', { mode: 'forgiving' }),
    });
    builder.closeSummary(root);
  });
  assert.equal(serializeNormalized(arena, { kind: 'node', node: 0 }), '');
});

test('arena rejects a token span outside the token stream', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena('.a', tokenList, (builder) => {
          const root = builder.open('list', 0, tokenList.length + 1);
          builder.closeSummary(root);
        })
      ),
    /exclusive token span/v
  );
});

test('arena rejects closing a node out of stack order at build time', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      buildSelectorArena('.a', tokenList, (builder) => {
        const root = builder.open('list', 0, tokenList.length);
        builder.open('complex', 0, tokenList.length);
        builder.closeSummary(root);
      }),
    /stack order/v
  );
});

test('fold eligibility includes function and unsafe-pseudo barriers', () => {
  const safe = createSemanticFacts();
  const eligible = { kind: 'compound', status: 'valid', facts: safe };
  assert.equal(isFoldEligible(eligible), true);
  assert.equal(
    isFoldEligible({
      ...eligible,
      facts: addSemanticFact(safe, semanticFacts.function),
    }),
    false
  );
  assert.equal(
    isFoldEligible({
      ...eligible,
      facts: addSemanticFact(safe, semanticFacts.unsafePseudo),
    }),
    false
  );
});

test('checked specificity addition reports overflow as opaque', () => {
  assert.deepEqual(addSpecificity([0, 256, 0], [1, 0, 0]), {
    status: 'valid',
    specificity: [1, 256, 0],
  });
  assert.deepEqual(
    addSpecificity([Number.MAX_SAFE_INTEGER - 10, 5, 0], [10, 0, 1]),
    {
      status: 'valid',
      specificity: [Number.MAX_SAFE_INTEGER, 5, 1],
    }
  );
  assert.deepEqual(addSpecificity([Number.MAX_SAFE_INTEGER, 0, 0], [1, 0, 0]), {
    status: 'opaque',
  });
});

test('close-time specificity overflow makes the affected construct opaque', () => {
  const tokenList = tokens('.a');
  const arena = buildVerified('.a', tokenList, (builder) => {
    const root = builder.open('list', 0, tokenList.length, {
      payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
    });
    const complex = builder.open('complex', 0, tokenList.length);
    builder.leaf('class', 0, tokenList.length);
    builder.closeSummary(complex, {
      ...addSpecificity([Number.MAX_SAFE_INTEGER, 0, 0], [1, 0, 0]),
      facts: createSemanticFacts(),
    });
    builder.closeSummary(root, {
      status: 'valid',
      specificity: [0, 0, 0],
      facts: createSemanticFacts(),
    });
  });

  assert.equal(arena.nodes[1].status, 'opaque');
  assert.equal(arena.nodes[1].specificity, undefined);
});

test('arena rejects overlapping sibling spans', () => {
  const tokenList = tokens('.a.b');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena('.a.b', tokenList, (builder) => {
          const root = builder.open('compound', 0, tokenList.length);
          builder.leaf('class', 0, 3);
          builder.leaf('class', 2, tokenList.length);
          builder.closeSummary(root, {
            status: 'valid',
            specificity: [0, 2, 0],
            facts: createSemanticFacts(),
          });
        })
      ),
    /ordered and non-overlapping/v
  );
});

test('arena rejects sibling spans given out of order', () => {
  const tokenList = tokens('.a.b');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena('.a.b', tokenList, (builder) => {
          const root = builder.open('compound', 0, tokenList.length);
          builder.leaf('class', 2, tokenList.length);
          builder.leaf('class', 0, 2);
          builder.closeSummary(root, {
            status: 'valid',
            specificity: [0, 2, 0],
            facts: createSemanticFacts(),
          });
        })
      ),
    /ordered and non-overlapping/v
  );
});

test('arena rejects a second preorder root at completion', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena('.a', tokenList, (builder) => {
          builder.leaf('class', 0, tokenList.length);
          builder.leaf('class', 0, tokenList.length);
        })
      ),
    /single preorder root/v
  );
});

test('arena rejects a root that does not span all tokens', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena('.a', tokenList, (builder) => {
          builder.leaf('class', 0, 1);
        })
      ),
    /root token span/v
  );
});

test('arena rejects a root that is not a selector list', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena('.a', tokenList, (builder) => {
          builder.leaf('class', 0, tokenList.length);
        })
      ),
    /arena root must be a selector list/v
  );
});

test('arena rejects a list payload index outside the node table', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena('.a', tokenList, (builder) => {
          const root = builder.open('list', 0, tokenList.length, {
            payload: 4,
          });
          builder.closeSummary(root, {
            status: 'valid',
            specificity: [0, 1, 0],
            facts: createSemanticFacts(),
          });
        })
      ),
    /payload index/v
  );
});

test('arena rejects a payload on a node kind that has none', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena('.a', tokenList, (builder) => {
          builder.leaf('class', 0, tokenList.length, { payload: 0 });
        })
      ),
    /must not have a payload index/v
  );
});

test('completed arenas deeply freeze nested payload records', () => {
  const arena = parseVerified('svg|a');
  const qualifiedName = arena.payloads.qualifiedNames[0];
  assert.throws(() => {
    qualifiedName.namespace.kind = 'empty';
  }, TypeError);
  assert.throws(() => {
    qualifiedName.subject.kind = 'universal';
  }, TypeError);
});

test('arena rejects a pseudo token reference outside the token stream', () => {
  const tokenList = tokens(':is(.a)');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena(':is(.a)', tokenList, (builder) => {
          const root = builder.open('list', 0, tokenList.length, {
            payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
          });
          builder.leaf('pseudo', 0, tokenList.length, {
            payload: builder.payload('pseudos', {
              name: 'is',
              nameToken: tokenList.length,
              colonCount: 1,
              pseudoKind: 'class',
              specificityPolicy: 'argument',
            }),
          });
          builder.closeSummary(root);
        })
      ),
    /invalid pseudo token reference/v
  );
});

test('arena rejects a pseudo argument node that is not a later list', () => {
  const tokenList = tokens(':is(.a)');
  assert.throws(
    () =>
      verifySelectorArena(
        buildSelectorArena(':is(.a)', tokenList, (builder) => {
          const root = builder.open('list', 0, tokenList.length, {
            payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
          });
          builder.leaf('pseudo', 0, tokenList.length, {
            payload: builder.payload('pseudos', {
              name: 'is',
              nameToken: 1,
              colonCount: 1,
              pseudoKind: 'class',
              specificityPolicy: 'argument',
              argumentNode: 0,
            }),
          });
          builder.closeSummary(root);
        })
      ),
    /invalid pseudo argument node reference/v
  );
});

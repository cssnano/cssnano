import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  hasSemanticFact,
  isFoldEligible,
  semanticFacts,
} from '../src/lib/arena.js';
import { parseSelectorArena } from '../src/lib/parseArena.js';
import { serializeArena } from '../src/lib/serializeArena.js';

test('iterative parser records list modes and explicit selector constructs', () => {
  for (const mode of [
    'outer-unforgiving',
    'forgiving',
    'unforgiving',
    'relative',
    'compound-only',
  ]) {
    const arena = parseSelectorArena('svg|a > [x=y i]:future(.x),|*', {
      mode,
    });
    assert.equal(arena.payloads.lists[0].mode, mode);
    assert.equal(serializeArena(arena, new Map()), arena.source);
  }
  const arena = parseSelectorArena('svg|a > [x=y i]:future(.x),|*');
  assert.deepEqual(
    arena.payloads.combinators.map(({ value }) => value),
    ['>']
  );
  assert.deepEqual(
    arena.payloads.qualifiedNames.map(({ namespace }) => namespace.kind),
    ['named', 'empty']
  );
  assert.equal(
    arena.tokens[arena.payloads.attributes[0].modifierToken][1],
    'i'
  );
  const unknownPseudo = arena.nodes.find(
    (node) =>
      node.kind === 'raw' &&
      arena.tokens
        .slice(node.startToken, node.endToken)
        .map((token) => token[1])
        .join('') === ':future(.x)'
  );
  assert.equal(unknownPseudo.status, 'opaque');
});

test('iterative parser preserves malformed balancing as one opaque raw node', () => {
  const arena = parseSelectorArena(':is(.a');
  assert.equal(arena.nodes.length, 1);
  assert.equal(arena.nodes[0].kind, 'raw');
  assert.equal(arena.nodes[0].status, 'opaque');
  assert.equal(serializeArena(arena, new Map()), ':is(.a');
});

test('list modes finalize empty-member recovery at the list boundary', () => {
  for (const source of [',.a', '.a,', '.a,,.b']) {
    assert.equal(parseSelectorArena(source).nodes[0].status, 'invalid', source);
  }
  const forgiving = parseSelectorArena(',.a,,#b,', { mode: 'forgiving' });
  assert.equal(forgiving.nodes[0].status, 'valid');
  assert.deepEqual(
    forgiving.nodes
      .filter(({ kind }) => kind === 'complex')
      .map(({ status }) => status),
    ['invalid', 'valid', 'invalid', 'valid', 'invalid']
  );
  assert.equal(
    parseSelectorArena('> .a', { mode: 'relative' }).nodes[0].status,
    'valid'
  );
  assert.equal(
    parseSelectorArena('> .a', { mode: 'outer-unforgiving' }).nodes[0].status,
    'invalid'
  );
  assert.equal(
    parseSelectorArena('.a > .b', { mode: 'compound-only' }).nodes[0].status,
    'invalid'
  );
});

test('parser applies keyframe and default-namespace context', () => {
  const keyframe = parseSelectorArena('from,50%,to', { keyframe: true });
  assert.equal(keyframe.nodes[0].status, 'valid');
  assert.equal(keyframe.payloads.lists[0].keyframe, true);

  const namespaced = parseSelectorArena('*.item', {
    hasDefaultNamespace: true,
  });
  assert.equal(
    hasSemanticFact(namespaced.nodes[0].facts, semanticFacts.namespace),
    true
  );
  assert.equal(namespaced.payloads.lists[0].hasDefaultNamespace, true);
  const compound = namespaced.nodes.find(({ kind }) => kind === 'compound');
  assert.equal(isFoldEligible(compound), false);
});

test('parser records descendant and explicit combinators with exact spans', () => {
  const arena = parseSelectorArena('a/**/b || c > d');
  const combinators = arena.nodes.filter(({ kind }) => kind === 'combinator');
  assert.deepEqual(
    combinators.map(({ payload }) => arena.payloads.combinators[payload].value),
    [' ', '||', '>']
  );
  assert.deepEqual(
    combinators.map(({ startToken, endToken }) =>
      arena.tokens
        .slice(startToken, endToken)
        .map((token) => token[1])
        .join('')
    ),
    ['/**/', '||', '>']
  );
  assert.equal(
    hasSemanticFact(arena.nodes[0].facts, semanticFacts.commentDescendant),
    true
  );
});

test('parser models every qualified-name namespace form', () => {
  for (const [source, namespaceKind, subjectKind] of [
    ['ns|E', 'named', 'type'],
    ['*|E', 'wildcard', 'type'],
    ['|E', 'empty', 'type'],
    ['ns|*', 'named', 'universal'],
    ['*|*', 'wildcard', 'universal'],
    ['|*', 'empty', 'universal'],
  ]) {
    const arena = parseSelectorArena(source);
    assert.equal(arena.nodes[0].status, 'valid', source);
    assert.equal(
      arena.payloads.qualifiedNames[0].namespace.kind,
      namespaceKind
    );
    assert.equal(arena.payloads.qualifiedNames[0].subject.kind, subjectKind);
  }
});

test('parser records exact attribute grammar and case behavior', () => {
  const arena = parseSelectorArena('[ns|data-name ~= "Value" i]');
  assert.deepEqual(arena.payloads.attributes[0], {
    namespace: { kind: 'named', token: 1 },
    nameToken: 3,
    matcher: '~=',
    valueToken: 8,
    modifierToken: 10,
    caseBehavior: 'ascii-insensitive',
  });
  assert.deepEqual(arena.nodes[0].specificity, [0, 1, 0]);
  assert.equal(
    hasSemanticFact(arena.nodes[0].facts, semanticFacts.attributeModifier),
    true
  );
  assert.equal(parseSelectorArena('[x=]').nodes[0].status, 'invalid');
  const escaped = parseSelectorArena('[x=y \\69]');
  assert.equal(escaped.nodes[0].status, 'valid');
  assert.equal(
    escaped.payloads.attributes[0].caseBehavior,
    'ascii-insensitive'
  );
});

test('literal non-ASCII identifier continuations remain one qualified name', () => {
  const source = 'a\uE0000\uE001';
  const arena = parseSelectorArena(source);
  assert.equal(arena.nodes[0].status, 'valid');
  const qualified = arena.nodes.find(({ kind }) => kind === 'qualified-name');
  assert.equal(
    arena.tokens
      .slice(qualified.startToken, qualified.endToken)
      .map((token) => token[1])
      .join(''),
    source
  );
  assert.deepEqual(arena.nodes[0].specificity, [0, 0, 1]);
});

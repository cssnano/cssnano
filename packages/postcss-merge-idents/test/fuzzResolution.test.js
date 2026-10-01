import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  collectProtectedNameDefinitions,
  resolveReferences,
} from '../script/lib/fuzzResolution.js';

const body = '0%{opacity:0}';

test('should resolve a reference to a keyframes rule whose prelude is exactly one name', () => {
  assert.equal(
    resolveReferences(`@keyframes fade{${body}}div{animation:fade}`)[0].length,
    1
  );
});

test('should not resolve a reference to a keyframes rule with extra tokens in its prelude', () => {
  // Browsers drop `@keyframes fade 123`, so it defines nothing.
  assert.deepEqual(
    resolveReferences(`@keyframes fade 123{${body}}div{animation:fade}`),
    [[]]
  );
});

test('should resolve a reference to a keyframes rule whose prelude has comments around the name', () => {
  assert.equal(
    resolveReferences(
      `@keyframes /* c */ fade /* c */{${body}}div{animation:fade}`
    )[0].length,
    1
  );
});

test('should report a name held by a custom property and defined', () => {
  assert.deepEqual(
    collectProtectedNameDefinitions(
      `@keyframes a{${body}}@keyframes b{${body}}:root{--n:a}`
    ),
    ['keyframes:a']
  );
});

test('should report a name held by a var() fallback and defined', () => {
  assert.deepEqual(
    collectProtectedNameDefinitions(
      `@keyframes a{${body}}div{animation:var(--n,"a")}`
    ),
    ['keyframes:a']
  );
});

test('should not report a name held by a custom property but not defined', () => {
  assert.deepEqual(
    collectProtectedNameDefinitions(`@keyframes b{${body}}:root{--n:a}`),
    []
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cascadeWinners,
  checkCrossBlock,
  generateCrossBlockCases,
  processAllWithLimits,
} from '../script/lib/fuzzCrossBlock.js';

test('cross-block fuzzer generates deterministic cases', () => {
  assert.deepEqual(
    generateCrossBlockCases(7, 40),
    generateCrossBlockCases(7, 40)
  );
});

test('cross-block fuzzer emits equal @media and @supports blocks', () => {
  const css = generateCrossBlockCases(7, 200).join('\n');
  assert.match(css, /@media print\{/v);
  assert.match(css, /@supports \(color:red\)\{/v);
});

test('cross-block fuzzer separates blocks with rule-less at-rules', () => {
  const css = generateCrossBlockCases(7, 200).join('\n');
  for (const separator of ['@layer x;', '@font-face{', '@page{'])
    assert.ok(css.includes(separator), `missing separator ${separator}`);
});

test('cross-block fuzzer emits rules that set the same property to different values', () => {
  const css = generateCrossBlockCases(7, 200).join('\n');
  assert.match(css, /color:blue/v);
});

test('cross-block fuzzer emits nested rules', () => {
  const css = generateCrossBlockCases(7, 200).join('\n');
  assert.match(css, /&\{/v);
});

test('cross-block fuzzer emits a declaration after a nested rule of the same parent', () => {
  const css = generateCrossBlockCases(7, 200).join('\n');
  assert.match(css, /&\{[^\}]*\}[a-z\-]+:[a-z0-9]+;/v);
});

test('cascade winners resolve a nested & to the enclosing selector', () => {
  assert.deepEqual(
    cascadeWinners('.p{&{color:red}color:blue}'),
    new Map([['.p color', 'blue']])
  );
});

test('cascade winners let a nested rule override an earlier declaration of its parent', () => {
  assert.deepEqual(
    cascadeWinners('.p{color:blue;&{color:red}}'),
    new Map([['.p color', 'red']])
  );
});

test('cascade winners resolve a nested & against every selector of a list', () => {
  assert.deepEqual(
    cascadeWinners('.p,.q{&{color:red}}'),
    new Map([
      ['.p color', 'red'],
      ['.q color', 'red'],
    ])
  );
});

test('cross-block fuzzer emits @keyframes rules in lowercase and uppercase', () => {
  const css = generateCrossBlockCases(7, 200).join('\n');
  assert.match(css, /@keyframes /v);
  assert.match(css, /@KEYFRAMES /v);
});

test('cross-block fuzzer emits keyframe rules that share declarations', () => {
  const css = generateCrossBlockCases(7, 200).join('\n');
  assert.match(css, /from\{top:0;color:red\}to\{top:0;color:red\}/v);
});

test('cascade winners ignore keyframe selectors', () => {
  assert.deepEqual(
    cascadeWinners('@KEYFRAMES x{from{top:0}}.a{color:red}'),
    new Map([['.a color', 'red']])
  );
});

test('cross-block check reports a @keyframes rule that was rewritten', () => {
  const css = '@KEYFRAMES x{from{top:0}to{top:0}}';
  const failure = checkCrossBlock(css, (input) => ({
    css: input === css ? '@KEYFRAMES x{from,to{top:0}}' : input,
    terminated: false,
  }));
  assert.equal(failure.reason, 'keyframes changed');
});

test('cross-block check accepts a @keyframes rule that moved but stayed byte-identical', () => {
  const css = '@keyframes x{from{top:0}}.a{color:red}.b{color:red}';
  const failure = checkCrossBlock(css, (input) => ({
    css: input === css ? '.a,.b{color:red}@keyframes x{from{top:0}}' : input,
    terminated: false,
  }));
  assert.equal(failure, undefined);
});

test('cascade winners take the last value in source order for each selector and property', () => {
  assert.deepEqual(
    cascadeWinners('.a{color:red}@media print{.a{color:blue}}'),
    new Map([['.a color', 'blue']])
  );
});

test('cascade winners expand selector lists', () => {
  assert.deepEqual(
    cascadeWinners('.a,.b{color:red}'),
    new Map([
      ['.a color', 'red'],
      ['.b color', 'red'],
    ])
  );
});

test('cross-block check accepts output with the same cascade, a second pass that is stable, and no growth', () => {
  const css = '.a{color:red}.b{color:red}';
  const run = (input) => ({
    css: input === css ? '.a,.b{color:red}' : input,
    terminated: false,
  });
  assert.equal(checkCrossBlock(css, run), undefined);
});

test('cross-block check reports a run that did not terminate', () => {
  const failure = checkCrossBlock('.a{color:red}', () => ({
    css: undefined,
    terminated: true,
  }));
  assert.equal(failure.reason, 'did not terminate');
});

test('cross-block check reports a changed cascade', () => {
  const css = '.a{color:red}.a{color:blue}';
  const failure = checkCrossBlock(css, () => ({
    css: '.a{color:blue}.a{color:red}',
    terminated: false,
  }));
  assert.equal(failure.reason, 'cascade changed');
});

test('cross-block check reports a declaration that the output applies to another selector', () => {
  const css = '.a{color:red}.b{top:0}';
  const failure = checkCrossBlock(css, () => ({
    css: '.a,.b{color:red}.b{top:0}',
    terminated: false,
  }));
  assert.equal(failure.reason, 'cascade changed');
});

test('cross-block check reports output that grows', () => {
  const failure = checkCrossBlock('.a{color:red}', () => ({
    css: '.a{color:red}.a{color:red}',
    terminated: false,
  }));
  assert.equal(failure.reason, 'output grew');
});

test('cross-block check reports a second pass that changes the output', () => {
  const css = '.a{color:red}.b{color:red}';
  const failure = checkCrossBlock(css, (input) => ({
    css: input === css ? '.b{color:red}.a{color:red}' : '.a,.b{color:red}',
    terminated: false,
  }));
  assert.equal(failure.reason, 'second pass changed the output');
});

test('child-process runner reports the input that did not terminate', () => {
  const result = processAllWithLimits(['.a{color:red}'], {
    pluginUrl: 'data:text/javascript,export default () => { for (;;); }',
    timeout: 1000,
  });
  assert.equal(result.terminated, true);
});

test('child-process runner returns minified output for terminating input', () => {
  assert.deepEqual(processAllWithLimits(['.a{color:red}.b{color:red}']).css, [
    '.a,.b{color:red}',
  ]);
});

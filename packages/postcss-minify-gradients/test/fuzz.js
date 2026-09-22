import assert from 'node:assert/strict';
import test from 'node:test';
import isKnownColor from '../src/isKnownColor.js';
import { check, evaluate, outputFor, report } from '../script/lib/fuzzCheck.js';
import { branches, colorPool, generate } from '../script/lib/fuzzGenerate.js';

const casesPerSeed = 360;
const requiredFeatures = [
  'abort:env',
  'abort:nested-var',
  'abort:var',
  'color:currentcolor',
  'color:functional',
  'color:hex',
  'color:named',
  'color:system',
  'color:variable',
  'context:layered',
  'first:angle',
  'first:at',
  'first:from',
  'first:from-at',
  'first:legacy-side',
  'first:shape',
  'first:shape-at',
  'first:to-corner',
  'first:to-side',
  'fn:-webkit-linear-gradient',
  'fn:-webkit-radial-gradient',
  'fn:-webkit-repeating-linear-gradient',
  'fn:conic-gradient',
  'fn:linear-gradient',
  'fn:radial-gradient',
  'nested:color-mix',
  'nested:gradient',
  'nested:light-dark',
  'pos:angle',
  'pos:angle-zero',
  'pos:calc',
  'pos:length',
  'pos:negative',
  'pos:percent',
  'pos:variable',
  'pos:zero-length',
  'pos:zero-percent',
  'pos:zero-unitless',
  'shape:double',
  'shape:positionless',
  'shape:single',
  'stops:1',
  'stops:2',
  'stops:3',
  'trailing:angle',
  'trailing:shape',
  'trailing:to-side',
  'trailing:zero',
];
const outcomeKinds = [
  'abort',
  'boundaryFirst',
  'boundaryLast',
  'direction',
  'unchanged',
  'zero',
];
for (const seed of [1, 2]) {
  test(`matches the independent position oracle, seed ${seed}`, () => {
    const seenBranches = new Set();
    const semanticShapes = new Set();
    const seenFeatures = new Set();
    const seenOutcomes = new Set();
    let index = 0;
    for (const sample of generate(seed, casesPerSeed)) {
      seenBranches.add(sample.branch);
      semanticShapes.add(sample.semanticKey);
      for (const feature of sample.features) seenFeatures.add(feature);
      const failure = check(sample);
      assert.equal(failure, undefined, failure && report(failure, seed, index));
      const kinds = evaluate(sample).kinds;
      for (const kind of outcomeKinds) if (kinds[kind]) seenOutcomes.add(kind);
      index++;
    }
    assert.deepEqual(
      [...branches].filter((branch) =>
        [...seenBranches].some((seen) => seen.startsWith(branch))
      ),
      [...branches].toSorted()
    );
    assert.ok(
      semanticShapes.size >= 80,
      `expected 80 semantic shapes, got ${semanticShapes.size}`
    );
    assert.deepEqual(
      requiredFeatures.filter((feature) => !seenFeatures.has(feature)),
      []
    );
    assert.deepEqual(
      outcomeKinds.filter((kind) => !seenOutcomes.has(kind)),
      []
    );
  });
}

test('generator colours are all recognized colour stops', () => {
  for (const colour of colorPool)
    assert.ok(isKnownColor(colour.text.toLowerCase()), colour.text);
});

test('preserves deliberate collision cases', () => {
  const cases = [
    {
      css: 'a{background-image:linear-gradient(to right, red 0%, blue)}',
      expected: 'linear-gradient(90deg, red, blue)',
      feature: 'collision:direction-boundary-zero',
    },
    {
      css: 'a{background-image:linear-gradient(red, blue 0%)}',
      expected: 'linear-gradient(red, blue 0)',
      feature: 'collision:clamped-zero',
    },
    {
      css: 'a{background-image:linear-gradient(red 50%, 0px)}',
      expected: 'linear-gradient(red 50%, 0)',
      feature: 'collision:trailing-position-zero',
    },
    {
      css: 'a{background-image:linear-gradient(red, calc(10px), blue)}',
      expected: 'linear-gradient(red, calc(10px), blue)',
      feature: 'collision:math-function-position',
    },
    {
      css: 'a{background-image:linear-gradient(lab(50% 20 30), red 100%)}',
      expected: 'linear-gradient(lab(50% 20 30), red)',
      feature: 'collision:unknown-function-colour',
    },
    {
      css: 'a{background-image:linear-gradient(to top left, red, blue 100%)}',
      expected: 'linear-gradient(to top left, red, blue)',
      feature: 'collision:corner-not-an-angle',
    },
    {
      css: 'a{background-image:radial-gradient(circle at var(--x), red, blue)}',
      expected: 'radial-gradient(circle at var(--x), red, blue)',
      feature: 'collision:nested-variable-abort',
    },
    // A gradient nested as a colour stop is fixed up on its own: its stop
    // positions are rewritten within the nested gradient's arguments, and the
    // enclosing gradient's stop positions are unaffected.
    {
      css: 'a{background-image:linear-gradient(linear-gradient(red 50%, blue 25%), red)}',
      expected: 'linear-gradient(linear-gradient(red 50%, blue 0), red)',
      feature: 'collision:nested-gradient-inner-clamp',
    },
    {
      css: 'a{background-image:linear-gradient(linear-gradient(red 0svh, blue), red 45%)}',
      expected: 'linear-gradient(linear-gradient(red, blue), red 45%)',
      feature: 'collision:nested-gradient-inner-first-zero',
    },
    {
      css: 'a{background-image:linear-gradient(red 0% 25%, blue)}',
      expected: 'linear-gradient(red 0% 25%, blue)',
      feature: 'collision:double-position-boundary-kept',
    },
    // Hand-checked against the CSS Images 3 stop fixup rules: a length and a
    // percentage are incomparable scales unless one names zero, so a running
    // maximum never survives a non-zero scale change, while a zero clamps to
    // any non-negative maximum whatever zero-capable units name them.
    {
      css: 'a{background-image:linear-gradient(red 10px, blue 50%, lime 30px)}',
      expected: 'linear-gradient(red 10px, blue 50%, lime 30px)',
      feature: 'collision:incomparable-positions-reset',
    },
    {
      css: 'a{background-image:linear-gradient(red 10px, blue 0mm, lime 30%)}',
      expected: 'linear-gradient(red 10px, blue 0, lime 30%)',
      feature: 'collision:zero-length-clamps-across-units',
    },
    {
      css: 'a{background-image:linear-gradient(red 50px, blue 0%, lime 20%)}',
      expected: 'linear-gradient(red 50px, blue 0, lime 20%)',
      feature: 'collision:zero-clamp-keeps-maximum',
    },
    // After an incomparable unit change no running maximum is known, so a
    // following zero is left alone: the plugin only rewrites a zero against a
    // known non-negative maximum.
    {
      css: 'a{background-image:linear-gradient(red 10px, blue 50%, lime 0mm)}',
      expected: 'linear-gradient(red 10px, blue 50%, lime 0mm)',
      feature: 'collision:zero-after-reset-kept',
    },
    // Interpolation hints share the running maximum with stop positions, so an
    // incomparable hint resets it and a zero-capable hint clamps to it.
    {
      css: 'a{background-image:linear-gradient(red 50%, 10px, blue 45%)}',
      expected: 'linear-gradient(red 50%, 10px, blue 45%)',
      feature: 'collision:incomparable-hint-resets',
    },
    {
      css: 'a{background-image:linear-gradient(red 50%, 0em, blue 45%)}',
      expected: 'linear-gradient(red 50%, 0, blue 0)',
      feature: 'collision:zero-length-hint-clamps',
    },
    // An `in <colorspace>` argument and a conic `from <angle>` are line
    // specifications, and the first stop still defaults to the zero position
    // whatever the from angle is.
    {
      css: 'a{background-image:linear-gradient(in oklab, red 0%, blue)}',
      expected: 'linear-gradient(in oklab, red, blue)',
      feature: 'collision:colorspace-line-specification',
    },
    {
      css: 'a{background-image:conic-gradient(in oklch from 0.5turn, red 0%, blue)}',
      expected: 'conic-gradient(in oklch from 0.5turn, red, blue)',
      feature: 'collision:colorspace-and-from-angle',
    },
    {
      css: 'a{background-image:conic-gradient(from 45deg at 50%, red 0%, blue)}',
      expected: 'conic-gradient(from 45deg at 50%, red, blue)',
      feature: 'collision:from-angle-with-position',
    },
    {
      css: 'a{background-image:conic-gradient(from 0deg, red 0%, blue)}',
      expected: 'conic-gradient(from 0deg, red, blue)',
      feature: 'collision:zero-from-angle',
    },
  ];
  for (const { css, expected, feature } of cases)
    assert.equal(outputFor(css), expected, feature);
});

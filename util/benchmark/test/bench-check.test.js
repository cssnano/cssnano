import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import {
  OPTIONS,
  casesForNames,
  casesForPackage,
  classifyOverall,
  compareArgs,
  fastProfileFlags,
  followUpCommands,
  formatHeader,
  formatTable,
  helpText,
  parseCheckArgs,
  progressLine,
  resolveRevision,
  summaryFor,
} from '../bench-check.js';

const cases = {
  a: { plugin: 'postcss-merge-rules' },
  b: { plugin: 'postcss-merge-longhand' },
  c: { plugin: 'postcss-merge-rules' },
};

test('casesForPackage lists the focused cases of that plugin only', () => {
  assert.deepEqual(casesForPackage('postcss-merge-rules', cases), ['a', 'c']);
});

test('casesForPackage names the known plugins when none matches', () => {
  assert.throws(
    () => casesForPackage('postcss-nope', cases),
    /no focused benchmark case for "postcss-nope".*postcss-merge-longhand, postcss-merge-rules/v
  );
});

test('fastProfileFlags starts at the minimum even number of blocks and lets the time budget decide the rest', () => {
  const flags = fastProfileFlags(30_000);
  assert.deepEqual(
    [
      '--adaptive',
      '--minimum-blocks=4',
      '--pilot-blocks=4',
      '--time-budget=30s',
    ].filter((flag) => !flags.includes(flag)),
    []
  );
});

test('parseCheckArgs reads the total budget as a duration', () => {
  const args = parseCheckArgs(['--case=a', '--budget=3m']);
  assert.equal(args.budgetMs, 180_000);
});

test('parseCheckArgs defaults the total budget to two minutes', () => {
  assert.equal(parseCheckArgs(['--case=a']).budgetMs, 120_000);
});

test('parseCheckArgs rejects a budget that is not a duration', () => {
  assert.throws(
    () => parseCheckArgs(['--case=a', '--budget=fast']),
    /--budget must be a duration such as 90s or 5m/v
  );
});

test('parseCheckArgs defaults to the base HEAD and the working tree', () => {
  const args = parseCheckArgs(['--package=postcss-merge-rules']);
  assert.deepEqual(
    [args.base, args.candidate, args.package],
    ['HEAD', 'worktree', 'postcss-merge-rules']
  );
});

test('parseCheckArgs rejects a run that names neither a package nor a case', () => {
  assert.throws(() => parseCheckArgs([]), /--package=<name> or --case=<name>/v);
});

test('parseCheckArgs rejects an unknown flag instead of ignoring it', () => {
  assert.throws(
    () => parseCheckArgs(['--case=a', '--bogus=1']),
    /unknown option --bogus/v
  );
});

test('resolveRevision turns a ref into the full commit hash', () => {
  const sha = 'a'.repeat(40);
  const runner = (command, args) => {
    assert.deepEqual(
      [command, args],
      ['git', ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']]
    );
    return `${sha}\n`;
  };
  assert.equal(resolveRevision('HEAD', runner), sha);
});

function failingRunner() {
  throw new Error('exit 1');
}

test('resolveRevision names the ref that does not resolve', () => {
  const runner = failingRunner;
  assert.throws(
    () => resolveRevision('nope', runner),
    /cannot resolve "nope"/v
  );
});

test('summaryFor reports the direction, ratio and interval of TOTAL as plain data', () => {
  const summary = summaryFor('a', {
    overallVerdict: 'inconclusive',
    total: {
      ratio: 1.02,
      statisticalDirection: 'inconclusive',
      practicalConclusion: 'within-margin',
      confidenceIntervalPct: { low: -3, high: 7 },
    },
    blocks: [{}, {}, {}, {}],
  });
  assert.deepEqual(summary, {
    case: 'a',
    verdict: 'inconclusive',
    direction: 'inconclusive',
    practical: 'within-margin',
    ratio: 1.02,
    intervalPct: [-3, 7],
    blocks: 4,
    outputs: 'identical',
  });
});

const slowerReport = {
  overallVerdict: 'inconclusive',
  total: {
    ratio: 1.09,
    statisticalDirection: 'slower',
    practicalConclusion: 'inconclusive',
    confidenceIntervalPct: { low: 0.5, high: 17 },
  },
  blocks: [{}, {}, {}, {}],
  verdictBasis: {
    direction: 'slower',
    precision: 'not-achieved',
    order: 'stable',
    blocks: 'sufficient',
  },
  inconclusiveReason: 'requested precision was not achieved',
};

test('summaryFor carries the verdict basis so a reader sees what is missing', () => {
  assert.equal(summaryFor('a', slowerReport).basis.precision, 'not-achieved');
});

test('summaryFor carries the inconclusive reason to the next step', () => {
  assert.equal(
    summaryFor('a', slowerReport).reason,
    'requested precision was not achieved'
  );
});

test('summaryFor omits reason when the report gives none', () => {
  const { inconclusiveReason: _reason, ...report } = slowerReport;
  assert.equal('reason' in summaryFor('a', report), false);
});

test('summaryFor reports that outputs matched once a report exists, because preflight stops on any difference', () => {
  assert.equal(summaryFor('a', slowerReport).outputs, 'identical');
});

test('summaryFor does not claim identical outputs when no analysis exists', () => {
  assert.equal('outputs' in summaryFor('a', { blocks: [] }), false);
});

test('summaryFor reports a missing analysis as unavailable', () => {
  assert.equal(summaryFor('a', { blocks: [] }).verdict, 'unavailable');
});

test('helpText names every option, so a new flag cannot go undocumented', () => {
  const text = helpText();
  assert.deepEqual(
    [...OPTIONS.keys(), 'help', 'json'].filter(
      (name) => !text.includes(`--${name}`)
    ),
    []
  );
});

test('helpText shows an example invocation', () => {
  assert.match(helpText(), /bench-check\.js --package=/v);
});

test('parseCheckArgs accepts --help without requiring a package or case', () => {
  assert.equal(parseCheckArgs(['--help']).help, true);
});

test('parseCheckArgs accepts -h as --help', () => {
  assert.equal(parseCheckArgs(['-h']).help, true);
});

test('parseCheckArgs reads --json as a bare flag', () => {
  assert.equal(parseCheckArgs(['--case=a', '--json']).json, true);
});

test('parseCheckArgs reads --keep as a bare flag', () => {
  assert.notEqual(parseCheckArgs(['--case=a', '--keep']).keep, undefined);
});

test('parseCheckArgs splits a comma-separated case list in order', () => {
  assert.deepEqual(parseCheckArgs(['--case=b,a']).caseNames, ['b', 'a']);
});

test('casesForNames returns known cases in the order given', () => {
  assert.deepEqual(casesForNames(['c', 'a'], cases), ['c', 'a']);
});

test('casesForNames names the known cases when one is unknown', () => {
  assert.throws(
    () => casesForNames(['a', 'zz'], cases),
    /unknown case "zz".*known cases: a, b, c/v
  );
});

test('help exits 0 without preparing a worktree', () => {
  const result = spawnSync(
    process.execPath,
    [new URL('../bench-check.js', import.meta.url).pathname, '--help'],
    { encoding: 'utf8' }
  );
  assert.deepEqual([result.status, result.stdout], [0, `${helpText()}\n`]);
});

test('a malformed flag exits 1 and lists the options after the error', () => {
  const result = spawnSync(
    process.execPath,
    [new URL('../bench-check.js', import.meta.url).pathname, '--bogus=1'],
    { encoding: 'utf8' }
  );
  assert.deepEqual(
    [result.status, /unknown option --bogus[^]*--budget/v.test(result.stderr)],
    [1, true]
  );
});

const noChange = {
  case: 'a',
  verdict: 'inconclusive',
  direction: 'inconclusive',
  ratio: 1.01,
};
const slower = { ...noChange, case: 'b', direction: 'slower' };
const faster = { ...noChange, case: 'c', direction: 'faster' };

test('classifyOverall reports no change when no case has a direction', () => {
  assert.equal(classifyOverall([noChange]).line, 'no change detected');
});

test('classifyOverall flags a slower case as a possible regression', () => {
  assert.equal(
    classifyOverall([noChange, slower]).line,
    'possible regression: b'
  );
});

test('classifyOverall flags a faster case as a possible improvement', () => {
  assert.equal(
    classifyOverall([noChange, faster]).line,
    'possible improvement: c'
  );
});

test('classifyOverall reports both directions when cases disagree', () => {
  assert.equal(
    classifyOverall([slower, faster]).line,
    'possible regression: b; possible improvement: c'
  );
});

test('classifyOverall does not call a run with a failed case unchanged', () => {
  assert.match(
    classifyOverall([noChange, { case: 'd', verdict: 'failed' }]).line,
    /incomplete: d/v
  );
});

test('followUpCommands is empty when no case is flagged', () => {
  assert.deepEqual(followUpCommands([noChange], { budget: '2m' }), []);
});

test('followUpCommands reruns exactly the flagged cases with the same budget', () => {
  const [rerun] = followUpCommands([noChange, slower, faster], {
    budget: '9m',
  });
  assert.match(rerun, /--case=b,c --budget=9m$/v);
});

test('followUpCommands offers the full comparison for the flagged cases', () => {
  const commands = followUpCommands([slower], { budget: '2m' });
  assert.match(commands[1], /compare-revisions\.js .*--case=b/v);
});

test('formatHeader shows each case its share of the total budget', () => {
  assert.equal(formatHeader(10, 540_000), '10 cases, 9m total, ≈54s each');
});

test('formatHeader uses the singular for one case', () => {
  assert.equal(formatHeader(1, 120_000), '1 case, 2m total, ≈2m each');
});

test('formatTable lists case, ratio, interval, verdict and reason on one row each', () => {
  const rows = formatTable([
    {
      ...slower,
      ratio: 1.086,
      intervalPct: [0.5, 17.3],
      reason: 'requested precision was not achieved',
    },
  ]).split('\n');
  assert.deepEqual(rows[1].split(/\s{2,}/v), [
    'b',
    '1.086',
    '[+0.5, +17.3]%',
    'inconclusive/slower',
    'requested precision was not achieved',
  ]);
});

test('formatTable labels its columns on the first row', () => {
  assert.match(formatTable([slower]), /^case\s+ratio\s+interval\s+verdict/v);
});

test('progressLine shows the index, the case and the budget left', () => {
  assert.equal(
    progressLine(2, 10, 'b', 55_000, 540_000),
    'bench-check: [2/10] b done after 55s; 485s of budget left'
  );
});

test('compareArgs turns off the child governor warning, which bench-check prints once', () => {
  const args = compareArgs(
    {},
    'a',
    { base: '/b', candidate: '/c' },
    { base: 'x', candidate: 'y' },
    '/r',
    30_000
  );
  assert.ok(args.includes('--no-environment-warning'));
});

import { join } from 'node:path';
import { corpusSelectionArgs } from './bench-corpus.js';

export function quote(value) {
  const string = String(value);
  const shellSafe = [...string].every(
    (character) =>
      (character >= 'a' && character <= 'z') ||
      (character >= 'A' && character <= 'Z') ||
      (character >= '0' && character <= '9') ||
      '_./:=,@+%-'.includes(character)
  );
  return shellSafe ? string : `'${string.replaceAll("'", "'\"'\"'")}'`;
}

export function smokeArguments(config, side, directory, revision) {
  const args = [
    join(directory, 'util/benchmark/bench.js'),
    '--mode=quick',
    '--runs=1',
    `--label=preflight-${side}`,
    `--results-dir=${config.resultsDir}`,
    `--seed=${config.seed}`,
    `--revision=${revision}`,
    `--preset=${config.preset}`,
    '--summary',
    // The smoke run must exercise the same selection as the comparison, or its
    // metadata and output hashes describe a different benchmark.
    ...corpusSelectionArgs(config),
  ];
  return args;
}

function appendValueFlags(parts, config) {
  for (const [name, value] of [
    ['blocks', config.blocks],
    ['minimum-blocks', config.minimumBlocks],
    ['requested-blocks', config.requestedBlocks],
    ['pilot-blocks', config.pilotBlocks],
    ['seed', config.seed],
    ['warmup', config.warmup],
    ['iters', config.iters],
    ['precision-target', config.precisionTarget],
    ['order-interaction-threshold', config.orderInteractionThreshold],
    ['superiority-confidence-level', config.superiorityConfidenceLevel],
    ['equivalence-confidence-level', config.equivalenceConfidenceLevel],
    ['runtime-non-regression-margin', config.runtimeNonRegressionMargin],
    ['practical-equivalence-margin', config.practicalEquivalenceMargin],
    ['cooldown-ms', config.cooldown],
  ]) {
    if (value !== undefined && value !== null)
      parts.push(`--${name}=${quote(String(value))}`);
  }
}

function appendSelectionFlags(parts, config) {
  if (config.case) parts.push(`--case=${quote(config.case)}`);
  for (const selector of config.only ?? [])
    parts.push(`--only=${quote(selector)}`);
  if (config.corpusManifest)
    parts.push(`--corpus-manifest=${quote(config.corpusManifest)}`);
}

function appendModeFlags(parts, config) {
  if (config.adaptive) parts.push('--adaptive');
  else if (config.adaptive === false) parts.push('--no-adaptive');
  if (config.pinCore !== null && config.pinCore !== undefined)
    parts.push(`--pin-core=${config.pinCore}`);
  if (config.preflight === true) parts.push('--preflight');
  else if (config.preflight === false) parts.push('--no-preflight');
  if (config.quietChild === true) parts.push('--quiet-child');
  else if (config.quietChild === false) parts.push('--verbose-child');
  if (config.report === true) parts.push('--report');
  else if (config.report === false) parts.push('--no-report');
  if (config.markdown) parts.push(`--markdown=${quote(config.markdown)}`);
  for (const directory of config.cleanupDirs ?? [])
    parts.push(`--cleanup=${quote(directory)}`);
}

function appendApprovalFlags(parts, config, extraApprovals) {
  const approvals = new Map(config.outputHashAllowlist ?? []);
  for (const [name, hashes] of extraApprovals) approvals.set(name, hashes);
  for (const [name, hashes] of approvals)
    parts.push(
      `--allow-output-hash=${name},${hashes.base},${hashes.candidate}`
    );
}

export function approvalCommand(config, extraApprovals = []) {
  const parts = [
    'node util/benchmark/compare-revisions.js',
    `--base-revision=${quote(config.baseRevision)}`,
    `--candidate-revision=${quote(config.candidateRevision)}`,
    `--base-dir=${quote(config.baseDir)}`,
    `--candidate-dir=${quote(config.candidateDir)}`,
    `--results-dir=${quote(config.resultsDir)}`,
    `--mode=${config.mode}`,
    `--preset=${config.preset}`,
  ];
  // Emit every configurable setting explicitly so rerunning the printed
  // command reproduces the benchmarked configuration exactly.
  appendValueFlags(parts, config);
  appendModeFlags(parts, config);
  appendSelectionFlags(parts, config);
  appendApprovalFlags(parts, config, extraApprovals);
  return parts.join(' ');
}

import { stableJson } from './compare-snapshot-io.mjs';

function validateBasicMetadata(base, candidate) {
  if (base.schemaVersion !== candidate.schemaVersion) {
    throw new Error(
      `incompatible snapshots: schema differs (${base.schemaVersion} vs ${candidate.schemaVersion})`
    );
  }
  for (const field of [
    'preset',
    'corpusManifest',
    'target',
    'node',
    'finalizationMode',
    'platform',
    'arch',
    'iters',
    'warmup',
    'mode',
  ]) {
    const baseValue = base[field] ?? base.environment?.[field];
    const candidateValue = candidate[field] ?? candidate.environment?.[field];
    if (baseValue === undefined || candidateValue === undefined) {
      if (
        field === 'finalizationMode' ||
        (field === 'mode' && base.schemaVersion === 1)
      )
        continue;
      throw new TypeError(
        `incompatible snapshots: ${field} metadata is required`
      );
    }
    if (baseValue !== candidateValue) {
      throw new Error(
        `incompatible snapshots: ${field} differs (${baseValue} vs ${candidateValue})`
      );
    }
  }
  if (base.seed !== candidate.seed) {
    throw new Error(
      `incompatible snapshots: seed differs (${base.seed} vs ${candidate.seed})`
    );
  }
}

function validateEnvironment(base, candidate) {
  if (!base.environment && !candidate.environment) return;
  if (!base.environment || !candidate.environment) {
    throw new Error('incompatible snapshots: environment metadata differs');
  }
  const fields = new Set([
    ...Object.keys(base.environment),
    ...Object.keys(candidate.environment),
  ]);
  for (const field of fields) {
    if (
      stableJson(base.environment[field]) !==
      stableJson(candidate.environment[field])
    ) {
      throw new Error(`incompatible snapshots: environment.${field} differs`);
    }
  }
}

function validateReplicates(base, candidate) {
  if (base.runs.length !== candidate.runs.length) {
    throw new Error(
      `incompatible snapshots: replicate count differs (${base.runs.length} vs ${candidate.runs.length})`
    );
  }
  const baseIndexes = base.runs.map((run) => run.index).toSorted();
  const candidateIndexes = candidate.runs.map((run) => run.index).toSorted();
  if (stableJson(baseIndexes) !== stableJson(candidateIndexes)) {
    throw new Error('incompatible snapshots: replicate indexes differ');
  }
}

function approvedHashChange(allowlist, name, baseHash, candidateHash) {
  const approved = allowlist.get(name);
  return approved?.base === baseHash && approved.candidate === candidateHash;
}

function validateOutputHashes(base, candidate, allowlist) {
  const approvedChanges = new Map();
  const baseRuns = new Map(base.runs.map((run) => [run.index, run]));
  const candidateRuns = new Map(candidate.runs.map((run) => [run.index, run]));
  for (const [index, baseRun] of baseRuns) {
    const candidateRun = candidateRuns.get(index);
    const names = new Set([
      ...Object.keys(baseRun.outputHashes),
      ...Object.keys(candidateRun.outputHashes),
    ]);
    for (const name of names) {
      if (baseRun.outputHashes[name] !== candidateRun.outputHashes[name]) {
        if (
          approvedHashChange(
            allowlist,
            name,
            baseRun.outputHashes[name],
            candidateRun.outputHashes[name]
          )
        ) {
          approvedChanges.set(name, allowlist.get(name));
          continue;
        }
        throw new Error(
          `incompatible snapshots: output hash differs for "${name}" in replicate ${index}; ` +
            `base hash "${baseRun.outputHashes[name]}"; candidate hash "${candidateRun.outputHashes[name]}"`
        );
      }
    }
  }
  const names = new Set([
    ...Object.keys(base.outputHashes ?? {}),
    ...Object.keys(candidate.outputHashes ?? {}),
  ]);
  for (const name of names) {
    if (base.outputHashes?.[name] !== candidate.outputHashes?.[name]) {
      if (
        approvedHashChange(
          allowlist,
          name,
          base.outputHashes?.[name],
          candidate.outputHashes?.[name]
        )
      ) {
        approvedChanges.set(name, allowlist.get(name));
        continue;
      }
      throw new Error(
        `incompatible snapshots: output hash differs for "${name}" in aggregate snapshot; ` +
          `base hash "${base.outputHashes?.[name]}"; candidate hash "${candidate.outputHashes?.[name]}"`
      );
    }
  }
  for (const name of allowlist.keys()) {
    if (!approvedChanges.has(name)) {
      throw new Error(
        `output hash allowlist entry for "${name}" did not match a difference`
      );
    }
  }
  return approvedChanges;
}

export function validateMatchingMetadata(base, candidate, options = {}) {
  validateBasicMetadata(base, candidate);
  validateEnvironment(base, candidate);
  validateReplicates(base, candidate);
  return validateOutputHashes(
    base,
    candidate,
    options.outputHashAllowlist ?? new Map()
  );
}

export function frameworkByName(frameworks) {
  return new Map(frameworks.map((framework) => [framework.name, framework]));
}

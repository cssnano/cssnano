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

const REQUIRED_ENV_FIELDS = [
  'node',
  'v8',
  'platform',
  'arch',
  'nodeFlags',
  'nodeEnv',
  'finalizationMode',
];

function validateEnvironment(base, candidate) {
  if (!base.environment && !candidate.environment) return;
  if (!base.environment || !candidate.environment) {
    throw new Error('incompatible snapshots: environment metadata differs');
  }
  for (const field of REQUIRED_ENV_FIELDS) {
    if (
      base.environment[field] === undefined &&
      candidate.environment[field] === undefined
    ) {
      continue;
    }
    if (
      stableJson(base.environment[field]) !==
      stableJson(candidate.environment[field])
    ) {
      throw new Error(`incompatible snapshots: environment.${field} differs`);
    }
  }
}

function approvedHashChange(allowlist, name, baseHash, candidateHash) {
  const approved = allowlist.get(name);
  return approved?.base === baseHash && approved.candidate === candidateHash;
}

function hashesFor(snapshot) {
  const hashes = new Map();
  for (const run of snapshot.runs) {
    for (const [name, hash] of Object.entries(run.outputHashes)) {
      if (hashes.has(name) && hashes.get(name) !== hash) {
        throw new Error(
          `incompatible snapshots: output hash changed between independent runs for "${name}"`
        );
      }
      hashes.set(name, hash);
    }
  }
  return hashes;
}

function validateOutputHashes(base, candidate, allowlist) {
  const approvedChanges = new Map();
  const baseHashes = hashesFor(base);
  const candidateHashes = hashesFor(candidate);
  const names = new Set([...baseHashes.keys(), ...candidateHashes.keys()]);
  for (const name of names) {
    const baseHash = baseHashes.get(name);
    const candidateHash = candidateHashes.get(name);
    if (baseHash !== candidateHash) {
      if (approvedHashChange(allowlist, name, baseHash, candidateHash)) {
        approvedChanges.set(name, allowlist.get(name));
        continue;
      }
      throw new Error(
        `incompatible snapshots: output hash differs for "${name}"; ` +
          `base hash "${baseHash}"; candidate hash "${candidateHash}"`
      );
    }
  }
  const aggregateNames = new Set([
    ...Object.keys(base.outputHashes ?? {}),
    ...Object.keys(candidate.outputHashes ?? {}),
  ]);
  for (const name of aggregateNames) {
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
  return validateOutputHashes(
    base,
    candidate,
    options.outputHashAllowlist ?? new Map()
  );
}

export function frameworkByName(frameworks) {
  return new Map(frameworks.map((framework) => [framework.name, framework]));
}

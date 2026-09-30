import { PROVENANCE_FIELDS, validateProvenance } from './bench-provenance.js';
import { createComparisonSchedule } from './comparison-schedule.js';
import {
  SIDES,
  SHA256,
  metadataEquals,
  validateConfiguration,
  validateObservation,
} from './compareObservationValidation.js';

const PROVENANCE_INVARIANT_FIELDS = PROVENANCE_FIELDS.filter(
  (field) => field !== 'createdAt' && field !== 'command'
);
const DERIVED_FIELDS = new Set([
  'analysis',
  'analysisClass',
  'confidenceInterval',
  'confidenceIntervalPct',
  'estimatedBlocksNeeded',
  'overallVerdict',
  'precision',
  'precisionAchieved',
  'precisionConclusion',
  'rows',
  'total',
  'verdictBasis',
]);

function validateBlockMetadata(block) {
  if (
    !Number.isInteger(block.blockId) ||
    block.blockId < 1 ||
    !Array.isArray(block.processOrder) ||
    block.processOrder.length !== 2 ||
    !SIDES.includes(block.processOrder[0]) ||
    !SIDES.includes(block.processOrder[1]) ||
    block.processOrder[0] === block.processOrder[1]
  )
    throw new TypeError(
      `invalid metadata for comparison block ${block.blockId}`
    );
  if (
    typeof block.startedAt !== 'string' ||
    !Number.isFinite(Date.parse(block.startedAt)) ||
    !Number.isFinite(block.durationMs) ||
    block.durationMs < 0
  )
    throw new TypeError(
      `comparison block ${block.blockId} timing metadata is invalid`
    );
  if (
    !block.exitStatus ||
    typeof block.exitStatus !== 'object' ||
    SIDES.some(
      (side) =>
        !Number.isInteger(block.exitStatus[side]) || block.exitStatus[side] < 0
    )
  )
    throw new TypeError(
      `comparison block ${block.blockId} exit status metadata is invalid`
    );
}

function validateSchedule(artifact) {
  if (
    !Array.isArray(artifact.schedule) ||
    artifact.schedule.length !== artifact.configuration.actualBlocks
  )
    throw new TypeError(
      'comparison schedule must contain every observed block'
    );
  const expected = createComparisonSchedule(
    artifact.configuration.actualBlocks,
    artifact.configuration.seed
  );
  for (const [index, scheduled] of artifact.schedule.entries()) {
    if (
      !Number.isInteger(scheduled.blockId) ||
      scheduled.blockId !== index + 1 ||
      !Array.isArray(scheduled.processOrder) ||
      scheduled.processOrder.length !== 2 ||
      !SIDES.includes(scheduled.processOrder[0]) ||
      !SIDES.includes(scheduled.processOrder[1]) ||
      scheduled.processOrder[0] === scheduled.processOrder[1]
    )
      throw new TypeError(`invalid comparison schedule entry ${index + 1}`);
  }
  if (JSON.stringify(artifact.schedule) !== JSON.stringify(expected))
    throw new Error(
      'comparison schedule differs from its seed-derived schedule'
    );
  return expected;
}

function assertProvenanceInvariant(actual, expected, label) {
  for (const field of PROVENANCE_INVARIANT_FIELDS) {
    const actualValue = actual[field];
    const expectedValue = expected[field];
    if (
      Array.isArray(actualValue) || Array.isArray(expectedValue)
        ? JSON.stringify(actualValue) !== JSON.stringify(expectedValue)
        : actualValue !== expectedValue
    )
      throw new Error(`comparison ${label} provenance differs in ${field}`);
  }
}

function assertConfigurationInvariant(wrapper, configuration, label) {
  if (!wrapper.configuration || typeof wrapper.configuration !== 'object')
    throw new TypeError(`comparison ${label} configuration is required`);
  const fields = [
    'mode',
    'warmup',
    'iters',
    'preset',
    'target',
    'case',
    'corpusSelector',
    'seed',
    'nodeEnv',
    'superiorityConfidenceLevel',
    'equivalenceConfidenceLevel',
    'runtimeNonRegressionMargin',
    'practicalEquivalenceMargin',
    'minimumBlocks',
    'requestedBlocks',
    'precisionTarget',
    'orderInteractionThreshold',
    'intervalMethod',
    'analyzerVersion',
  ];
  for (const field of fields) {
    if (!metadataEquals(wrapper.configuration[field], configuration[field]))
      throw new Error(`comparison ${label} configuration.${field} differs`);
  }
}

function validateArtifactBasicMetadata(artifact, configuration) {
  if (
    !artifact ||
    artifact.schemaVersion !== 3 ||
    artifact.artifactType !== 'comparison'
  )
    throw new TypeError('comparison artifact must use schema v3');
  for (const field of DERIVED_FIELDS)
    if (field in artifact)
      throw new Error(
        `comparison artifact must not contain derived field ${field}`
      );
  if (
    typeof artifact.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(artifact.createdAt)) ||
    !Array.isArray(artifact.command)
  )
    throw new TypeError('comparison artifact metadata is incomplete');
  if (
    !Array.isArray(artifact.blocks) ||
    !artifact.blocks.length ||
    configuration.actualBlocks !== artifact.blocks.length
  )
    throw new TypeError('comparison artifact actual block count is invalid');
  if (
    !artifact.gitRevision ||
    typeof artifact.gitRevision !== 'object' ||
    SIDES.some((side) => !/^[\da-f]{40}$/v.test(artifact.gitRevision[side]))
  )
    throw new TypeError('comparison artifact revisions must be full SHAs');
}

function getApprovedChange(options, artifact, name) {
  const allowlist = options?.outputHashAllowlist;
  const fromOptions = allowlist?.get ? allowlist.get(name) : allowlist?.[name];
  if (fromOptions) return fromOptions;
  const found = artifact.approvedOutputChanges?.find?.(
    (entry) => (entry.name ?? entry[0]) === name
  );
  if (!found) return null;
  return found.base ? found : found[1];
}

function checkBlockOutputHashes(
  validatedObservations,
  corpusNames,
  options,
  artifact,
  approvedOutputChanges
) {
  const baseHashes = validatedObservations.baseline?.outputHashes;
  const candidateHashes = validatedObservations.candidate?.outputHashes;
  if (!baseHashes || !candidateHashes) return false;
  let failure = false;
  for (const name of corpusNames) {
    if (baseHashes[name] !== candidateHashes[name]) {
      const approved = getApprovedChange(options, artifact, name);
      if (
        approved &&
        approved.base === baseHashes[name] &&
        approved.candidate === candidateHashes[name]
      ) {
        approvedOutputChanges.set(name, {
          base: baseHashes[name],
          candidate: candidateHashes[name],
        });
      } else {
        failure = true;
      }
    }
  }
  return failure;
}

function validateArtifactHashes(artifact, observed, hasObservations) {
  if (
    hasObservations
      ? !SHA256.test(artifact.corpusHash)
      : artifact.corpusHash !== null
  )
    throw new TypeError(
      `comparison artifact corpusHash must be ${hasObservations ? 'SHA-256' : 'null without observations'}`
    );
  for (const field of ['sourceTreeHash', 'lockfileHash']) {
    if (
      !artifact[field] ||
      typeof artifact[field] !== 'object' ||
      SIDES.some((side) =>
        observed[side]
          ? !SHA256.test(artifact[field][side])
          : artifact[field][side] !== null
      )
    )
      throw new TypeError(`comparison artifact ${field} is incomplete`);
  }
  if (
    !artifact.dirty ||
    typeof artifact.dirty !== 'object' ||
    SIDES.some((side) =>
      observed[side]
        ? typeof artifact.dirty[side] !== 'boolean'
        : artifact.dirty[side] !== null
    )
  )
    throw new TypeError('comparison artifact dirty metadata is incomplete');
  if (
    hasObservations
      ? !SHA256.test(artifact.benchmarkHarnessHash)
      : artifact.benchmarkHarnessHash !== null
  )
    throw new TypeError(
      `comparison benchmarkHarnessHash must be ${hasObservations ? 'SHA-256' : 'null without observations'}`
    );
}

function validateSideProvenances(artifact, observed) {
  if (!artifact.provenance || typeof artifact.provenance !== 'object')
    throw new TypeError('comparison artifact provenance is required');
  for (const side of SIDES) {
    const provenance = artifact.provenance[side];
    if (!observed[side]) {
      if (provenance !== null)
        throw new TypeError(
          `comparison ${side} provenance must be null without a successful observation`
        );
      continue;
    }
    validateProvenance(provenance, {
      corpusHash: artifact.corpusHash,
    });
    if (provenance.gitRevision !== artifact.gitRevision[side])
      throw new Error(`comparison ${side} revision disagrees with provenance`);
    for (const block of artifact.blocks) {
      const wrapper = block.observations?.[side];
      if (block.exitStatus[side] === 0)
        assertProvenanceInvariant(
          wrapper.provenance,
          provenance,
          `${side} observation in block ${block.blockId}`
        );
    }
    if (
      artifact.sourceTreeHash[side] !== provenance.sourceTreeHash ||
      artifact.lockfileHash[side] !== provenance.lockfileHash ||
      artifact.dirty[side] !== provenance.dirty
    )
      throw new Error(`comparison ${side} top-level provenance disagrees`);
    if (artifact.benchmarkHarnessHash !== provenance.benchmarkHarnessHash)
      throw new Error('comparison harness hash disagrees with provenance');
  }
}

function validateBlock(block, index, expectedScheduled) {
  validateBlockMetadata(block);
  if (block.blockId !== index + 1)
    throw new Error('comparison blocks must be ordered');
  if (![true, false].includes(block.structuralValidity))
    throw new TypeError(
      `comparison block ${block.blockId} validity metadata is invalid`
    );
  if (
    JSON.stringify(block.processOrder) !==
    JSON.stringify(expectedScheduled.processOrder)
  )
    throw new Error(
      `comparison block ${block.blockId} process order differs from schedule`
    );
}

function validateBlockSideObservation(
  block,
  side,
  artifact,
  configuration,
  corpusNames,
  observed
) {
  const wrapper = block.observations?.[side];
  if (block.exitStatus[side] !== 0 && wrapper === undefined) return null;
  if (
    block.exitStatus[side] !== 0 &&
    wrapper &&
    !wrapper.provenance &&
    !wrapper.run
  ) {
    return null;
  }
  if (wrapper === undefined) {
    throw new TypeError(
      `comparison block ${block.blockId} ${side} observation is required`
    );
  }
  const observation = validateObservation(wrapper, block, side);
  assertConfigurationInvariant(wrapper, configuration, `${side} observation`);
  if (observation) {
    observed[side] = observed[side] || block.exitStatus[side] === 0;
    const names = Object.keys(observation.perFileSamples).toSorted();
    if (!corpusNames.size) {
      for (const name of names) corpusNames.add(name);
    } else if (
      JSON.stringify(names) !== JSON.stringify([...corpusNames].toSorted())
    ) {
      throw new Error(
        `comparison ${side} observation corpus differs between blocks`
      );
    }
    if (wrapper.provenance.gitRevision !== artifact.gitRevision[side]) {
      throw new Error(
        `block ${block.blockId} ${side} revision disagrees with artifact`
      );
    }
  }
  return observation;
}

// The only v3 validation entry point. It validates raw evidence before any
// derived statistic can be calculated.
export function validateComparisonArtifact(artifact, options = {}) {
  const configuration = validateConfiguration(artifact?.configuration);
  validateArtifactBasicMetadata(artifact, configuration);
  const expectedSchedule = validateSchedule(artifact);
  const approvedOutputChanges = new Map();
  const observed = Object.fromEntries(SIDES.map((side) => [side, false]));
  const corpusNames = new Set();
  let structuralFailure = false;
  for (const [index, block] of artifact.blocks.entries()) {
    validateBlock(block, index, expectedSchedule[index]);
    const validatedObservations = {};
    for (const side of SIDES) {
      const observation = validateBlockSideObservation(
        block,
        side,
        artifact,
        configuration,
        corpusNames,
        observed
      );
      if (observation) validatedObservations[side] = observation;
    }
    if (
      block.structuralValidity === false ||
      SIDES.some((side) => block.exitStatus[side] !== 0) ||
      checkBlockOutputHashes(
        validatedObservations,
        corpusNames,
        options,
        artifact,
        approvedOutputChanges
      )
    ) {
      structuralFailure = true;
    }
  }
  const hasObservations = SIDES.some((side) => observed[side]);
  validateArtifactHashes(artifact, observed, hasObservations);
  validateSideProvenances(artifact, observed);
  return {
    configuration,
    structuralFailure,
    approvedOutputChanges: [...approvedOutputChanges.entries()],
  };
}

export const HASH = 'a'.repeat(64);
const REVISION = '0123456789abcdef0123456789abcdef01234567';
export const BASE_REVISION = '1'.repeat(40);
export const CANDIDATE_REVISION = '2'.repeat(40);

export function mockProvenance(revision = REVISION) {
  return {
    createdAt: new Date(0).toISOString(),
    command: ['node'],
    gitRevision: revision,
    benchmarkHarnessHash: HASH,
    benchmarkConfigHash: HASH,
    sourceTreeHash: HASH,
    lockfileHash: HASH,
    corpusHash: HASH,
    dirty: false,
    dirtyPaths: [],
    node: 'v24.0.0',
    v8: '13.0',
    platform: 'linux',
    arch: 'x64',
    osRelease: 'test',
    cpu: 'test',
    cpuCount: 1,
    governor: null,
    pinnedCore: null,
  };
}

export function comparisonProvenance({
  baseRevision = BASE_REVISION,
  candidateRevision = CANDIDATE_REVISION,
} = {}) {
  return {
    createdAt: new Date(0).toISOString(),
    command: ['node'],
    gitRevision: { baseline: baseRevision, candidate: candidateRevision },
    benchmarkHarnessHash: HASH,
    corpusHash: HASH,
    sourceTreeHash: { baseline: HASH, candidate: HASH },
    lockfileHash: { baseline: HASH, candidate: HASH },
    dirty: { baseline: false, candidate: false },
    provenance: {
      baseline: mockProvenance(baseRevision),
      candidate: mockProvenance(candidateRevision),
    },
  };
}

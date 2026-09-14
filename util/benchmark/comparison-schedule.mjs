export const BASELINE = 'baseline';
export const CANDIDATE = 'candidate';

function seedNumber(seed) {
  let state = 2166136261;
  for (const character of seed) {
    state = (state + character.codePointAt(0) * 16777619) % 4294967296;
  }
  return state || 1;
}

/**
 * Create a reproducible balanced order. The hash only chooses the member of
 * each adjacent pair. Results are deliberately not an input: scheduling is
 * fixed before the first process is started.
 */
export function createComparisonSchedule(blockCount, seed) {
  if (!Number.isInteger(blockCount) || blockCount < 1) {
    throw new RangeError('comparison block count must be a positive integer');
  }
  if (typeof seed !== 'string' || !seed) {
    throw new TypeError('comparison schedule seed must be a non-empty string');
  }
  const first = seedNumber(seed) % 2 === 0 ? BASELINE : CANDIDATE;
  const alternate = first === BASELINE ? CANDIDATE : BASELINE;
  return Array.from({ length: blockCount }, (_, index) => {
    const blockId = index + 1;
    const order = index % 2 === 0 ? first : alternate;
    return {
      blockId,
      processOrder:
        order === BASELINE ? [BASELINE, CANDIDATE] : [CANDIDATE, BASELINE],
    };
  });
}

export function scheduleBalance(schedule) {
  const counts = { baselineFirst: 0, candidateFirst: 0 };
  for (const block of schedule) {
    if (block.processOrder?.[0] === BASELINE) counts.baselineFirst++;
    else if (block.processOrder?.[0] === CANDIDATE) counts.candidateFirst++;
    else throw new Error(`invalid process order for block ${block.blockId}`);
  }
  return counts;
}

const BASELINE = 'baseline';
const CANDIDATE = 'candidate';

function seedNumber(seed) {
  let state = 2166136261;
  for (const character of seed) {
    state = (state + character.codePointAt(0) * 16777619) % 4294967296;
  }
  return state || 1;
}

function pairIsBaselineFirst(seed, pairIndex) {
  let state = seedNumber(seed);
  for (let i = 0; i < pairIndex; i++) {
    state = (state * 1664525 + 1013904223) % 4294967296;
  }
  return state % 2 === 0;
}

/**
 * Create a reproducible balanced order with block-pair randomization.
 * Each 2-block pair contains one baseline-first block and one candidate-first
 * block. Randomizing which order executes first within each pair removes the
 * deterministic ABBABAAB pattern and reduces structural carryover.
 */
export function createComparisonSchedule(blockCount, seed) {
  if (!Number.isInteger(blockCount) || blockCount < 1) {
    throw new RangeError('comparison block count must be a positive integer');
  }
  if (typeof seed !== 'string' || !seed) {
    throw new TypeError('comparison schedule seed must be a non-empty string');
  }
  return Array.from({ length: blockCount }, (_, index) => {
    const blockId = index + 1;
    const pairIndex = Math.floor(index / 2);
    const baselineFirst = pairIsBaselineFirst(seed, pairIndex);
    const pairFirst = baselineFirst ? BASELINE : CANDIDATE;
    const pairSecond = baselineFirst ? CANDIDATE : BASELINE;
    const order = index % 2 === 0 ? pairFirst : pairSecond;
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

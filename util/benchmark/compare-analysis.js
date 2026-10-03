import { median, standardDeviation } from './bench-stats.js';
import { fitCrossoverModel, studentTQuantile } from './bench-distributions.js';
import {
  ANALYZER_VERSION,
  INTERVAL_METHOD,
  SIDES,
  observationFor,
} from './compareObservationValidation.js';
import { validateComparisonArtifact } from './compareArtifactValidation.js';

function valuesFor(blocks, side, field) {
  return blocks.map((block) => {
    const values = field
      ? observationFor(block, side).perFileSamples[field]
      : observationFor(block, side).totalSamples;
    if (!Array.isArray(values) || !values.length)
      throw new TypeError(
        `missing raw samples for ${side} ${field ?? 'TOTAL'}`
      );
    return median(values);
  });
}

function directionForInterval(interval) {
  if (interval.high < 1) return 'faster';
  if (interval.low > 1) return 'slower';
  return 'inconclusive';
}

function practicalForInterval(interval, lowerMargin, upperMargin) {
  if (interval.low >= lowerMargin && interval.high <= upperMargin)
    return 'within-margin';
  if (interval.high < lowerMargin || interval.low > upperMargin)
    return 'outside-margin';
  return 'inconclusive';
}

function endpointAnalysis(blocks, configuration, endpoint = null) {
  const logs = blocks.map((block) =>
    Math.log(
      valuesFor([block], 'candidate', endpoint)[0] /
        valuesFor([block], 'baseline', endpoint)[0]
    )
  );
  const baselineFirst = blocks.flatMap((block, index) =>
    block.processOrder[0] === 'baseline' ? [logs[index]] : []
  );
  const candidateFirst = blocks.flatMap((block, index) =>
    block.processOrder[0] === 'candidate' ? [logs[index]] : []
  );
  if (!baselineFirst.length || !candidateFirst.length)
    throw new Error('comparison must contain both process-order strata');
  const model = fitCrossoverModel({
    baselineFirstLogs: baselineFirst,
    candidateFirstLogs: candidateFirst,
    superiorityConfidenceLevel: configuration.superiorityConfidenceLevel,
    equivalenceConfidenceLevel: configuration.equivalenceConfidenceLevel,
    orderInteractionThreshold: configuration.orderInteractionThreshold,
  });
  const baseValues = valuesFor(blocks, 'baseline', endpoint);
  const candidateValues = valuesFor(blocks, 'candidate', endpoint);
  const logRatio = model.treatmentEffect;
  const ratio = Math.exp(logRatio);
  return {
    endpoint: endpoint ?? 'TOTAL',
    exploratory: endpoint !== null,
    baseMedianMs: median(baseValues),
    candidateMedianMs: median(candidateValues),
    ratio,
    medianDeltaPct: (ratio - 1) * 100,
    logRatio,
    confidenceInterval: model.confidenceInterval,
    equivalenceConfidenceInterval: model.equivalenceConfidenceInterval,
    confidenceIntervalPct: {
      low: (model.confidenceInterval.low - 1) * 100,
      high: (model.confidenceInterval.high - 1) * 100,
    },
    confidenceIntervalWidth:
      model.confidenceInterval.high - model.confidenceInterval.low,
    stratumEstimates: model.stratumEstimates,
    orderInteraction: model.orderEffect,
    orderConfidenceInterval: model.orderConfidenceInterval,
    orderIsStable: model.orderIsStable,
    residualStandardDeviation: model.residualStandardDeviation,
    degreesOfFreedom: model.degreesOfFreedom,
    runtimeNonRegressionExceeded:
      model.confidenceInterval.low > configuration.runtimeNonRegressionMargin,
    statisticalDirection: directionForInterval(model.confidenceInterval),
    practicalConclusion: practicalForInterval(
      model.equivalenceConfidenceInterval,
      1 / configuration.practicalEquivalenceMargin,
      configuration.practicalEquivalenceMargin
    ),
  };
}

// Precision is a property of the interval, not of the requested block count:
// adaptive scheduling stops once the interval is tight enough.
function precisionAchievedFor(total, configuration) {
  return total.confidenceIntervalWidth <= configuration.precisionTarget;
}

function overallVerdictFor(total, substantive) {
  if (!substantive) return 'inconclusive';
  if (
    total.statisticalDirection === 'slower' &&
    total.runtimeNonRegressionExceeded
  )
    return 'regression';
  if (total.statisticalDirection === 'faster') return 'improvement';
  return 'inconclusive';
}

function structuralFailureResult(configuration, approvedOutputChanges) {
  return {
    schemaVersion: 3,
    analyzerVersion: ANALYZER_VERSION,
    analysisClass: 'v3-analysis',
    intervalMethod: configuration.intervalMethod ?? INTERVAL_METHOD,
    configuration,
    total: null,
    rows: [],
    precision: null,
    precisionConclusion: 'not-achieved',
    verdictBasis: {
      direction: 'inconclusive',
      precision: 'not-achieved',
      order: 'unknown',
      blocks: 'unknown',
    },
    overallVerdict: 'inconclusive',
    structuralFailure: true,
    inconclusiveReason: 'correctness or process failure',
    approvedOutputChanges,
  };
}

function calculatePrecision(total, blocks, configuration) {
  const totalLogRatios = blocks.map((block) =>
    Math.log(
      valuesFor([block], 'candidate')[0] / valuesFor([block], 'baseline')[0]
    )
  );
  const observedLogRatioSd = standardDeviation(totalLogRatios);
  const ratioHat = total.ratio;
  const deltaLog = 0.5 * Math.log(1 + configuration.precisionTarget / ratioHat);
  const tAlpha = studentTQuantile(
    1 - (1 - configuration.superiorityConfidenceLevel) / 2,
    total.degreesOfFreedom
  );
  const estimatedBlocksNeeded =
    deltaLog > 0 && total.residualStandardDeviation > 0
      ? Math.max(
          1,
          Math.ceil(
            ((tAlpha * total.residualStandardDeviation) / deltaLog) ** 2
          )
        )
      : 1;
  return {
    observedLogRatioSd,
    residualStandardDeviation: total.residualStandardDeviation,
    confidenceIntervalWidth: total.confidenceIntervalWidth,
    estimatedBlocksNeeded,
    minimumBlocks: configuration.minimumBlocks,
    requestedBlocks: configuration.requestedBlocks,
    precisionTarget: configuration.precisionTarget,
    precisionAchieved: precisionAchievedFor(total, configuration),
  };
}

function analyzePerFileRows(blocks, configuration) {
  const names = new Set();
  for (const block of blocks)
    for (const side of SIDES)
      for (const name of Object.keys(
        observationFor(block, side).perFileSamples
      ))
        names.add(name);
  const rows = [];
  for (const name of names)
    if (
      blocks.every((block) =>
        SIDES.every(
          (side) =>
            Array.isArray(observationFor(block, side).perFileSamples[name]) &&
            observationFor(block, side).perFileSamples[name].length
        )
      )
    )
      rows.push(endpointAnalysis(blocks, configuration, name));
  return rows;
}

export function analyzeComparison(artifact, options = {}) {
  const { configuration, structuralFailure, approvedOutputChanges } =
    validateComparisonArtifact(artifact, options);
  if (structuralFailure)
    return structuralFailureResult(configuration, approvedOutputChanges);
  const blocks = artifact.blocks;
  const firstOrders = blocks.map((block) => block.processOrder[0]);
  if (
    Math.abs(
      firstOrders.filter((side) => side === 'baseline').length -
        firstOrders.filter((side) => side === 'candidate').length
    ) > 1
  )
    throw new Error('comparison process order is not balanced');
  const total = endpointAnalysis(blocks, configuration);
  const precision = calculatePrecision(total, blocks, configuration);
  const enoughBlocks = blocks.length >= configuration.minimumBlocks;
  const orderIsStable = total.orderIsStable;
  const substantive =
    enoughBlocks && precision.precisionAchieved && orderIsStable;
  // The verdict taxonomy separates signal (direction) from readiness
  // (precision, blocks, order) so a precise "faster" is never called noise.
  const verdictBasis = {
    direction: total.statisticalDirection,
    precision: precision.precisionAchieved ? 'achieved' : 'not-achieved',
    order: orderIsStable ? 'stable' : 'interaction',
    blocks: enoughBlocks ? 'sufficient' : 'insufficient',
  };
  const rows = analyzePerFileRows(blocks, configuration);
  const result = {
    schemaVersion: 3,
    analyzerVersion: ANALYZER_VERSION,
    analysisClass: 'v3-analysis',
    intervalMethod: configuration.intervalMethod ?? INTERVAL_METHOD,
    configuration,
    total: {
      ...total,
      minimumBlocks: configuration.minimumBlocks,
      requestedBlocks: configuration.requestedBlocks,
      precisionTarget: configuration.precisionTarget,
    },
    rows,
    precision,
    structuralFailure: false,
    precisionConclusion: precision.precisionAchieved
      ? 'achieved'
      : 'not-achieved',
    verdictBasis,
    overallVerdict: overallVerdictFor(total, substantive),
    orderInteractionThreshold: configuration.orderInteractionThreshold,
    approvedOutputChanges,
  };
  if (!enoughBlocks) result.inconclusiveReason = 'fewer than minimumBlocks';
  else if (!precision.precisionAchieved)
    result.inconclusiveReason = 'requested precision was not achieved';
  else if (!orderIsStable)
    result.inconclusiveReason = 'process-order interaction cannot be ruled out';
  return result;
}

// Unvalidated interim view of the TOTAL endpoint, used by adaptive scheduling
// to decide whether further blocks can still change the conclusion.
export function interimTotalAnalysis(blocks, configuration) {
  if (
    !Array.isArray(blocks) ||
    blocks.length < 2 ||
    !blocks.every(
      (block) => block.observations?.baseline && block.observations?.candidate
    )
  ) {
    return null;
  }
  try {
    return endpointAnalysis(blocks, configuration);
  } catch {
    // An incomplete or unbalanced interim schedule carries no precision signal.
    return null;
  }
}

export { validateComparisonArtifact } from './compareArtifactValidation.js';

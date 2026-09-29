function fmtMs(ms) {
  return ms.toFixed(2).padStart(9) + ' ms';
}

function fmtPct(pct) {
  if (!Number.isFinite(pct)) return (pct < 0 ? '-' : '+') + 'inf%';
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function fmtRSS(rss) {
  return rss.toLocaleString();
}

function directionFor(value) {
  return value?.statisticalDirection ?? value?.verdict ?? 'inconclusive';
}

function practicalFor(value) {
  return value?.practicalConclusion ?? 'exploratory';
}

function overallFor(value) {
  return value?.overallVerdict ?? value?.verdict ?? 'inconclusive';
}

function nameFor(value) {
  return value?.name ?? value?.endpoint ?? 'TOTAL';
}

// The verdict taxonomy separates the observed signal (direction) from the
// readiness criteria (precision, blocks, order) so "inconclusive" never
// reads as "no signal".
export function verdictBasisLines(result) {
  const basis = result.verdictBasis;
  if (!basis) return [];
  const lines = [
    `direction: ${basis.direction}`,
    `precision: ${basis.precision}`,
    `order: ${basis.order}`,
    `blocks: ${basis.blocks}`,
  ];
  if (result.inconclusiveReason)
    lines.push(`reason: ${result.inconclusiveReason}`);
  return lines;
}

export function printComparison(result) {
  const {
    base,
    candidate,
    rows,
    total,
    maxRSS,
    warning,
    approvedOutputChanges,
  } = result;
  console.log(`baseline:  ${base.label} (${base.path})`);
  console.log(`candidate: ${candidate.label} (${candidate.path})`);
  console.log();
  if (!total) {
    console.error(
      `structural failure: ${result.inconclusiveReason ?? 'no performance analysis is available'}`
    );
    return;
  }
  if (maxRSS) {
    console.log(
      `process max RSS (independent-run diagnostic): ${fmtRSS(maxRSS.baseMedian)} -> ${fmtRSS(maxRSS.candidateMedian)} (${fmtPct(maxRSS.medianDeltaPct)})`
    );
    console.log();
  }
  console.log(
    'framework'.padEnd(28) +
      'base median'.padStart(14) +
      'cand median'.padStart(14) +
      'delta'.padStart(10) +
      'direction'.padStart(16)
  );
  console.log('-'.repeat(82));
  for (const row of rows) {
    console.log(
      nameFor(row).padEnd(28) +
        fmtMs(row.baseMedianMs) +
        fmtMs(row.candidateMedianMs) +
        fmtPct(row.medianDeltaPct).padStart(10) +
        directionFor(row).padStart(16)
    );
  }
  console.log('-'.repeat(82));
  console.log(
    'TOTAL'.padEnd(28) +
      fmtMs(total.baseMedianMs) +
      fmtMs(total.candidateMedianMs) +
      fmtPct(total.medianDeltaPct).padStart(10) +
      directionFor(total).padStart(16)
  );
  const marginPct = result.configuration?.practicalEquivalenceMargin
    ? `${Math.round((result.configuration.practicalEquivalenceMargin - 1) * 100)}%`
    : '10%';
  const marginLabel = `${marginPct} margin`;

  if (total.confidenceIntervalPct) {
    console.log(
      `superiority CI: ${fmtPct(total.confidenceIntervalPct.low)} to ${fmtPct(total.confidenceIntervalPct.high)}`
    );
    if (total.equivalenceConfidenceInterval) {
      console.log(
        `equivalence CI: ${total.equivalenceConfidenceInterval.low.toFixed(3)} to ${total.equivalenceConfidenceInterval.high.toFixed(3)} ` +
          `(within the declared ${marginLabel}: ${practicalFor(total)})`
      );
    }
    console.log(`Statistical Direction: ${directionFor(total)}`);
    console.log(`Practical Tolerance (${marginLabel}): ${practicalFor(total)}`);
    console.log(`Actionable Verdict: ${overallFor(result)}`);
    for (const line of verdictBasisLines(result)) console.log(`  ${line}`);
    if (
      directionFor(total) === 'slower' &&
      practicalFor(total) === 'within-margin'
    ) {
      console.log(
        'Note: Slowdown observed but confirmed within the accepted 10% non-regression margin; no gating action required.'
      );
    }
  }
  if (result.precision) {
    console.log(
      `precision: width=${result.precision.confidenceIntervalWidth.toFixed(3)}, ` +
        `target=${result.precision.precisionTarget}, ` +
        `blocks=${result.blocks?.length ?? 'unknown'}/${result.precision.requestedBlocks}, ` +
        `achieved=${result.precision.precisionAchieved}`
    );
  }
  if (warning) console.warn(`warning: ${warning}`);
  for (const [name, hashes] of approvedOutputChanges ?? []) {
    console.warn(
      `approved output change for ${name}: ${hashes.base} -> ${hashes.candidate}`
    );
  }
}

function markdownRow(row) {
  const interval = `${fmtPct(row.confidenceIntervalPct.low)} to ${fmtPct(row.confidenceIntervalPct.high)}`;
  const equivalence = row.equivalenceConfidenceInterval
    ? `${row.equivalenceConfidenceInterval.low.toFixed(3)} to ${row.equivalenceConfidenceInterval.high.toFixed(3)}`
    : 'exploratory';
  return `| ${nameFor(row)} | ${row.baseMedianMs.toFixed(2)} ms | ${row.candidateMedianMs.toFixed(2)} ms | ${fmtPct(row.medianDeltaPct)} | ${interval} | ${equivalence} | ${directionFor(row)} | ${practicalFor(row)} |`;
}

function equivalenceText(value) {
  return value
    ? `${value.low.toFixed(3)} to ${value.high.toFixed(3)}`
    : 'unavailable';
}

export function markdownComparison(result) {
  const {
    base,
    candidate,
    rows,
    total,
    maxRSS,
    warning,
    approvedOutputChanges,
  } = result;
  const marginPct = result.configuration?.practicalEquivalenceMargin
    ? `${Math.round((result.configuration.practicalEquivalenceMargin - 1) * 100)}%`
    : '10%';
  const marginLabel = `${marginPct} margin`;
  const lines = [
    '## cssnano performance comparison',
    '',
    `- Preset: \`${base.preset}\``,
    `- Target: \`${base.target}\``,
    `- Corpus manifest: \`${base.corpusManifest}\``,
    `- Seed: \`${base.seed ?? base.configuration?.bootstrapSeed ?? 'unknown'}\``,
    `- Baseline: \`${base.label}\` (${base.gitRevision ?? 'unknown revision'})`,
    `- Candidate: \`${candidate.label}\` (${candidate.gitRevision ?? 'unknown revision'})`,
    ...(maxRSS
      ? [
          `- Median process max RSS: ${fmtRSS(maxRSS.baseMedian)} -> ${fmtRSS(maxRSS.candidateMedian)} (${fmtPct(maxRSS.medianDeltaPct)})`,
        ]
      : []),
    '',
  ];
  if (!total) {
    lines.push(
      `> Structural failure: ${result.inconclusiveReason ?? 'no performance analysis is available'}`,
      ''
    );
    return lines.join('\n');
  }
  lines.push(
    '| Corpus entry | Base median | Candidate median | Median delta | 95% superiority CI | 90% equivalence CI | Statistical direction | Practical conclusion |',
    '| --- | ---: | ---: | ---: | --- | --- | --- | --- |',
    ...rows.map(markdownRow),
    `| **TOTAL** | **${total.baseMedianMs.toFixed(2)} ms** | **${total.candidateMedianMs.toFixed(2)} ms** | **${fmtPct(total.medianDeltaPct)}** | **${fmtPct(total.confidenceIntervalPct.low)} to ${fmtPct(total.confidenceIntervalPct.high)}** | **${equivalenceText(total.equivalenceConfidenceInterval)}** | **${directionFor(total)}** | **${practicalFor(total)}** |`,
    '',
    `- Statistical Direction: **${directionFor(total)}**`,
    `- Practical Tolerance (${marginLabel}): **${practicalFor(total)}**`,
    `- Actionable Verdict: **${overallFor(result)}**`,
    ...verdictBasisLines(result).map((line) => `  - ${line}`),
    ''
  );
  if (
    directionFor(total) === 'slower' &&
    practicalFor(total) === 'within-margin'
  ) {
    lines.push(
      '> Note: Slowdown observed but confirmed within the accepted 10% non-regression margin; no gating action required.',
      ''
    );
  }
  if (warning) lines.push(`> Warning: ${warning}`, '');
  for (const [name, hashes] of approvedOutputChanges ?? []) {
    lines.push(
      `> Approved output change for \`${name}\`: \`${hashes.base}\` -> \`${hashes.candidate}\``,
      ''
    );
  }
  return lines.join('\n');
}

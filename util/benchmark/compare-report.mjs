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
  if (maxRSS) {
    console.log(
      `max RSS: ${fmtRSS(maxRSS.baseMedian)} -> ${fmtRSS(maxRSS.candidateMedian)} (${fmtPct(maxRSS.medianDeltaPct)})`
    );
    console.log();
  }
  console.log(
    'framework'.padEnd(28) +
      'base median'.padStart(14) +
      'cand median'.padStart(14) +
      'delta'.padStart(10) +
      'verdict'.padStart(16)
  );
  console.log('-'.repeat(82));
  for (const row of rows) {
    console.log(
      row.name.padEnd(28) +
        fmtMs(row.baseMedianMs) +
        fmtMs(row.candidateMedianMs) +
        fmtPct(row.medianDeltaPct).padStart(10) +
        row.verdict.padStart(16)
    );
  }
  console.log('-'.repeat(82));
  console.log(
    'TOTAL'.padEnd(28) +
      fmtMs(total.baseMedianMs) +
      fmtMs(total.candidateMedianMs) +
      fmtPct(total.medianDeltaPct).padStart(10) +
      total.verdict.padStart(16)
  );
  console.log(
    `95% bootstrap CI: ${fmtPct(total.confidenceIntervalPct.low)} to ${fmtPct(total.confidenceIntervalPct.high)}; ` +
      `replicates=${total.replicateCount}, spread=${fmtPct(total.spreadPct)}`
  );
  if (warning) console.warn(`warning: ${warning}`);
  for (const [name, hashes] of approvedOutputChanges ?? []) {
    console.warn(
      `approved output change for ${name}: ${hashes.base} -> ${hashes.candidate}`
    );
  }
}

function markdownRow(row) {
  const interval = `${fmtPct(row.confidenceIntervalPct.low)} to ${fmtPct(row.confidenceIntervalPct.high)}`;
  return `| ${row.name} | ${row.baseMedianMs.toFixed(2)} ms | ${row.candidateMedianMs.toFixed(2)} ms | ${fmtPct(row.medianDeltaPct)} | ${interval} | ${row.replicateCount} | ${row.verdict} |`;
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
  const lines = [
    '## cssnano performance comparison',
    '',
    `- Preset: \`${base.preset}\``,
    `- Target: \`${base.target}\``,
    `- Corpus manifest: \`${base.corpusManifest}\``,
    `- Seed: \`${base.seed ?? 'legacy/unknown'}\``,
    `- Baseline: \`${base.label}\` (${base.gitRevision ?? 'unknown revision'})`,
    `- Candidate: \`${candidate.label}\` (${candidate.gitRevision ?? 'unknown revision'})`,
    ...(maxRSS
      ? [
          `- Median max RSS: ${fmtRSS(maxRSS.baseMedian)} -> ${fmtRSS(maxRSS.candidateMedian)} (${fmtPct(maxRSS.medianDeltaPct)})`,
        ]
      : []),
    '',
    '| Corpus entry | Base median | Candidate median | Median delta | 95% CI | Replicates | Verdict |',
    '| --- | ---: | ---: | ---: | --- | ---: | --- |',
    ...rows.map(markdownRow),
    `| **TOTAL** | **${total.baseMedianMs.toFixed(2)} ms** | **${total.candidateMedianMs.toFixed(2)} ms** | **${fmtPct(total.medianDeltaPct)}** | **${fmtPct(total.confidenceIntervalPct.low)} to ${fmtPct(total.confidenceIntervalPct.high)}** | **${total.replicateCount}** | **${total.verdict}** |`,
    '',
  ];
  if (warning) lines.push(`> Warning: ${warning}`, '');
  for (const [name, hashes] of approvedOutputChanges ?? []) {
    lines.push(
      `> Approved output change for \`${name}\`: \`${hashes.base}\` -> \`${hashes.candidate}\``,
      ''
    );
  }
  return lines.join('\n');
}

const VALUE_OPTIONS = new Set([
  '--case',
  '--compare',
  '--output',
  '--markdown',
]);

export function parseCounterArgs(args) {
  const optionValueIndexes = new Set();
  for (let i = 0; i < args.length; i++) {
    if (VALUE_OPTIONS.has(args[i])) optionValueIndexes.add(i + 1);
  }
  const positional = args.filter(
    (arg, index) => !arg.startsWith('--') && !optionValueIndexes.has(index)
  );
  const value = (name, length) =>
    args.find((arg) => arg.startsWith(`${name}=`))?.slice(length) ??
    (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

  return {
    positional,
    argCase: value('--case', 7),
    argCompare: value('--compare', 10),
    argOutput: value('--output', 9),
    argMarkdown: value('--markdown', 11),
  };
}

export function validateComparisonCorpus(base, cand) {
  const baseNames = base.files.map(({ name }) => name).toSorted();
  const candidateNames = cand.files.map(({ name }) => name).toSorted();
  if (JSON.stringify(baseNames) !== JSON.stringify(candidateNames)) {
    const baseSet = new Set(baseNames);
    const candidateSet = new Set(candidateNames);
    throw new Error(
      'incompatible reports: corpus entries differ ' +
        `(baseline-only: ${baseNames.filter((name) => !candidateSet.has(name)).join(', ') || 'none'}; ` +
        `candidate-only: ${candidateNames.filter((name) => !baseSet.has(name)).join(', ') || 'none'})`
    );
  }

  if (base.corpusManifest !== undefined || cand.corpusManifest !== undefined) {
    if (
      typeof base.corpusManifest !== 'string' ||
      typeof cand.corpusManifest !== 'string' ||
      base.corpusManifest !== cand.corpusManifest
    ) {
      throw new Error(
        `incompatible reports: corpusManifest differs (${base.corpusManifest ?? 'missing'} vs ${cand.corpusManifest ?? 'missing'})`
      );
    }
  }
}

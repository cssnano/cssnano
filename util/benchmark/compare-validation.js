export function parseAllowOutputHash(value, outputHashAllowlist) {
  const [name, base, candidate, extra] = value.split(',');
  if (!name || !base || !candidate || extra !== undefined) {
    throw new Error(
      '--allow-output-hash must be fixture,base-hash,candidate-hash'
    );
  }
  if (outputHashAllowlist.has(name)) {
    throw new Error(`duplicate output hash allowlist entry for "${name}"`);
  }
  outputHashAllowlist.set(name, { base, candidate });
}

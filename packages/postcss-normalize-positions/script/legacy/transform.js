// Development-only oracle. This deliberately uses a small, independent
// character scanner instead of importing the tokenizer implementation.
const horizontal = new Map([
  ['right', '100%'],
  ['left', '0'],
]);
const vertical = new Map([
  ['bottom', '100%'],
  ['top', '0'],
]);
const keywords = new Set(['top', 'right', 'bottom', 'left', 'center']);

function terms(value) {
  const result = [];
  let depth = 0;
  let start = 0;
  let quote = '';
  for (let i = 0; i <= value.length; i++) {
    const character = value[i];
    if (quote) {
      if (character === quote && value[i - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if ('(['.includes(character)) depth++;
    else if (')]'.includes(character)) depth--;
    if (
      i === value.length ||
      (depth === 0 && (character === ',' || character === '/'))
    ) {
      result.push([start, i, value.slice(start, i)]);
      if (character === ',' || character === '/')
        result.push([i, i + 1, character]);
      start = i + 1;
    }
  }
  return result;
}

/** @param {string} first @param {string | undefined} second @param {string} firstRaw @param {string} separator @param {string} fallback */
function normalizedPosition(first, second, firstRaw, separator, fallback) {
  if (!second && first === 'center') return '50%';
  if (!second && horizontal.has(first)) return horizontal.get(first);
  if (second === 'center')
    return (
      horizontal.get(first) ??
      vertical.get(first) ??
      (first === 'center' ? '50%' : firstRaw)
    );
  if (first === 'center' && horizontal.has(second))
    return horizontal.get(second);
  if (horizontal.has(first) && vertical.has(second))
    return horizontal.get(first) + separator + vertical.get(second);
  if (vertical.has(first) && horizontal.has(second))
    return horizontal.get(second) + separator + vertical.get(first);
  return fallback;
}

function normalizeLayer(layer) {
  const leading = layer.match(/^\s*/)?.[0] ?? '';
  const input = layer.slice(leading.length);
  if (/\b(?:var|env|constant)\s*\(/i.test(input)) return leading + input;
  const arbitraryCenter = input.match(/^(.*?)\s+center(\s|$)/i);
  if (arbitraryCenter && !keywords.has(arbitraryCenter[1].trim().toLowerCase()))
    return leading + arbitraryCenter[1].trimEnd() + arbitraryCenter[2];
  const match = input.match(
    /^(.*?)(\s+|^)(top|right|bottom|left|center)(?:\s+(center|top|right|bottom|left))?(.*)$/i
  );
  if (!match) return leading + input;
  const [, prefix, positionSeparator, firstRaw, secondRaw, suffix] = match;
  const first = firstRaw.toLowerCase();
  const second = secondRaw?.toLowerCase();
  const separator =
    input.match(
      /(?:center|top|right|bottom|left)(\s+)(?:center|top|right|bottom|left)/i
    )?.[1] ?? ' ';
  const replacement = normalizedPosition(
    first,
    second,
    firstRaw,
    separator,
    firstRaw + (secondRaw ? separator + secondRaw : '')
  );
  return replacement === firstRaw + (secondRaw ? separator + secondRaw : '')
    ? leading + input
    : `${leading}${prefix}${positionSeparator}${replacement}${suffix}`;
}

export function transform(value) {
  return terms(value)
    .map(([, , layer]) =>
      layer === ',' || layer === '/' ? layer : normalizeLayer(layer)
    )
    .join('');
}

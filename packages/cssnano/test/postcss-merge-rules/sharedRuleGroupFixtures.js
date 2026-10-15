// Rules with long selectors, where sharing declarations between two rules
// costs more selector bytes than it saves, so only a larger group pays.
const longSelector = (suffix) => `.${'x'.repeat(41)}_${suffix}`;
const sharedBackground =
  'background-position:50%;background-repeat:no-repeat;background-size:contain';
const withHeights = (suffixes) =>
  suffixes
    .map((s, i) => `${longSelector(s)}{${sharedBackground};height:${i + 2}vw}`)
    .join('');

const sharedPair =
  `${longSelector('a')}{${sharedBackground};height:2vw}` +
  `${longSelector('b')}{${sharedBackground};height:3vw}`;

const longerSelector = `.${'y'.repeat(70)}`;
const longestSelector = `.${'y'.repeat(80)}`;

export {
  longSelector,
  sharedBackground,
  withHeights,
  sharedPair,
  longerSelector,
  longestSelector,
};

/* <calc-sum> argument functions beyond the canonical math set; CSS Values 5
 * dropped media-progress() and container-progress(). */
const calcSumFunctions = new Set([
  // CSS Values 5 §6: weighted average and interpolation over <calc-sum>s.
  'calc-interpolate',
  'calc-mix',
  // CSS Values 5 §11, migrated from CSS Sizing 4: second argument is a <calc-sum>.
  'calc-size',
  // CSS Values 5 §10: every value argument is a <calc-sum>.
  'progress',
  // CSS Values 5: the min, max, and step arguments are <calc-sum>s.
  'random',
]);

export default calcSumFunctions;

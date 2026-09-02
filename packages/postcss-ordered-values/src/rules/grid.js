import joinGridValue from '../lib/joinGridValue.js';

/**
 * @param {import('../lib/tokenize.js').Term[]} gridAutoFlow
 * @return {string | null}
 */
const normalizeGridAutoFlow = (gridAutoFlow) => {
  const newValue = { front: '', back: '' };
  let shouldNormalize = false;
  for (const node of gridAutoFlow) {
    const value = node.raw;
    if (value === 'dense') {
      shouldNormalize = true;
      newValue.back = value;
    } else if (['row', 'column'].includes(value.trim().toLowerCase())) {
      shouldNormalize = true;
      newValue.front = value;
    } else {
      shouldNormalize = false;
    }
  }
  if (shouldNormalize) {
    return `${newValue.front.trim()} ${newValue.back.trim()}`;
  }
  return null;
};

/**
 * @param {import('../lib/tokenize.js').Term[]} gridGap
 * @return {string | null}
 */
const normalizeGridColumnRowGap = (gridGap) => {
  const newValue = { front: '', back: '' };
  let shouldNormalize = false;
  for (const node of gridGap) {
    // console.log(node);
    if (node.raw === 'normal') {
      shouldNormalize = true;
      newValue.front = node.raw;
    } else {
      newValue.back = `${newValue.back} ${node.raw}`;
    }
  }
  if (shouldNormalize) {
    return `${newValue.front.trim()} ${newValue.back.trim()}`;
  }
  return null;
};

/**
 * @param {import('../lib/tokenize.js').Term[]} grid
 * @return {string | string[]}
 */
const normalizeGridColumnRow = (grid) => {
  // cant do normalization here using node, so copy it as a string
  const gridValue = grid
    .map((term) => term.raw)
    .join(' ')
    .split('/');
  if (gridValue.length > 1) {
    return joinGridValue(
      gridValue.map((gridLine) => {
        const normalizeValue = {
          front: '',
          back: '',
        };
        const trimmedGridLine = gridLine.trim(); // '3 span ' -> '3 span'
        for (const node of trimmedGridLine.split(' ')) {
          // ['3','span']
          if (node === 'span') {
            normalizeValue.front = node; // span _
          } else {
            normalizeValue.back = `${normalizeValue.back} ${node}`; // _ 3
          }
        }
        return `${normalizeValue.front.trim()} ${normalizeValue.back.trim()}`; // span 3
      })
      // returns "2 / span 3"
    );
  }
  // doing this separating if `/` is not present as while joining('/') , it will add `/` at the end
  return gridValue.map((gridLine) => {
    const normalizeValue = {
      front: '',
      back: '',
    };
    const trimmedGridLine = gridLine.trim();
    for (const node of trimmedGridLine.split(' ')) {
      if (node === 'span') {
        normalizeValue.front = node;
      } else {
        normalizeValue.back = `${normalizeValue.back} ${node}`;
      }
    }
    return `${normalizeValue.front.trim()} ${normalizeValue.back.trim()}`;
  });
};

export {
  normalizeGridAutoFlow,
  normalizeGridColumnRowGap,
  normalizeGridColumnRow,
};

/** @param {string} value */
const minifyWeight = function (value) {
  const lowerCasedValue = value.toLowerCase();

  if (lowerCasedValue === 'normal') {
    return '400';
  } else {
    return lowerCasedValue === 'bold' ? '700' : value;
  }
};

export default minifyWeight;

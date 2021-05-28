/**
 * Returns the shortest string in array
 */
const getShortestString = (strings) => {
  let shortest = null;

  for (let string of strings) {
    if (shortest === null || string.length < shortest.length) {
      shortest = string;
    }
  }

  return shortest;
};

export default getShortestString;

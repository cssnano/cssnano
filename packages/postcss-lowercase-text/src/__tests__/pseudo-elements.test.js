import transformer from '../selector';
import pseudoElements from './data/pseudo-elements';

const caseSensitiveElements = [
  ':active',
  ':hover',
  ':focus',
  ':focus-within',
  ':visited',
];

const caseSensitiveElementSet = new Set(caseSensitiveElements);

describe('checking all  possible pseudo elements', () => {
  Object.keys(pseudoElements).forEach((pseudoElement) => {
    let input = pseudoElement.toUpperCase();
    if (caseSensitiveElementSet.has(pseudoElement)) {
      it(`it should not transform ${input} to lowercase`, (done) => {
        expect(input).toBe(transformer(input));
        done();
      });
    } else {
      it(`it should transform ${input} to lowercase`, (done) => {
        expect(pseudoElement).toBe(transformer(input));
        done();
      });
    }
  });
});

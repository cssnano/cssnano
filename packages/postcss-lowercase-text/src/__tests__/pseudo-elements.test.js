import transformer from '../selector';
import pseudoElements from './data/pseudo-elements';

describe('checking all  possible pseudo elements', () => {
  Object.keys(pseudoElements).forEach((pseudoElement) => {
    let input = pseudoElement.toUpperCase();

    it(`it should transform ${input} to lowercase`, (done) => {
      expect(pseudoElement).toBe(transformer(input));
      done();
    });
  });
});

import htmlTags from 'html-tags';
import voidHtmlTags from 'html-tags/void';
import transformer from '../selector';

const toCapitalised = (str) => str.charAt(0).toUpperCase() + str.slice(1);

describe('Checking all possible HTML Tags using html-tags', () => {
  htmlTags.forEach((htmlTag) => {
    let input = htmlTag.toUpperCase();
    let input2 = toCapitalised(htmlTag);
    it(`should transform ${input}, ${input2} to lowercase`, (done) => {
      expect(htmlTag).toBe(transformer(input));
      expect(htmlTag).toBe(transformer(input2));
      done();
    });
  });
  voidHtmlTags.forEach((voidHtmlTag) => {
    let input = voidHtmlTag.toUpperCase();
    let input2 = toCapitalised(voidHtmlTag);
    it(`should transform ${input}, ${input2} to lowercase`, (done) => {
      expect(voidHtmlTag).toBe(transformer(input));
      expect(voidHtmlTag).toBe(transformer(input2));
      done();
    });
  });
});

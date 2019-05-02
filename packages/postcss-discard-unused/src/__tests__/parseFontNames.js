import test from 'ava';
import parseFontNames from '../parseFontNames';

function fontFamily(t, value, expected) {
  t.deepEqual(parseFontNames({ prop: 'font-family', value }), expected);
}

function fontShorthand(t, value, expected) {
  t.deepEqual(parseFontNames({ prop: 'font', value }), expected);
}

test('should parse font-family', fontFamily, 'some font', ['some font']);

test('should convert font to lower case', fontFamily, 'SomE FOnt', [
  'some font',
]);

test(
  'should parse font-family with commas',
  fontFamily,
  'one font, two font,three font',
  ['one font', 'two font', 'three font']
);

test('should parse font-family with quotes', fontFamily, '"some font"', [
  'some font',
]);

test(
  'should parse font-family list with quotes',
  fontFamily,
  'one font, "two font"',
  ['one font', 'two font']
);

test(
  'should parse font-family with escaped spaces',
  fontFamily,
  'one\\ font, two\\ font',
  ['one font', 'two font']
);

test(
  'should parse font-family with weird characters',
  fontFamily,
  'normal font, "ൠ😳ฬ𝔢ＩяĎ 🐉💩👍"',
  ['normal font', 'ൠ😳ฬ𝔢ｉяď 🐉💩👍']
);

test(
  'should parse font shorthand',
  fontShorthand,
  'bold italic 10px somefont',
  ['somefont']
);

test(
  'should parse font shorthand with line-height',
  fontShorthand,
  '10px/1.4em somefont',
  ['somefont']
);

test(
  'should parse font shorthand with multiple fonts',
  fontShorthand,
  '10px fontone, fonttwo',
  ['fontone', 'fonttwo']
);

test(
  'should parse font shorthand with quotes',
  fontShorthand,
  '10px onefont, "two font", \'three font\'',
  ['onefont', 'two font', 'three font']
);

test(
  'should parse font shorthand with escaped spaces',
  fontShorthand,
  'bold 10px one\\ font, two\\ font\\ three',
  ['one font', 'two font three']
);

test(
  'should parse font shorthand with weird characters',
  fontShorthand,
  '10px "normal font", "ൠ😳ฬ𝔢ＩяĎ 🐉💩👍"',
  ['normal font', 'ൠ😳ฬ𝔢ｉяď 🐉💩👍']
);

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '@csstools/css-tokenizer';
import convertValues from '../../src/plugins/postcss-convert-values/index.js';
import normalizeString from '../../src/plugins/postcss-normalize-string/index.js';
import normalizeDisplayValues from '../../src/plugins/postcss-normalize-display-values/index.js';
import normalizeTimingFunctions from '../../src/plugins/postcss-normalize-timing-functions/index.js';
import colormin from '../../src/plugins/postcss-colormin/index.js';
import normalizeUrl from '../../src/plugins/postcss-normalize-url/index.js';
import reduceTransforms from '../../src/plugins/postcss-reduce-transforms/index.js';
import reduceInitial from '../../src/plugins/postcss-reduce-initial/index.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { ident, whitespace } from '../../src/values/tokenConstructors.js';

/** A buffer whose text() throws once armed, so a reducer that reads the text fails. */
class TextGuardBuffer extends ValueBuffer {
  armed = false;

  text() {
    if (this.armed) {
      throw new Error('the reducer read the text of an edited buffer');
    }
    return super.text();
  }
}

describe('Value reducers edit the buffer tokens in place', () => {
  test("convert-values edits the value buffer's tokens without a text edit", () => {
    const reduce = convertValues.create({}, ['defaults']).forProperty('margin');
    const buffer = new ValueBuffer('red 1.50em');
    const [kept] = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.text(), 'red 1.5em');
    assert.equal(buffer.tokens()[0], kept);
  });

  test("normalize-string edits the value buffer's tokens without a text edit", () => {
    const reduce = normalizeString.create({}).forProperty('content');
    const buffer = new ValueBuffer("red 'a'");
    const [kept] = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.text(), 'red "a"');
    assert.equal(buffer.tokens()[0], kept);
  });

  test("normalize-display-values edits the value buffer's tokens without a text edit", () => {
    const reduce = normalizeDisplayValues.create({}).forProperty('display');
    const buffer = new ValueBuffer('inline list-item');
    reduce(buffer, 0);
    assert.equal(buffer.isEdited(), true);
    assert.equal(buffer.text(), 'inline list-item');
    assert.deepEqual(
      buffer.tokens().map((token) => token[1]),
      ['inline', ' ', 'list-item']
    );
  });
});

describe('colormin edits the value buffer tokens in place', () => {
  test("colormin edits the value buffer's tokens without a text edit", () => {
    const reduce = colormin.create({}, ['defaults']).forProperty('color');
    const buffer = new ValueBuffer('1px #ff0000');
    const kept = buffer.tokens()[0];
    reduce(buffer, 0);
    assert.equal(buffer.text(), '1px red');
    assert.equal(buffer.tokens()[0], kept);
    assert.deepEqual(
      buffer.tokens().map((token) => [token[0], token[1]]),
      tokenize({ css: buffer.text() })
        .slice(0, -1)
        .map((token) => [token[0], token[1]])
    );
  });
});

describe('convert-values reads the text of an edited custom property only for a U+ start', () => {
  const customProperty = convertValues.create(
    { transformCustomProperties: true },
    ['defaults']
  );

  test('convert-values reads no text of an edited custom property without a U+ start', () => {
    const reduce = customProperty.forProperty('--gap');
    const buffer = new TextGuardBuffer('red 1.50px');
    buffer.replace(0, 1, [ident('blue')]);
    buffer.armed = true;
    reduce(buffer, 0);
    buffer.armed = false;
    assert.equal(buffer.text(), 'blue 1.5px');
  });

  test('convert-values keeps a U+ range in an edited custom property', () => {
    const reduce = customProperty.forProperty('--gap');
    const buffer = new ValueBuffer('u+1 1.50px');
    buffer.replace(2, 3, [whitespace()]);
    reduce(buffer, 0);
    assert.equal(buffer.text(), 'u+1 1.50px');
  });
});

describe('normalize-timing-functions edits the value buffer tokens in place', () => {
  test("normalize-timing-functions edits the value buffer's tokens without a text edit", () => {
    const reduce = normalizeTimingFunctions
      .create({})
      .forProperty('transition');
    const buffer = new ValueBuffer('1s cubic-bezier(0.25,0.1,0.25,1)');
    const [kept] = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.text(), '1s ease');
    assert.equal(buffer.tokens()[0], kept);
  });
});

describe('normalize-url edits the value buffer tokens in place', () => {
  test("normalize-url edits the value buffer's tokens without a text edit", () => {
    const reduce = normalizeUrl.create({}).forProperty('background');
    const buffer = new ValueBuffer("a b url('x.png')");
    const [kept] = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.isEdited(), true);
    assert.equal(buffer.text(), 'a b url(x.png)');
    assert.equal(buffer.tokens()[0], kept);
    assert.deepEqual(
      buffer.tokens().map((token) => [token[0], token[1]]),
      tokenize({ css: buffer.text() })
        .slice(0, -1)
        .map((token) => [token[0], token[1]])
    );
  });

  test('normalize-url leaves the buffer unedited when the URL is already normal', () => {
    const reduce = normalizeUrl.create({}).forProperty('background');
    const buffer = new ValueBuffer('url(x.png)');
    const list = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.isEdited(), false);
    assert.equal(buffer.tokens(), list);
  });
});

describe('reduce-transforms edits the value buffer tokens in place', () => {
  test("reduce-transforms edits the value buffer's tokens without a text edit", () => {
    const reduce = reduceTransforms.create({}).forProperty('transform');
    const buffer = new TextGuardBuffer('rotate(45deg) translate(0, 0)');
    const [kept] = buffer.tokens();
    buffer.armed = true;
    reduce(buffer, 0);
    buffer.armed = false;
    assert.equal(buffer.isEdited(), true);
    assert.equal(buffer.text(), 'rotate(45deg) translate(0)');
    assert.equal(buffer.tokens()[0], kept);
    assert.deepEqual(
      buffer.tokens().map((token) => [token[0], token[1]]),
      tokenize({ css: buffer.text() })
        .slice(0, -1)
        .map((token) => [token[0], token[1]])
    );
  });

  test('reduce-transforms keeps the text after a reduced function whose argument also reduces', () => {
    const reduce = reduceTransforms.create({}).forProperty('transform');
    const buffer = new ValueBuffer('scale(scale(2,1), 1) translate(0)');
    reduce(buffer, 0);
    assert.equal(buffer.text(), 'scaleX(scale(2,1)) translate(0)');
  });

  test('reduce-transforms leaves the buffer unedited when no function reduces', () => {
    const reduce = reduceTransforms.create({}).forProperty('transform');
    const buffer = new ValueBuffer('translate(1px, 2px)');
    const list = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.isEdited(), false);
    assert.equal(buffer.tokens(), list);
  });
});

describe('reduce-initial edits the value buffer tokens in place', () => {
  test("reduce-initial edits the value buffer's tokens without a text edit", () => {
    const reduce = reduceInitial
      .create({}, ['chrome 120'])
      .forProperty('background-color');
    const buffer = new TextGuardBuffer('transparent');
    buffer.tokens();
    buffer.armed = true;
    reduce(buffer, 0);
    buffer.armed = false;
    assert.equal(buffer.isEdited(), true);
    assert.equal(buffer.tokens().length, 1);
    assert.equal(buffer.tokens()[0][1], 'initial');
  });

  test('reduce-initial gives every value the same keyword token', () => {
    const reduce = reduceInitial
      .create({}, ['chrome 120'])
      .forProperty('background-color');
    const first = new ValueBuffer('transparent');
    const second = new ValueBuffer('TRANSPARENT');
    reduce(first, 0);
    reduce(second, 0);
    assert.equal(first.tokens()[0], second.tokens()[0]);
  });

  test('reduce-initial leaves a value that is not a keyword unedited', () => {
    const reduce = reduceInitial
      .create({}, ['chrome 120'])
      .forProperty('background-color');
    const buffer = new ValueBuffer('red');
    const list = buffer.tokens();
    reduce(buffer, 0);
    assert.equal(buffer.isEdited(), false);
    assert.equal(buffer.tokens(), list);
  });
});

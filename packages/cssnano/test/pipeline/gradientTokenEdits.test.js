import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '@csstools/css-tokenizer';
import minifyGradients from '../../src/plugins/postcss-minify-gradients/index.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { ident } from '../../src/values/tokenConstructors.js';

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

const reduceBackground = minifyGradients.create({}).forProperty('background');

describe('minify-gradients edits the value buffer tokens in place', () => {
  test("minify-gradients edits the value buffer's tokens without a text edit", () => {
    const buffer = new ValueBuffer(
      'linear-gradient(to top, red 0%, blue 100%)'
    );
    const [kept] = buffer.tokens();
    reduceBackground(buffer, 0);
    assert.equal(buffer.text(), 'linear-gradient(0deg, red, blue)');
    assert.equal(buffer.tokens()[0], kept);
    assert.deepEqual(
      buffer.tokens().map((token) => [token[0], token[1]]),
      tokenize({ css: buffer.text() })
        .slice(0, -1)
        .map((token) => [token[0], token[1]])
    );
  });

  test('minify-gradients reads no text of an edited buffer before it rewrites the tokens', () => {
    const buffer = new TextGuardBuffer(
      'linear-gradient(to top, red 0%, blue 100%)'
    );
    buffer.replace(6, 7, [ident('red')]);
    buffer.armed = true;
    reduceBackground(buffer, 0);
    buffer.armed = false;
    assert.equal(buffer.text(), 'linear-gradient(0deg, red, blue)');
  });

  test('minify-gradients drops a comment the parse drops, so the comment is gone from the tokens', () => {
    const buffer = new ValueBuffer('linear-gradient(to top /*c*/, red, blue)');
    reduceBackground(buffer, 0);
    assert.equal(buffer.text(), 'linear-gradient(0deg , red, blue)');
    assert.equal(
      buffer.tokens().some((token) => token[0] === 'comment-token'),
      false
    );
  });

  // A var() can stand for any gradient part, so the value stays byte-identical
  // and its comment is kept with it.
  test('minify-gradients keeps a value with var() unchanged, comment included', () => {
    const buffer = new ValueBuffer(
      'linear-gradient(to top /* c */, var(--a), red 0%)'
    );
    reduceBackground(buffer, 0);
    assert.equal(buffer.isEdited(), false);
    assert.equal(
      buffer.text(),
      'linear-gradient(to top /* c */, var(--a), red 0%)'
    );
  });
});

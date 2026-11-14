import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';

/**
 * The output of a preset for one input. Merge is off unless a case turns it on,
 * so the output shows the value and the escape alone.
 */
async function presetOutput(preset, css) {
  const result = await postcss(preset).process(css, { from: undefined });
  return result.css;
}

// A backslash that ends a declaration value, with no semicolon, escapes the
// character that the parser gives to the raw after the block. That character
// must stay with the value, or the output escapes whatever follows it.
suite('an escape that ends the last declaration of a block', () => {
  test('keeps a tab escape after a plain value through the default preset', async () => {
    assert.equal(
      await presetOutput(defaultPreset({ disable: ['merge'] }), 'a{b:c\\\t}'),
      'a{b:c\\\t}'
    );
  });

  test('keeps a tab escape after a color through the default preset', async () => {
    assert.equal(
      await presetOutput(
        defaultPreset({ disable: ['merge'] }),
        'a{color:#ff0000\\\t}'
      ),
      'a{color:#ff0000\\\t}'
    );
  });

  test('keeps a tab escape after a color through the lite preset', async () => {
    assert.equal(
      await presetOutput(litePreset(), 'a{color:#ff0000\\\t}'),
      'a{color:#ff0000\\\t}'
    );
  });

  test('keeps a tab escape after a color when the block is in an at-rule', async () => {
    assert.equal(
      await presetOutput(
        defaultPreset({ disable: ['merge'] }),
        '@media screen{a{color:#ff0000\\\t}}'
      ),
      '@media screen{a{color:#ff0000\\\t}}'
    );
  });
});

// The escaped character joins the value as written, so the comment removal
// still reads the comments of the value.
suite(
  'an escape that ends a last declaration whose value holds a comment',
  () => {
    test('keeps an important comment before the escape', async () => {
      assert.equal(
        await presetOutput(litePreset(), 'a{color:red/*! k */\\ }'),
        'a{color:red/*! k */\\ }'
      );
    });

    test('keeps an important comment that follows an escaped space', async () => {
      assert.equal(
        await presetOutput(
          litePreset(),
          'a{color:/* c */red\\ /*! k */ !important  }'
        ),
        'a{color:red\\ /*! k */!important}'
      );
    });

    test('keeps two components apart where a removed comment separated them', async () => {
      assert.equal(
        await presetOutput(litePreset(), 'a{margin:10px/**/20px\\ }'),
        'a{margin:10px 20px\\ }'
      );
    });

    test('keeps the whitespace a calc operator needs', async () => {
      assert.equal(
        await presetOutput(litePreset(), 'a{width:calc(1px/**/+/**/2px)\\ }'),
        'a{width:calc(1px + 2px)\\ }'
      );
    });

    test('keeps a comment the comment removal keeps', async () => {
      assert.equal(
        await presetOutput(
          defaultPreset({
            disable: ['merge'],
            options: { discardComments: { remove: () => false } },
          }),
          'a{b:c/* d */\\ }'
        ),
        'a{b:c/* d */\\ }'
      );
    });

    test('keeps the line feed after a backslash, which would otherwise escape the brace', async () => {
      assert.equal(
        await presetOutput(litePreset(), 'a{color:red/*! k */\\\n}'),
        'a{color:red/*! k */\\\n}'
      );
    });
  }
);

// Only a backslash that ends the block's text escapes the character after the
// block. Elsewhere the escaped character is already part of the declaration.
suite('an escape that does not end the block', () => {
  test('keeps the space an escape takes before a semicolon', async () => {
    assert.equal(await presetOutput(litePreset(), 'a{b:c\\ ;\t}'), 'a{b:c\\ }');
  });

  test('does not escape a stray semicolon after the declaration', async () => {
    assert.equal(
      await presetOutput(litePreset(), 'a{b:/* d */c\\ ;;\t}'),
      'a{b:c\\ }'
    );
  });

  test('keeps the space an escape takes before an important flag', async () => {
    assert.equal(
      await presetOutput(litePreset(), 'a{b:c\\ !important\t}'),
      'a{b:c\\ !important}'
    );
  });

  test('keeps the space an escape takes before an important flag with a semicolon', async () => {
    assert.equal(
      await presetOutput(litePreset(), 'a{b:c\\ !important;\t}'),
      'a{b:c\\ !important}'
    );
  });
});

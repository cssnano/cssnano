import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  processCSSFactory,
  repositoryFile,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';
import convertValues from '../../src/plugins/postcss-convert-values/index.js';

const plugin = oneStagePlugin(convertValues);

const { processor } = processCSSFactory(plugin);

describe('Raw PostCSS metadata and preceding plugins', () => {
  test('should delete raws.value when decl.raws.value has no raw property', async () => {
    const decl = postcss.decl({ prop: 'width', value: '96px' });
    decl.raws.value = { value: '96px' };
    const root = postcss.root({
      nodes: [postcss.rule({ selector: 'a', nodes: [decl] })],
    });
    await postcss([plugin()]).process(root, { from: repositoryFile });
    assert.equal(decl.value, '1in');
    assert.equal(decl.raws.value, undefined);
  });

  test('should drop raws.value of a converted declaration, keeping the output', async () => {
    const result = await processor('a{width:192px, /*x*/ 192px}');
    assert.equal(result.css, 'a{width:2in, /*x*/ 2in}');
    assert.equal(result.root.first.first.raws.value, undefined);
  });

  test('should convert identical declarations in different rules to the same output', async () => {
    const result = await processor(
      'a{width:192px} b{width:192px} c{width:10px} d{width:10px}'
    );
    assert.equal(
      result.css,
      'a{width:2in} b{width:2in} c{width:10px} d{width:10px}'
    );

    const root = postcss.parse(
      'a{width:192px, /*x*/ 192px} b{width:192px, /*x*/ 192px}'
    );
    const repeated = await postcss([plugin()]).process(root, {
      from: repositoryFile,
    });
    assert.equal(
      repeated.css,
      'a{width:2in, /*x*/ 2in} b{width:2in, /*x*/ 2in}'
    );
    assert.equal(repeated.root.nodes[1].nodes[0].raws.value, undefined);
  });

  test('should convert a declaration inside a non-keyframe at-rule (@media)', async () => {
    const result = await processor(
      '@media (min-width: 0px){a{stroke-dasharray:192px}}'
    );
    assert.equal(
      result.css,
      '@media (min-width: 0px){a{stroke-dasharray:2in}}'
    );
  });

  test('should keep an opacity above 1 inside keyframes, where the value is not clamped', async () => {
    const result = await processor('@keyframes bounce{50%{opacity:1.2}}');
    assert.equal(result.css, '@keyframes bounce{50%{opacity:1.2}}');
  });

  test('should use a declaration value changed by a preceding plugin', async () => {
    const preceding = {
      postcssPlugin: 'change-value',
      Declaration(decl) {
        decl.value = '96px';
      },
    };
    const result = await postcss([preceding, plugin()]).process(
      'a{width:192px}',
      { from: repositoryFile }
    );
    assert.equal(result.css, 'a{width:1in}');
  });

  test('should ignore stale raw value metadata from a preceding plugin', async () => {
    const preceding = {
      postcssPlugin: 'change-value-and-raw',
      Declaration(decl) {
        decl.raws.value = { raw: '192px /* stale */', value: '192px' };
        decl.value = '96px';
      },
    };
    const result = await postcss([preceding, plugin()]).process(
      'a{width:192px}',
      { from: repositoryFile }
    );
    assert.equal(result.css, 'a{width:1in}');
  });
});

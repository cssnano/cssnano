import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import transform from '../src/lib/transform.js';

const { processor } = processCSSFactory(plugin);

describe('Raw PostCSS metadata and preceding plugins', () => {
  test('should delete raws.value when decl.raws.value has no raw property', () => {
    const decl = postcss.decl({ prop: 'width', value: '96px' });
    decl.raws.value = { value: '96px' };
    transform({}, false, decl);
    assert.equal(decl.value, '1in');
    assert.equal(decl.raws.value, undefined);
  });

  test('should synchronize raw PostCSS value metadata after conversion', async () => {
    const result = await processor('a{width:192px, /*x*/ 192px}');
    assert.equal(result.css, 'a{width:2in, /*x*/ 2in}');
    assert.deepEqual(result.root.first.first.raws.value, {
      raw: '2in, /*x*/ 2in',
      value: '2in, /*x*/ 2in',
    });
  });

  test('should reuse declaration cache across identical declarations and synchronize raw metadata', async () => {
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
    const cachedResult = await postcss([plugin()]).process(root, {
      from: undefined,
    });
    assert.equal(
      cachedResult.css,
      'a{width:2in, /*x*/ 2in} b{width:2in, /*x*/ 2in}'
    );
    assert.deepEqual(cachedResult.root.nodes[1].nodes[0].raws.value, {
      raw: '2in, /*x*/ 2in',
      value: '2in, /*x*/ 2in',
    });
  });

  test('should cache declarations inside non-keyframe at-rules (@media, @supports)', () => {
    const cache = new Map();
    const root = postcss.parse(
      '@media (min-width: 0px){a{stroke-dasharray:192px}}'
    );
    let decl;
    root.walkDecls((d) => {
      decl = d;
    });
    transform({}, false, decl, cache);
    assert.equal(decl.value, '2in');
    assert.ok(cache.has('stroke-dasharray:192px'));

    const keyframesRoot = postcss.parse(
      '@keyframes spin{from{stroke-dasharray:192px}}'
    );
    let keyframeDecl;
    keyframesRoot.walkDecls((d) => {
      keyframeDecl = d;
    });
    const keyframesCache = new Map();
    transform({}, false, keyframeDecl, keyframesCache);
    assert.equal(keyframesCache.size, 0);
  });

  test('should not cache opacity declarations inside keyframes', () => {
    const keyframesRoot = postcss.parse('@keyframes bounce{50%{opacity:1.2}}');
    let keyframeDecl;
    keyframesRoot.walkDecls((d) => {
      keyframeDecl = d;
    });
    const keyframesCache = new Map();
    transform({}, false, keyframeDecl, keyframesCache);
    assert.equal(keyframeDecl.value, '1.2');
    assert.equal(keyframesCache.size, 0);
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
      { from: undefined }
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
      { from: undefined }
    );
    assert.equal(result.css, 'a{width:1in}');
  });
});

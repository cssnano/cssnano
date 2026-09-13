import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'should merge duplicated counter styles with the same name',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style a{system:extends decimal;suffix:"> "}',
    '@counter-style a{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should merge duplicated counter styles with the same name (2)',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@COUNTER-STYLE a{system:extends decimal;suffix:"> "}',
    '@COUNTER-STYLE a{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should merge counter style identifiers',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}',
    '@counter-style b{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should merge multiple counter style identifiers',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}',
    '@counter-style c{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should update relevant list style declarations',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:a}',
    '@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:b}'
  )
);

test(
  'should update relevant list style declarations (2)',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:a}',
    '@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:c}'
  )
);

test(
  'should update relevant list style declarations (3)',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}ol{LIST-STYLE:a}',
    '@counter-style b{system:extends decimal;suffix:"> "}ol{LIST-STYLE:b}'
  )
);

test(
  'should update relevant system declarations',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}',
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}'
  )
);

test('should serialize each counter-style body only once when entering candidate collection', async () => {
  let toStringCalls = 0;
  const input = [
    '@counter-style a{system:extends decimal;suffix:"> "}',
    '@counter-style b{system:extends decimal;suffix:"> "}',
    '@counter-style c{system:extends decimal;suffix:"> "}',
    '@counter-style d{system:extends decimal;suffix:"> "}',
    'ol{list-style:a}',
  ].join('');

  const root = postcss.parse(input);
  for (const node of root.nodes) {
    if (node.type === 'atrule' && node.nodes) {
      const origToString = node.nodes.toString;
      node.nodes.toString = function (...args) {
        toStringCalls++;
        return origToString.apply(this, args);
      };
    }
  }

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(toStringCalls, 4);
  assert.strictEqual(
    root.toString(),
    '@counter-style d{system:extends decimal;suffix:"> "}ol{list-style:d}'
  );
});

test('should handle empty at-rule bodies and statement at-rules', async () => {
  const emptyResult = await postcss([plugin()]).process(
    '@keyframes a{}@keyframes b{}',
    { from: undefined }
  );
  assert.strictEqual(emptyResult.css, '@keyframes b{}');

  const stmtResult = await postcss([plugin()]).process(
    '@counter-style a;@counter-style b;',
    { from: undefined }
  );
  assert.strictEqual(stmtResult.css, '@counter-style b;');
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

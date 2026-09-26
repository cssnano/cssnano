import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

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
  'should not match a Unicode lookalike counter-style at-rule',
  processCSS(
    '@counter-ſtyle a{system:extends decimal;suffix:"> "}@counter-ſtyle b{system:extends decimal;suffix:"> "}',
    '@counter-ſtyle a{system:extends decimal;suffix:"> "}@counter-ſtyle b{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should not match a Unicode lookalike list-style declaration',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}ol{list-ſtyle:a}',
    '@counter-style b{system:extends decimal;suffix:"> "}ol{list-ſtyle:a}'
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

test(
  'should update list-style-type longhand declarations',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}ol{list-style-type:a}',
    '@counter-style b{system:cyclic;symbols:"A"}ol{list-style-type:b}'
  )
);

test(
  'should not corrupt non-name list-style properties',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}ol{list-style-position:inside;list-style-image:none}',
    '@counter-style b{system:cyclic;symbols:"A"}ol{list-style-position:inside;list-style-image:none}'
  )
);

test(
  'should not corrupt custom properties containing system or list-style in their name',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}:root{--design-system:a;--system:a}',
    '@counter-style b{system:cyclic;symbols:"A"}:root{--design-system:a;--system:a}'
  )
);

test(
  'should update counter-style references in content counter() and counters()',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}div{content:counter(x,a);content:counters(x,".",a)}',
    '@counter-style b{system:cyclic;symbols:"A"}div{content:counter(x,b);content:counters(x,".",b)}'
  )
);

test(
  'should update counter-style references in escaped function names',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}div{content:\\63 ounter(x,a)}',
    '@counter-style b{system:cyclic;symbols:"A"}div{content:\\63 ounter(x,b)}'
  )
);

test(
  'should update counter-style references spelled with escaped idents in argument slots',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}div{content:counter(x,\\61 )}',
    '@counter-style b{system:cyclic;symbols:"A"}div{content:counter(x,b )}'
  )
);

test(
  'should not corrupt counter name in single-argument counter()',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}div{content:counter(a)}',
    '@counter-style b{system:cyclic;symbols:"A"}div{content:counter(a)}'
  )
);

test(
  'should update counter-style descriptors fallback and speak-as',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}@counter-style c{system:cyclic;symbols:"B";fallback:a;speak-as:a}',
    '@counter-style b{system:cyclic;symbols:"A"}@counter-style c{system:cyclic;symbols:"B";fallback:b;speak-as:b}'
  )
);

test(
  'should reject multi-token at-rules in counter-style',
  passthroughCSS(
    '@counter-style a{system:cyclic;symbols:"*"}@counter-style b extra{system:cyclic;symbols:"*"}ol{list-style:a}'
  )
);

test(
  'should reject reserved keyword none and decimal in counter-style',
  passthroughCSS(
    '@counter-style a{system:cyclic;symbols:"*"}@counter-style none{system:cyclic;symbols:"*"}@counter-style decimal{system:cyclic;symbols:"*"}ol{list-style:a}'
  )
);

test(
  'should reject CSS-wide keywords in counter-style',
  passthroughCSS(
    '@counter-style a{system:cyclic;symbols:"*"}@counter-style inherit{system:cyclic;symbols:"*"}@counter-style initial{system:cyclic;symbols:"*"}ol{list-style:a}'
  )
);

test(
  'should reject string names in counter-style',
  passthroughCSS(
    '@counter-style "a"{system:cyclic;symbols:"*"}@counter-style "b"{system:cyclic;symbols:"*"}ol{list-style:"a"}'
  )
);

test(
  'should update counter-style references in string-set with counter() and counters()',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}h1{string-set:header counter(page,a),section counters(sub,".",a)}',
    '@counter-style b{system:cyclic;symbols:"A"}h1{string-set:header counter(page,b),section counters(sub,".",b)}'
  )
);

test(
  'should resolve counter-style across cascade layers',
  processCSS(
    '@layer base{@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}}ol{list-style:a}',
    '@layer base{@counter-style b{system:cyclic;symbols:"A"}}ol{list-style:b}'
  )
);

test(
  'should handle counter-style duplication within container queries',
  processCSS(
    '@container (min-width:400px){@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}ol{list-style:a}}',
    '@container (min-width:400px){@counter-style b{system:cyclic;symbols:"A"}ol{list-style:b}}'
  )
);

test(
  'should treat user-defined counter-style names as case-sensitive when merging',
  processCSS(
    '@counter-style A{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}ol{list-style:a}',
    '@counter-style b{system:cyclic;symbols:"A"}ol{list-style:a}'
  )
);

test(
  'should rewrite references spelled with the defined case of a counter-style name',
  processCSS(
    '@counter-style A{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}ol{list-style:A}',
    '@counter-style b{system:cyclic;symbols:"A"}ol{list-style:b}'
  )
);

test(
  'should not merge counter-style names differing only in case',
  passthroughCSS(
    '@counter-style A{system:cyclic;symbols:"A"}@counter-style a{system:cyclic;symbols:"B"}ol{list-style:A}'
  )
);

test(
  'should update counter-style references in a list-style shorthand mixing the name with keywords',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}ol{list-style:a inside}',
    '@counter-style b{system:cyclic;symbols:"A"}ol{list-style:b inside}'
  )
);

test(
  'should not merge counter-style names colliding with reserved keywords into different names',
  passthroughCSS(
    '@counter-style disc{system:cyclic;symbols:"*"}@counter-style b{system:cyclic;symbols:"*"}ol{list-style:disc}'
  )
);

test(
  'should deduplicate identical counter-style definitions colliding with reserved keywords',
  processCSS(
    '@counter-style disc{system:cyclic;symbols:"*"}@counter-style disc{system:cyclic;symbols:"*"}ol{list-style:disc}',
    '@counter-style disc{system:cyclic;symbols:"*"}ol{list-style:disc}'
  )
);

test(
  'should not merge predefined counter style names into different names',
  passthroughCSS(
    '@counter-style lower-roman{system:cyclic;symbols:"i"}@counter-style b{system:cyclic;symbols:"i"}ol{list-style:lower-roman}'
  )
);

test(
  'should not merge other predefined counter styles into different names',
  passthroughCSS(
    '@counter-style decimal-leading-zero{system:cyclic;symbols:"0"}@counter-style b{system:cyclic;symbols:"0"}ol{list-style:decimal-leading-zero}@counter-style armenian{system:cyclic;symbols:"a"}@counter-style c{system:cyclic;symbols:"a"}ol{list-style:armenian}'
  )
);

test(
  'should deduplicate identical definitions of predefined counter styles',
  processCSS(
    '@counter-style lower-roman{system:cyclic;symbols:"i"}@counter-style lower-roman{system:cyclic;symbols:"i"}ol{list-style:lower-roman}',
    '@counter-style lower-roman{system:cyclic;symbols:"i"}ol{list-style:lower-roman}'
  )
);

test(
  'should preserve higher priority layer for counter-style when conflicting layer order is declared',
  processCSS(
    '@layer low, high;@layer high{@counter-style a{system:cyclic;symbols:"x"}}@layer low{@counter-style a{system:cyclic;symbols:"x"}}.one{list-style:a}',
    '@layer low, high;@layer high{@counter-style a{system:cyclic;symbols:"x"}}@layer low{}.one{list-style:a}'
  )
);

test(
  'should update counter-style references in target-counter() and target-counters()',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}div{content:target-counter(attr(href url),page,a);content:target-counters(attr(href url),section,".",a)}',
    '@counter-style b{system:cyclic;symbols:"A"}div{content:target-counter(attr(href url),page,b);content:target-counters(attr(href url),section,".",b)}'
  )
);

test(
  'should update counter-style references in nested counter() calls',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}div{content:target-text(attr(href),counter(page,a))}',
    '@counter-style b{system:cyclic;symbols:"A"}div{content:target-text(attr(href),counter(page,b))}'
  )
);

test(
  'should update multiple counter-style references in a single declaration',
  processCSS(
    '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}div{content:counter(x,a) " / " counter(y,a)}',
    '@counter-style b{system:cyclic;symbols:"A"}div{content:counter(x,b) " / " counter(y,b)}'
  )
);

test('should not serialize counter-style body when container only has a single at-rule', async () => {
  let toStringCalls = 0;
  const input = '@counter-style a{system:cyclic;symbols:"A"}ol{list-style:a}';
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

  assert.strictEqual(toStringCalls, 0);
  assert.strictEqual(root.toString(), input);
});

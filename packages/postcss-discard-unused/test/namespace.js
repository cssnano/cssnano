import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should remove unused prefixed namespace',
  processCSS(
    '@namespace svg url(http://www.w3.org/2000/svg);a{color:blue}',
    'a{color:blue}'
  )
);

test('should remove invalid namespace', processCSS('@namespace', ''));

test(
  "shouldn't remove default namespace",
  passthroughCSS('@namespace url(http://www.w3.org/2000/svg)')
);

test(
  "shouldn't remove used prefixed namespace",
  passthroughCSS(
    '@namespace svg url(http://www.w3.org/2000/svg);svg|a{color:blue}'
  )
);

test(
  "shouldn't remove prefixed namespace in case of universal selector",
  passthroughCSS(
    '@namespace svg url(http://www.w3.org/2000/svg);*|a{color:blue}'
  )
);

test(
  `shouldn't remove when namespace is used in attribute selector`,
  passthroughCSS(
    `@namespace xlink url('http://www.w3.org/1999/xlink');svg:hover use[xlink|href*=facebook]{fill:blue}`
  )
);

test(
  `shouldn't remove when an attribute selector has an escaped namespace`,
  passthroughCSS(
    "@namespace xlink url('http://www.w3.org/1999/xlink');use[x\\6c ink|href]{fill:blue}"
  )
);

test(
  `shouldn't remove an escaped namespace used by an attribute selector`,
  passthroughCSS(
    '@namespace foo\\.bar url("https://example.test/ns");[foo\\.bar|item]{color:red}'
  )
);

test(
  `shouldn't mistake a pipe in an attribute value for a namespace`,
  processCSS(
    "@namespace xlink url('http://www.w3.org/1999/xlink');use[href='xlink|href']{fill:blue}",
    "use[href='xlink|href']{fill:blue}"
  )
);

test(
  `shouldn't mistake a dash-match attribute operator for a namespace`,
  processCSS(
    '@namespace title url(http://example.com);a[title|=foo]{color:blue}',
    'a[title|=foo]{color:blue}'
  )
);

test(
  `shouldn't mistake a spaced dash-match attribute operator for a namespace`,
  processCSS(
    '@namespace title url(http://example.com);a[title | = foo]{color:blue}',
    'a[title | = foo]{color:blue}'
  )
);

test(
  `shouldn't remove a wildcard attribute namespace`,
  passthroughCSS('@namespace svg url(http://example.com);a[*|href]{color:blue}')
);

test(
  `shouldn't remove a namespace used by an attribute selector in :is()`,
  passthroughCSS(
    "@namespace xlink url('http://www.w3.org/1999/xlink');:is(use[xlink|href],a){fill:blue}"
  )
);

test(
  `shouldn't remove namespaces used by type and attribute selectors in one rule`,
  passthroughCSS(
    '@namespace svg url(http://www.w3.org/2000/svg);@namespace xlink url(http://www.w3.org/1999/xlink);svg|use[xlink|href]{fill:blue}'
  )
);

test(
  'should remove an unused namespace when a selector list starts with a type selector',
  processCSS('@namespace a url(a);a,foo|b{color:blue}', 'a,foo|b{color:blue}')
);

test(
  'should keep an escaped asterisk namespace distinct from a wildcard namespace',
  processCSS('@namespace foo url(x);\\*|a{color:blue}', '\\*|a{color:blue}')
);

test(
  `shouldn't remove an escaped asterisk namespace when used by a selector`,
  passthroughCSS('@namespace \\* url(x);\\*|a{color:blue}')
);

test(
  `shouldn't remove an escaped namespace used by a type selector`,
  passthroughCSS(
    '@namespace foo\\.bar url("https://example.test/ns");foo\\.bar|div{color:red}'
  )
);

test(
  'should remove unused prefixed namespace when preceded by a default namespace',
  processCSS(
    '@namespace url(http://example.com/default);@namespace unused url(http://example.com/unused);a{color:blue}',
    '@namespace url(http://example.com/default);a{color:blue}'
  )
);

test(
  "shouldn't remove default namespace declared with string syntax",
  passthroughCSS('@namespace "http://www.w3.org/1999/xhtml"')
);

test(
  'should remove unused prefixed namespace declared with string syntax',
  processCSS(
    '@namespace svg "http://www.w3.org/2000/svg";a{color:blue}',
    'a{color:blue}'
  )
);

test(
  "shouldn't remove used prefixed namespace declared with string syntax",
  passthroughCSS(
    '@namespace svg "http://www.w3.org/2000/svg";svg|a{color:blue}'
  )
);

test(
  'should remove an unused namespace when a descendant selector uses an empty namespace',
  processCSS(
    '@namespace a url(http://example.com/a);a |b{color:blue}',
    'a |b{color:blue}'
  )
);

test(
  'should keep a used namespace when it appears after a comma in a selector list',
  passthroughCSS('@namespace a url(a);b,a|c{color:blue}')
);

test(
  'should keep all used namespaces in a multi-item selector list',
  passthroughCSS('@namespace a url(a);@namespace b url(b);a|x,b|y{color:blue}')
);

test(
  `shouldn't remove a namespace used with a wildcard element selector`,
  passthroughCSS('@namespace svg url(http://example.com);svg|*{color:blue}')
);

test(
  `shouldn't remove a prefixed namespace when universal selector *|* is used`,
  passthroughCSS('@namespace svg url(http://example.com);*|*{color:blue}')
);

test(
  'should remove unused namespace when another namespace in the same stylesheet is used',
  processCSS(
    '@namespace svg url(http://www.w3.org/2000/svg);@namespace xlink url(http://www.w3.org/1999/xlink);svg|use{fill:blue}',
    '@namespace svg url(http://www.w3.org/2000/svg);svg|use{fill:blue}'
  )
);

test(
  "shouldn't remove unused prefixed namespace",
  passthroughCSS('@namespace svg url(http://www.w3.org/2000/svg)', {
    namespace: false,
  })
);

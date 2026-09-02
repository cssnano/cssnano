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
  "shouldn't remove unused prefixed namespace",
  passthroughCSS('@namespace svg url(http://www.w3.org/2000/svg)', {
    namespace: false,
  })
);

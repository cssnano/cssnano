// Selector lists with their minified reference output. Each list is one unit
// for the serializer tests, and the characterization tests reuse the same
// inputs.
export const serializerCorpus = [
  ['.card, .card, article.card', '.card,article.card'],
  ['.b, .a', '.a,.b'],
  ['h3, h1, h2', 'h1,h2,h3'],
  [
    'section h1, article h1, aside h1, nav h1',
    'article h1,aside h1,nav h1,section h1',
  ],
  ['h1 /*! keep */ , p', 'h1 /*! keep */,p'],
  ['.\\31 x', '.\\31x'],
  ['#\\31 x', '#\\31x'],
  ['col || td', 'col||td'],
  ['div /* comment */ > :is(.a, .b)', 'div>:is(.a,.b)'],
  ['[data-value="a,b"][lang = "en" i]', '[data-value="a,b"][lang=en i]'],
  ['svg|* , |* , .\\31 23', '.\\31 23,svg|*,|*'],
  ['*|a, *|*, *|*.class', '*|*,*|*.class,*|a'],
  ['svg|*, *|a, |a, |*', '*|a,svg|*,|*,|a'],
  [':not(:is(.a, .b)), :nth-child(2n + 1)', ':not(:is(.a,.b)),:nth-child(odd)'],
  [
    '.a\\,b, .a\\,b, .x[attr="(deep, value)"]',
    '.a\\,b,.x[attr="(deep, value)"]',
  ],
  ['h1 /**/ p, .a /* comment */ .b', '.a .b,h1 p'],
  [
    'a\\E0000\\E001, a\\E0000\\E001[attr="x,y"]',
    'a\\E0000\\E001,a\\E0000\\E001[attr="x,y"]',
  ],
];

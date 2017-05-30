import test from 'ava';
import processCss from './_processCss';

test(
    'should trim spaces in simple selectors',
    processCss,
    'h1,  h2,  h3{color:#00f}',
    'h1,h2,h3{color:#00f}',
);

test(
    'should trim spaces around combinators',
    processCss,
    'h1 + p, h1 > p, h1 ~ p{color:#00f}',
    'h1+p,h1>p,h1~p{color:#00f}',
);

test(
    'should not trim meaningful spaces',
    processCss,
    'h1 p,h2 p{color:#00f}',
    'h1 p,h2 p{color:#00f}',
);

test(
    'should reduce meaningful spaces',
    processCss,
    'h1    p,h2     p{color:#00f}',
    'h1 p,h2 p{color:#00f}',
);

test(
    'should remove qualified universal selectors',
    processCss,
    '*#id,*.test,*:not(.green),*[href]{color:#00f}',
    '#id,.test,:not(.green),[href]{color:#00f}',
);

test(
    'should remove complex qualified universal selectors',
    processCss,
    '[class] + *[href] *:not(*.green){color:#00f}',
    '[class]+[href] :not(.green){color:#00f}',
);

test(
    'should remove complex qualified universal selectors (2)',
    processCss,
    '*:not(*.green) ~ *{color:#00f}',
    ':not(.green)~*{color:#00f}',
);

test(
    'should not remove meaningful universal selectors',
    processCss,
    '* + *, * > *, * h1, * ~ *{color:#00f}',
    '*+*,*>*,* h1,*~*{color:#00f}',
);

test(
    'should preserve the universal selector in attribute selectors',
    processCss,
    'h1[class=" *.js "] + *.js{color:#00f}',
    'h1[class=" *.js "]+.js{color:#00f}',
);

test(
    'should preserve the universal selector in filenames',
    processCss,
    '[filename="*.js"]{color:#00f}',
    '[filename="*.js"]{color:#00f}',
);

test(
    'should preserve the universal selector in file globs',
    processCss,
    '[glob="/**/*.js"]{color:#00f}',
    '[glob="/**/*.js"]{color:#00f}',
);

test(
    'should preserve escaped zero plus sequences',
    processCss,
    '.\\31 0\\+,.\\31 5\\+,.\\32 0\\+{color:#00f}',
    '.\\31 0\\+,.\\31 5\\+,.\\32 0\\+{color:#00f}',
);

test(
    'should handle deep combinators',
    processCss,
    'body /deep/ .theme-element{color:#00f}',
    'body /deep/ .theme-element{color:#00f}',
);

test(
    'should sort using natural sort',
    processCss,
    '.item1, .item10, .item11, .item2{color:#00f}',
    '.item1,.item2,.item10,.item11{color:#00f}',
);

test(
    'should dedupe selectors',
    processCss,
    'h1,h2,h3,h4,h5,h5,h6{color:#00f}',
    'h1,h2,h3,h4,h5,h6{color:#00f}',
);

test(
    'should trim spaces in :not()',
    processCss,
    'h1:not(.article, .comments){color:#00f}',
    'h1:not(.article,.comments){color:#00f}',
);

test(
    'should trim spaces in :not() (2)',
    processCss,
    'h1:not(.article, .comments), h2:not(.lead, .recommendation){color:#00f}',
    'h1:not(.article,.comments),h2:not(.lead,.recommendation){color:#00f}',
);

test(
    'should dedupe simple selectors inside :not()',
    processCss,
    'h1:not(h2, h3, h4, h5, h5, h6){color:#00f}',
    'h1:not(h2,h3,h4,h5,h6){color:#00f}',
);

test(
    'should normalise attribute selectors',
    processCss,
    'a[   color=   "blue"    ]{color:#00f}',
    'a[color=blue]{color:#00f}',
);

test(
    'should normalise attribute selectors (2)',
    processCss,
    'a[class^="options["]:after{color:#00f}',
    'a[class^="options["]:after{color:#00f}',
);

test(
    'should normalise attribute selectors (3)',
    processCss,
    'a[class="woop_woop_woop"]{color:#00f}',
    'a[class=woop_woop_woop]{color:#00f}',
);

test(
    'should normalise attribute selectors (4)',
    processCss,
    'a[class="woop \\\nwoop woop"]{color:#00f}',
    'a[class="woop woop woop"]{color:#00f}',
);

test(
    'should not be responsible for normalising comments',
    processCss,
    'h1 /*!test comment*/, h2{color:#00f}',
    'h1 /*!test comment*/,h2{color:#00f}',
);

test(
    'should not be responsible for normalising coments (2)',
    processCss,
    '/*!test   comment*/h1, h2{color:#00f}',
    '/*!test   comment*/h1,h2{color:#00f}',
);

test(
    'should not change strings',
    processCss,
     ':not([attr="  h1       a + b /* not a comment */ end of :not  from 100% "]){color:#00f}',
    ':not([attr="  h1       a + b /* not a comment */ end of :not  from 100% "]){color:#00f}',
);

test(
    'should not change strings (2)',
    processCss,
    ':not([attr="  h1       a + b /* not a comment */ not end of `:not`:  )  from 100% "]){color:#00f}',
    ':not([attr="  h1       a + b /* not a comment */ not end of `:not`:  )  from 100% "]){color:#00f}',
);

test(
    'should not change strings (3)',
    processCss,
    '[a=":not( *.b, h1, h1 )"]{color:#00f}',
    '[a=":not( *.b, h1, h1 )"]{color:#00f}',
);

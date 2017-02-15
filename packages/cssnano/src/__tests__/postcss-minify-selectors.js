import test from 'ava';
import processCss from './_processCss';

test(
    'should trim spaces in simple selectors',
    processCss,
    'h1,  h2,  h3{color:blue}',
    'h1,h2,h3{color:blue}',
);

test(
    'should trim spaces around combinators',
    processCss,
    'h1 + p, h1 > p, h1 ~ p{color:blue}',
    'h1+p,h1>p,h1~p{color:blue}',
);

test(
    'should not trim meaningful spaces',
    processCss,
    'h1 p,h2 p{color:blue}',
    'h1 p,h2 p{color:blue}',
);

test(
    'should reduce meaningful spaces',
    processCss,
    'h1    p,h2     p{color:blue}',
    'h1 p,h2 p{color:blue}',
);

test(
    'should remove qualified universal selectors',
    processCss,
    '*#id,*.test,*:not(.green),*[href]{color:blue}',
    '#id,.test,:not(.green),[href]{color:blue}',
);

test(
    'should remove complex qualified universal selectors',
    processCss,
    '[class] + *[href] *:not(*.green){color:blue}',
    '[class]+[href] :not(.green){color:blue}',
);

test(
    'should remove complex qualified universal selectors (2)',
    processCss,
    '*:not(*.green) ~ *{color:blue}',
    ':not(.green)~*{color:blue}',
);

test(
    'should not remove meaningful universal selectors',
    processCss,
    '* + *, * > *, * h1, * ~ *{color:blue}',
    '*+*,*>*,* h1,*~*{color:blue}',
);

test(
    'should preserve the universal selector in attribute selectors',
    processCss,
    'h1[class=" *.js "] + *.js{color:blue}',
    'h1[class=" *.js "]+.js{color:blue}',
);

test(
    'should preserve the universal selector in filenames',
    processCss,
    '[filename="*.js"]{color:blue}',
    '[filename="*.js"]{color:blue}',
);

test(
    'should preserve the universal selector in file globs',
    processCss,
    '[glob="/**/*.js"]{color:blue}',
    '[glob="/**/*.js"]{color:blue}',
);

test(
    'should preserve escaped zero plus sequences',
    processCss,
    '.\\31 0\\+,.\\31 5\\+,.\\32 0\\+{color:blue}',
    '.\\31 0\\+,.\\31 5\\+,.\\32 0\\+{color:blue}',
);

test(
    'should handle deep combinators',
    processCss,
    'body /deep/ .theme-element{color:blue}',
    'body /deep/ .theme-element{color:blue}',
);

test(
    'should sort using natural sort',
    processCss,
    '.item1, .item10, .item11, .item2{color:blue}',
    '.item1,.item2,.item10,.item11{color:blue}',
);

test(
    'should dedupe selectors',
    processCss,
    'h1,h2,h3,h4,h5,h5,h6{color:blue}',
    'h1,h2,h3,h4,h5,h6{color:blue}',
);

test(
    'should trim spaces in :not()',
    processCss,
    'h1:not(.article, .comments){color:blue}',
    'h1:not(.article,.comments){color:blue}',
);

test(
    'should trim spaces in :not() (2)',
    processCss,
    'h1:not(.article, .comments), h2:not(.lead, .recommendation){color:blue}',
    'h1:not(.article,.comments),h2:not(.lead,.recommendation){color:blue}',
);

test(
    'should dedupe simple selectors inside :not()',
    processCss,
    'h1:not(h2, h3, h4, h5, h5, h6){color:blue}',
    'h1:not(h2,h3,h4,h5,h6){color:blue}',
);

test(
    'should normalise attribute selectors',
    processCss,
    'a[   color=   "blue"    ]{color:blue}',
    'a[color=blue]{color:blue}',
);

test(
    'should normalise attribute selectors (2)',
    processCss,
    'a[class^="options["]:after{color:blue}',
    'a[class^="options["]:after{color:blue}',
);

test(
    'should normalise attribute selectors (3)',
    processCss,
    'a[class="woop_woop_woop"]{color:blue}',
    'a[class=woop_woop_woop]{color:blue}',
);

test(
    'should normalise attribute selectors (4)',
    processCss,
    'a[class="woop \\\nwoop woop"]{color:blue}',
    'a[class="woop woop woop"]{color:blue}',
);

test(
    'should convert @keyframe from & 100%',
    processCss,
    '@keyframes test{from{color:red}100%{color:blue}}a{animation:test}',
    '@keyframes a{0%{color:red}to{color:blue}}a{animation:a}',
);

test(
    'should not mangle @keyframe from & 100% in other values',
    processCss,
    '@keyframes test{x-from-tag{color:red}5100%{color:blue}}a{animation:test}',
    '@keyframes a{x-from-tag{color:red}5100%{color:blue}}a{animation:a}',
);

test(
    'should not be responsible for normalising comments',
    processCss,
    'h1 /*!test comment*/, h2{color:blue}',
    'h1 /*!test comment*/,h2{color:blue}',
);

test(
    'should not be responsible for normalising coments (2)',
    processCss,
    '/*!test   comment*/h1, h2{color:blue}',
    '/*!test   comment*/h1,h2{color:blue}',
);

test(
    'should not change strings',
    processCss,
     ':not([attr="  h1       a + b /* not a comment */ end of :not  from 100% "]){color:blue}',
    ':not([attr="  h1       a + b /* not a comment */ end of :not  from 100% "]){color:blue}',
);

test(
    'should not change strings (2)',
    processCss,
    ':not([attr="  h1       a + b /* not a comment */ not end of `:not`:  )  from 100% "]){color:blue}',
    ':not([attr="  h1       a + b /* not a comment */ not end of `:not`:  )  from 100% "]){color:blue}',
);

test(
    'should not change strings (3)',
    processCss,
    '[a=":not( *.b, h1, h1 )"]{color:blue}',
    '[a=":not( *.b, h1, h1 )"]{color:blue}',
);

test(
    'should not change strings (4)',
    processCss,
    '[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:blue}',
    '[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:blue}',
    {normalizeString: false},
);

test(
    'should not change strings (5)',
    processCss,
    "[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:blue}",
    "[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:blue}",
    {normalizeString: false},
);

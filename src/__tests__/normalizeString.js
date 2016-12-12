import test from 'ava';
import processCss from './_processCss';

test(
    'should prefer double quotes by default',
    processCss,
    `p:after {
        content: ""
    }`,
    `p:after{content:""}`
);

test(
    'should transform single quotes to double quotes by default',
    processCss,
    `p:after {
        content: ''
    }`,
    `p:after{content:""}`
);

test(
    'should transform double quotes to single quotes via an option',
    processCss,
    `p:after {
        content: ""
    }`,
    `p:after{content:''}`,
    {normalizeString: {preferredQuote: 'single'}}
);

test(
    'should keep single quotes inside a double quoted string intact',
    processCss,
    `p:after {
        content: "'string' is intact"
    }`,
    `p:after{content:"'string' is intact"}`
);

test(
    'should keep double quotes inside a single quoted string intact',
    processCss,
    `p:after {
        content: '"string" is intact'
    }`,
    `p:after{content:'"string" is intact'}`
);

test(
    'should transform escaped single quotation marks if possible',
    processCss,
    `p:after {
        content: '\\'string\\' is intact'
    }`,
    `p:after{content:"'string' is intact"}`
);

test(
    'should transform escaped double quotation marks if possible',
    processCss,
    `p:after {
        content: "\\"string\\" is intact"
    }`,
    `p:after{content:'"string" is intact'}`
);

test(
    'should not transform quotation marks when mixed',
    processCss,
    `p:after {
        content: "\\"string\\" is 'intact'"
    }`,
    `p:after{content:"\\"string\\" is 'intact'"}`
);

test(
    'should not transform quotation marks when mixed',
    processCss,
    `p:after {
        content: '"string" is \\'intact\\''
    }`,
    `p:after{content:'"string" is \\'intact\\''}`
);

test(
    'should transform escaped single quotation marks when mixed',
    processCss,
    `p:after {
        content: '\\'string\\' is \\"intact\\"'
    }`,
    `p:after{content:'\\'string\\' is "intact"'}`
);

test(
    'should transform escaped double quotation marks when mixed',
    processCss,
    `p:after {
        content: "\\'string\\' is \\"intact\\""
    }`,
    `p:after{content:"'string' is \\"intact\\""}`
);

test(
    'should work with the attr function',
    processCss,
    `p:after {
        content: '(' attr(href) ')'
    }`,
    `p:after{content:"(" attr(href) ")"}`
);

/*
 * The whitespace here is kept because it might influence the design
 * e.g. through `white-space: pre;`
 */

test(
    'should join multiple line strings',
    processCss,
    `p:after {
        content: " > this is some really\\
                     long text which is broken\\
                     over several lines.";
    }`,
    `p:after{content:" > this is some really                     long text which is broken                     over several lines."}`
);

test(
    'should work with quotes',
    processCss,
    `q {
        quotes: '«' "»"
    }`,
    `q{quotes:"«" "»"}`
);

test(
    'should work with language overrides',
    processCss,
    `p {
        font-language-override: 'DAN'
    }`,
    `p{font-language-override:"DAN"}`
);

test(
    'should work with css grids',
    processCss,
    `p {
        grid-template: 'a a a' "b b b";
    }`,
    `p{grid-template:"a a a" "b b b"}`
);

test(
    'should work with css grids (2)',
    processCss,
    `p {
        grid-template-areas: 'a a a' "b b b";
    }`,
    `p{grid-template-areas:"a a a" "b b b"}`
);

test(
    'should work with list styles',
    processCss,
    `ul {
        list-style-type: '-';
    }`,
    `ul{list-style-type:"-"}`
);

test(
    'should work with text emphasis styles',
    processCss,
    `p {
        text-emphasis-style: '\\25B2';
    }`,
    `p{text-emphasis-style:"\\25B2"}`
);

test(
    'should work with text overflow',
    processCss,
    `p {
        text-overflow: '…' '…';
    }`,
    `p{text-overflow:"…" "…"}`
);

test(
    'should work with font',
    processCss,
    `p {
        font: 1em/1.5 'slab serif';
    }`,
    `p{font:1em/1.5 "slab serif"}`
);

test(
    'should work with font family',
    processCss,
    `p {
        font-family: 'slab serif';
    }`,
    `p{font-family:"slab serif"}`
);

test(
    'should work with font feature settings',
    processCss,
    `p {
        font-feature-settings: 'frac'
    }`,
    `p{font-feature-settings:"frac"}`
);

test(
    'should work with web fonts',
    processCss,
    `@font-face {
        font-family: 'slab serif';
        src: local('slab serif'), url(slab.ttf) format('truetype');
    }`,
    `@font-face{font-family:"slab serif";src:local("slab serif"),url(slab.ttf) format("truetype")}`,
    {discardUnused: false}
);

test(
    'should remove unnecessary backslashes in urls',
    processCss,
    `p{background:url('http://example.com/foo\\\'bar.jpg')}`,
    `p{background:url("http://example.com/foo\'bar.jpg")}`,
    {normalizeUrl: false}
);

test(
    'should remove unnecessary backslashes in urls',
    processCss,
    `p{background:url("http://example.com/foo\\\"bar.jpg")}`,
    `p{background:url('http://example.com/foo\"bar.jpg')}`,
    {normalizeUrl: false}
);

test(
    'should work in attribute selectors',
    processCss,
    `[rel='external link']{color:blue}`,
    `[rel="external link"]{color:blue}`,
);

test(
    'should change strings (1)',
    processCss,
    `[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:blue}`,
    `[a='escaped quotes " h1, h1, h1 " h1, h1, h1']{color:blue}`,
);

test(
    'should change strings (2)',
    processCss,
    `[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:blue}`,
    `[a="escaped quotes ' h1, h1, h1 ' h1, h1, h1"]{color:blue}`,
);

import ava from 'ava';
import postcss from 'postcss';
import plugin from '../';
import pkg from '../../package.json';
import magician from 'postcss-font-magician';

let name = pkg.name;

let tests = [{
    message: 'should trim spaces in simple selectors',
    fixture: 'h1,  h2,  h3{color:blue}',
    expected: 'h1,h2,h3{color:blue}'
}, {
    message: 'should trim spaces around combinators',
    fixture: 'h1 + p, h1 > p, h1 ~ p{color:blue}',
    expected: 'h1+p,h1>p,h1~p{color:blue}'
}, {
    message: 'should not trim meaningful spaces',
    fixture: 'h1 p,H2 p{color:blue}',
    expected: 'h1 p,H2 p{color:blue}'
}, {
    message: 'should reduce meaningful spaces',
    fixture: 'h1    p,h2     p{color:blue}',
    expected: 'h1 p,h2 p{color:blue}'
}, {
    message: 'should remove qualified universal selectors',
    fixture: '*#id,*.test,*:not(.green),*[href]{color:blue}',
    expected: '#id,.test,:not(.green),[href]{color:blue}'
}, {
    message: 'should remove complex qualified universal selectors',
    fixture: '[class] + *[href] *:not(*.green){color:blue}',
    expected: '[class]+[href] :not(.green){color:blue}'
}, {
    message: 'should remove complex qualified universal selectors (2)',
    fixture: '*:not(*.green) ~ *{color:blue}',
    expected: ':not(.green)~*{color:blue}'
}, {
    message: 'should not remove meaningful universal selectors',
    fixture: '* + *, * > *, * h1, * ~ *{color:blue}',
    expected: '*+*,*>*,* h1,*~*{color:blue}'
}, {
    message: 'should preserve the universal selector between comments',
    fixture: '/*comment*/*/*comment*/{color:blue}',
    expected: '/*comment*/*/*comment*/{color:blue}'
}, {
    message: 'should preserve the universal selector in attribute selectors',
    fixture: 'h1[class=" *.js "] + *.js{color:blue}',
    expected: 'h1[class=" *.js "]+.js{color:blue}'
}, {
    message: 'should preserve the universal selector in filenames',
    fixture: '[filename="*.js"]{color:blue}',
    expected: '[filename="*.js"]{color:blue}'
}, {
    message: 'should preserve the universal selector in file globs',
    fixture: '[glob="/**/*.js"]{color:blue}',
    expected: '[glob="/**/*.js"]{color:blue}'
}, {
    message: 'should preserve escaped zero plus sequences',
    fixture: '.\\31 0\\+,.\\31 5\\+,.\\32 0\\+{color:blue}',
    expected: '.\\31 0\\+,.\\31 5\\+,.\\32 0\\+{color:blue}'
}, {
    message: 'should handle deep combinators',
    fixture: 'body /deep/ .theme-element{color:blue}',
    expected: 'body /deep/ .theme-element{color:blue}'
}, {
    message: 'should sort using natural sort',
    fixture: '.item1, .item10, .item11, .item2{color:blue}',
    expected: '.item1,.item2,.item10,.item11{color:blue}'
}, {
    message: 'should dedupe selectors',
    fixture: 'h1,h2,h3,h4,h5,h5,h6{color:blue}',
    expected: 'h1,h2,h3,h4,h5,h6{color:blue}'
}, {
    message: 'should trim spaces in :not()',
    fixture: 'h1:not(.article, .comments){color:blue}',
    expected: 'h1:not(.article,.comments){color:blue}'
}, {
    message: 'should trim spaces in :not() (2)',
    fixture: 'h1:not(.article, .comments), h2:not(.lead, .recommendation){color:blue}',
    expected: 'h1:not(.article,.comments),h2:not(.lead,.recommendation){color:blue}'
}, {
    message: 'should dedupe simple selectors inside :not()',
    fixture: 'h1:not(h2, h3, h4, h5, h5, h6){color:blue}',
    expected: 'h1:not(h2,h3,h4,h5,h6){color:blue}'
}, {
    message: 'should normalise attribute selectors',
    fixture: 'a[   color=   "blue"    ]{color:blue}',
    expected:'a[color=blue]{color:blue}'
}, {
    message: 'should normalise attribute selectors (2)',
    fixture: 'a[class^="options["]:after{color:blue}',
    expected: 'a[class^="options["]:after{color:blue}'
}, {
    message: 'should normalise attribute selectors (3)',
    fixture: 'a[class="woop_woop_woop"]{color:blue}',
    expected: 'a[class=woop_woop_woop]{color:blue}'
}, {
    message: 'should normalise attribute selectors (4)',
    fixture: 'a[class="woop \\\nwoop woop"]{color:blue}',
    expected: 'a[class="woop woop woop"]{color:blue}'
}, {
    message: 'should convert @keyframe from & 100%',
    fixture: '@keyframes test{from{color:red}100%{color:blue}}',
    expected: '@keyframes test{0%{color:red}to{color:blue}}'
}, {
    message: 'should not mangle @keyframe from & 100% in other values',
    fixture: '@keyframes test{x-from-tag{color:red}5100%{color:blue}}',
    expected: '@keyframes test{x-from-tag{color:red}5100%{color:blue}}'
}, {
    message: 'should not be responsible for normalising comments',
    fixture: 'h1 /*!test comment*/, h2{color:blue}',
    expected: 'h1 /*!test comment*/,h2{color:blue}'
}, {
    message: 'should not be responsible for normalising coments (2)',
    fixture: '/*!test   comment*/h1, h2{color:blue}',
    expected: '/*!test   comment*/h1,h2{color:blue}'
}, {
    message: 'should transform ::before to :before',
    fixture: 'h1::before{color:blue}',
    expected: 'h1:before{color:blue}'
}, {
    message: 'should transform ::after to :after',
    fixture: 'h1::after{color:blue}',
    expected: 'h1:after{color:blue}'
}, {
    message: 'should transform ::first-letter to :first-letter',
    fixture: 'h1::first-letter{color:blue}',
    expected: 'h1:first-letter{color:blue}'
}, {
    message: 'should transform ::first-line to :first-line',
    fixture: 'h1::first-line{color:blue}',
    expected: 'h1:first-line{color:blue}'
}, {
    message: 'should not change strings',
    fixture:  ':not([attr="  h1       a + b /* not a comment */ end of :not  from 100% "]){color:blue}',
    expected: ':not([attr="  h1       a + b /* not a comment */ end of :not  from 100% "]){color:blue}'
}, {
    message: 'should not change strings (2)',
    fixture: ':not([attr="  h1       a + b /* not a comment */ not end of `:not`:  )  from 100% "]){color:blue}',
    expected: ':not([attr="  h1       a + b /* not a comment */ not end of `:not`:  )  from 100% "]){color:blue}'
}, {
    message: 'should not change strings (3)',
    fixture: '[a=":not( *.b, h1, h1 )"]{color:blue}',
    expected: '[a=":not( *.b, h1, h1 )"]{color:blue}'
}, {
    message: 'should not change strings (4)',
    fixture: '[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:blue}',
    expected: '[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:blue}'
}, {
    message: 'should not change strings (5)',
    fixture: "[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:blue}",
    expected: "[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:blue}"
}, {
    message: 'should transform qualified attribute selector inside not',
    fixture: ':not( *[href="foo"] ){color:blue}',
    expected: ':not([href=foo]){color:blue}'
}, {
    message: 'should not mangle attribute selectors',
    fixture: '[class*=" icon-"]+.label, [class^="icon-"]+.label{color:blue}',
    expected: '[class*=" icon-"]+.label,[class^=icon-]+.label{color:blue}'
}, {
    message: 'should not mangle attribute selectors (2)',
    fixture: '.control-group-inline>input[type="radio"]{color:blue}',
    expected: '.control-group-inline>input[type=radio]{color:blue}'
}, {
    message: 'should not mangle quoted attribute selectors that contain =',
    fixture: '.parent>.child[data-attr~="key1=1"]{color:blue}',
    expected: '.parent>.child[data-attr~="key1=1"]{color:blue}'
}, {
    message: 'should not mangle .from/#from etc',
    fixture: '#from,.from{color:blue}',
    expected: '#from,.from{color:blue}'
}, {
    message: 'should not mangle pseudo classes',
    fixture: '.btn-group>.btn:last-child:not(:first-child),.btn-group>.dropdown-toggle:not(:first-child){color:blue}',
    expected: '.btn-group>.btn:last-child:not(:first-child),.btn-group>.dropdown-toggle:not(:first-child){color:blue}'
}, {
    message: 'should not mangle pseudo classes (2)',
    fixture: '.btn-group>.btn-group:first-child:not(:last-child)>.btn:last-child,.btn-group>.btn-group:first-child:not(:last-child)>.dropdown-toggle{color:blue}',
    expected: '.btn-group>.btn-group:first-child:not(:last-child)>.btn:last-child,.btn-group>.btn-group:first-child:not(:last-child)>.dropdown-toggle{color:blue}',
}, {
    message: 'should not throw on polymer mixins',
    fixture: '--my-toolbar-theme:{color:blue};',
    expected: '--my-toolbar-theme:{color:blue};'
}, {
    message: 'should not throw on polymer mixins (2)',
    fixture: 'paper-button{--paper-button-ink-color:#009688}',
    expected: 'paper-button{--paper-button-ink-color:#009688}'
}, {
    message: 'should not unquote a single hyphen as an attribute value',
    fixture: '[title="-"]{color:blue}',
    expected: '[title="-"]{color:blue}'
}];

tests.forEach(({message, fixture, expected, options = {}}) => {
    ava(message, t => {
        return postcss([ plugin(options) ]).process(fixture).then(result => {
            t.deepEqual(result.css, expected);
        });
    });
});

ava('should use the postcss plugin api', t => {
    t.truthy(plugin().postcssVersion, 'should be able to access version');
    t.deepEqual(plugin().postcssPlugin, name, 'should be able to access name');
});

ava('cssnano issue 39', t => {
    const css = 'body{font:100%/1.25 "Open Sans", sans-serif;background:#F6F5F4;overflow-x:hidden}';

    t.notThrows(() => {
        return postcss([ magician(), plugin() ]).process(css).css;
    });
});

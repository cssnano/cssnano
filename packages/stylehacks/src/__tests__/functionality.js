import ava from 'ava';
import stylehacks from '../';

let tests = [{
    message: 'ie 6 underscore hack',
    fixture: 'h1 { _color: red }',
    resolution: 'h1 { }',
    target: 'ie 6',
    unaffected: 'ie 7',
    warnings: 1
}, {
    message: 'ie 5.5-7 star hack',
    fixture: '.a { !color: red; } .a { $color: red; } .a { &color: red; } .a { *color: red; } .a { )color: red; } .a { =color: red; } .a { %color: red; } .a { +color: red; } .a { @color: red; } .a { ,color: red; } .a { .color: red; } .a { /color: red; } .a { `color: red; } .a { ]color: red; } .a { #color: red; } .a { ~color: red; } .a { ?color: red; } .a { :color: red; } .a { |color: red; }',
    resolution: '.a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { } .a { }',
    target: 'ie 7',
    unaffected: 'ie 8',
    warnings: 19
}, {
    message: 'ie 5.5-7 trailing comma/slash hack',
    fixture: 'h1, { color: red } h1\\ { color: red }',
    resolution: '',
    target: 'ie 6',
    unaffected: 'ie 8',
    warnings: 2
}, {
    message: 'ie 5.5-7 important hack',
    fixture: 'h1 { color: red !ie }',
    resolution: 'h1 { }',
    target: 'ie 6',
    unaffected: 'ie 8',
    warnings: 1
}, {
    message: 'ie 8 media \\0screen hack',
    fixture: '@media \\0screen { h1 { color: red } }',
    resolution: '',
    target: 'ie 8',
    unaffected: 'ie 9',
    warnings: 1
}, {
    message: 'ie 7 media screen\\9 hack',
    fixture: '@media screen\\9 { h1 { color: red } }',
    resolution: '',
    target: 'ie 6',
    unaffected: 'ie 8',
    warnings: 1
}, {
    message: 'ie 5.5-6 * html hack',
    fixture: '* html h1 { color: red }',
    resolution: '',
    target: 'ie 6',
    unaffected: 'ie 7',
    warnings: 1
}, {
    message: 'opera html:first-child hack',
    fixture: 'html:first-child h1 { color: red }',
    resolution: '',
    target: 'opera 9',
    unaffected: 'safari 8',
    warnings: 1
}, {
    message: 'firefox empty body hack',
    fixture: 'body:empty h1 { color: red }',
    resolution: '',
    target: 'firefox 2',
    unaffected: 'firefox 3',
    warnings: 1
}, {
    message: 'html combinator comment body hack',
    fixture: 'html > /**/ body h1 { color: red } html ~ /**/ body h1 { color: red }',
    resolution: '',
    target: 'ie 6',
    unaffected: 'ie 8',
    warnings: 2
}, {
    message: 'ie 6-8 \\9 hack',
    fixture: 'h1 { margin-top: 1px\\9; }',
    resolution: 'h1 { }',
    target: 'ie 8',
    unaffected: 'ie 9',
    warnings: 1
}];

let process = (css, options, callback) => {
    stylehacks.process(css, options).then(result => {
        callback(result.css, result.warnings());
    });
};

tests.forEach(test => {
    ava(test.message, t => {
        return Promise.all([
            process(test.fixture, {browsers: test.target}, css => {
                t.same(css, test.fixture, 'should preserve the hack');
            }),
            process(test.fixture, {browsers: test.unaffected}, css => {
                t.same(css, test.resolution, 'should remove the hack');
            }),
            process(test.fixture, {browsers: test.unaffected, lint: true, silent: true}, (css, warnings) => {
                t.same(warnings.length, test.warnings, 'should emit the correct amount of warnings');
            })
        ]);
    });
});

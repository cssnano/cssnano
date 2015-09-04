var test = require('tape');
var minifyFont = require('../lib/minify-font');

var tests = [
    {
        options: {},
        fixture: [
            { type: 'word', value: 'bold' },
            { type: 'space', value: '  ' },
            { type: 'word', value: 'italic' },
            { type: 'space', value: ' \t ' },
            { type: 'word', value: '20px' },
            { type: 'space', value: ' \n ' },
            { type: 'word', value: 'Times' },
            { type: 'space', value: ' ' },
            { type: 'word', value: 'New' },
            { type: 'space', value: ' \t ' },
            { type: 'word', value: 'Roman' },
            { type: 'div', value: ',',  before: '', after: ' ' },
            { type: 'word', value: 'serif' }
        ],
        expected: [
            { type: 'word', value: '700' },
            { type: 'space', value: ' ' },
            { type: 'word', value: 'italic' },
            { type: 'space', value: ' ' },
            { type: 'word', value: '20px' },
            { type: 'space', value: ' ' },
            { type: 'word', value: 'Times New Roman,serif' }
        ]
    }
];

test('minify-font', function (t) {
    t.plan(tests.length);

    tests.forEach(function (test) {
        t.deepEqual(minifyFont(test.fixture, test.options), test.expected);
    });
});

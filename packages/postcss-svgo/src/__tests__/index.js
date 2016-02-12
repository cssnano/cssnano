import ava from 'ava';
import postcss from 'postcss';
import plugin from '../';
import filters from 'pleeease-filters';
import pkg from '../../package.json';
import {encode, decode} from '../lib/url';
import {readFileSync as file} from 'fs';

let name = pkg.name;

let tests = [{
    message: 'should optimise inline svg',
    fixture: 'h1{background:url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    expected: 'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')}',
}, {
    message: 'should optimise inline svg in all urls',
    fixture: 'h1{background:' + [
        'url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')',
        'url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')'
    ].join(' ') + '}',
    expected: 'h1{background:' + [
        'url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')',
        'url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')'
    ].join(' ') + '}',
}, {
    message: 'should optimise inline svg with standard charset definition',
    fixture: 'h1{background:url(\'data:image/svg+xml;charset=utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    expected: 'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')}',
}, {
    message: 'should optimise inline svg without charset definition',
    fixture: 'h1{background:url(\'data:image/svg+xml,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    expected: 'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')}',
}, {
    message: 'should optimise uri-encoded inline svg',
    fixture: 'h1{background:url(\'data:image/svg+xml;utf-8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf-8%22%3F%3E%3C!DOCTYPE%20svg%20PUBLIC%20%22-%2F%2FW3C%2F%2FDTD%20SVG%201.1%2F%2FEN%22%20%22http%3A%2F%2Fwww.w3.org%2FGraphics%2FSVG%2F1.1%2FDTD%2Fsvg11.dtd%22%3E%3Csvg%20version%3D%221.1%22%20id%3D%22Layer_1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20xml%3Aspace%3D%22preserve%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22yellow%22%20%2F%3E%3C!--test%20comment--%3E%3C%2Fsvg%3E\')}',
    expected: 'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'40\' fill=\'%23ff0\'/%3E%3C/svg%3E")}',
}, {
    message: 'should allow users to customise the output',
    fixture: 'h1{background:url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    expected: 'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/><!--test comment--></svg>\')}',
    options: {plugins: [{removeComments: false}]}
}, {
    message: 'should not mangle filter effects',
    fixture: 'h1{filter:blur(5px)}',
    expected: 'h1{filter:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><filter id="filter"><feGaussianBlur stdDeviation="5" /></filter></svg>#filter\');filter:blur(5px)}'
}, {
    message: 'should not throw when decoding a svg',
    fixture: 'h1{-webkit-mask-box-image: url("data:image/svg+xml;charset=utf-8,<svg height=\'35\' viewBox=\'0 0 96 70\' width=\'48\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'m84 35c1 7-5 37-42 35-37 2-43-28-42-35-1-7 5-37 42-35 37-2 43 28 42 35z\'/></svg>") 50% 56% 46% 42%;}',
    expected: 'h1{-webkit-mask-box-image: url(\'data:image/svg+xml;charset=utf-8,<svg height="35" viewBox="0 0 96 70" width="48" xmlns="http://www.w3.org/2000/svg"><path d="M84 35c1 7-5 37-42 35C5 72-1 42 0 35-1 28 5-2 42 0c37-2 43 28 42 35z"/></svg>\') 50% 56% 46% 42%;}'
}, {
    message: 'should encode unencoded data',
    fixture: 'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')}',
    expected: 'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'40\' fill=\'%23ff0\'/%3E%3C/svg%3E")}',
    options: {
        encode: true
    }
}, {
    message: 'should decode encoded data',
    fixture: 'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'40\' fill=\'%23ff0\'/%3E%3C/svg%3E")}',
    expected: 'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')}',
    options: {
        encode: false
    }
}];

tests.forEach(({message, fixture, expected, options = {}}) => {
    ava(message, t => {
        return postcss([ filters(), plugin(options) ]).process(fixture).then(result => {
            t.same(result.css, expected);
        });
    });
});

ava('should not crash on malformed urls when encoded', t => {
    const svg = encode(file('./border.svg', 'utf-8'));
    t.doesNotThrow(() => {
        decode(svg);
    });
});

ava('should use the postcss plugin api', t => {
    t.plan(2);
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.same(plugin().postcssPlugin, name, 'should be able to access name');
});

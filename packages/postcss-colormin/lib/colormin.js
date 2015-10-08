'use strict';

var convert = require('colr-convert');
var keywords = require('css-color-names');
var hexes = {};
var round = Math.round;

Object.keys(keywords).forEach(function (keyword) {
    hexes[keywords[keyword]] = keyword;
});

function shorter (a, b) {
    return (a && a.length < b.length ? a : b).toLowerCase();
}

function hexToLonghand (hex) {
    var h = hex.substring(1);
    var r = h[0];
    var g = h[1];
    var b = h[2];
    return h.length === 3 && '#' + r + r + g + g + b + b || hex;
}

function hexToShorthand (hex) {
    if (hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]) {
        return '#' + hex[2] + hex[4] + hex[6];
    }
    return hex;
}

function dropLeadingZero (number) {
    var value = String(number);

    if (number % 1) {
        if (value[0] === '0') {
            return value.slice(1);
        }

        if (value[0] === '-' && value[1] === '0') {
            return '-' + value.slice(2);
        }
    }

    return value;
}

module.exports = function (name, args) {
    var rgb, hsl;
    if (name === 'rgb' || name === 'rgba' || name === 'hsl' || name === 'hsla') {
        if (name === 'rgba' || name === 'hsla') {
            if (args[3] === 1) {
                name = name.slice(0, 3);
            } else {
                args[3] = dropLeadingZero(args[3]);
            }
        }
        if (name === 'hsl') {
            name = 'rgb';
            args = convert.hsl.rgb(args);
            args[0] = round(args[0]);
            args[1] = round(args[1]);
            args[2] = round(args[2]);
        }
        if (name === 'rgb') {
            name = convert.rgb.hex(args);
        } else {
            // alpha convertion
            if (name === 'rgba') {
                rgb = args;
                hsl = convert.rgb.hsl(args);
                hsl[0] = round(hsl[0]);
                hsl[1] = round(hsl[1]) + '%';
                hsl[2] = round(hsl[2]) + '%';
                hsl.push(args[3]);
            } else {
                hsl = args;
                rgb = convert.rgb.hsl(args);
                rgb[0] = round(rgb[0]);
                rgb[1] = round(rgb[1]);
                rgb[2] = round(rgb[2]);
                rgb.push(args[3]);
            }
            return shorter('hsla(' + hsl.join() + ')', 'rgba(' + rgb.join() + ')');
        }
    } else {
        if (name[0] === '#') {
            name = hexToLonghand(name);
        }
    }

    if (name in hexes) {
        name = shorter(hexToShorthand(name), hexes[name]);
    } else if (name in keywords) {
        name = shorter(name, hexToShorthand(keywords[name]));
    }

    return name;
};

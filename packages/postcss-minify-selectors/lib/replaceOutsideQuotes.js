'use strict';

var quoteRegex = /['"]/;

module.exports = function replaceOutsideQuotes (selector, callback) {
    var pos = 0;
    var ranges = [];
    var currentObj = false;
    var inQuotes = false;

    while (pos < selector.length) {
        var letter = selector.charAt(pos);
        var slash = selector.charAt(pos - 1) !== '\\';

        if (!currentObj) {
            currentObj = {start: pos, text: ''};
        }

        if (!inQuotes) {
            if (quoteRegex.test(letter) && slash) {
                currentObj.end = pos;
                ranges.push(currentObj);
                currentObj = {start: pos + 1, text: ''};
                inQuotes = letter;
            } else {
                currentObj.type = 'outside';
            }
        }

        if (letter === inQuotes && slash && currentObj.start !== pos + 1) {
            currentObj.text += letter;
            currentObj.type = 'inside';
            currentObj.end = pos;
            ranges.push(currentObj);
            currentObj = {start: pos + 1, text: ''};
            inQuotes = false;
        } else {
            currentObj.text += letter;
        }
        pos++;
    }

    currentObj.end = pos;
    ranges.push(currentObj);

    ranges.forEach(function (range) {
        if (range.type === 'outside') {
            var sub = selector.substring(range.start, range.end);
            var replacement = callback.call(this, sub);
            selector = selector.replace(range.text, replacement);
        }
    });

    return selector;
}

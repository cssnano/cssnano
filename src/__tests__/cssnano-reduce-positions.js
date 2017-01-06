import test from 'ava';
import processCss from './_processCss';

const directions = ['top', 'right', 'bottom', 'left', 'center'];
const horizontal = {
    right: '100%',
    left: '0',
};

const vertical = {
    bottom: '100%',
    top: '0',
};

const hkeys = Object.keys(horizontal);
const vkeys = Object.keys(vertical);

function suite (t, property, additional = '', tail = '') {
    const tests = [];
    const push = (...examples) => {
        examples.forEach(({fixture, expected}) => {
            tests.push(
                processCss(
                    t,
                    `${property}${additional}${fixture}${tail}`,
                    `${property}${additional}${expected}${tail}}`
                ),
                processCss(
                    t,
                    `${property}${additional}${fixture}${tail}, ${fixture}${tail}`,
                    `${property}${additional}${expected}${tail},${expected}${tail}`
                ),
            );
        });
    };

    if (property === 'background:') {
        push({
            message: 'should convert <percentage> center/50% 50% to <percentage>/50% 50%',
            fixture: '30% center/50% 50%',
            expected: '30%/50% 50%',
        });
    }
    push({
        message: 'should convert <percentage> center to <percentage>',
        fixture: `30% center`,
        expected: `30%`,
    }, {
        message: 'should not convert <percentage> <percentage>',
        fixture: `45% 60%`,
        expected: `45% 60%`,
    });
    directions.forEach(direction => {
        let conversion = horizontal[direction] || direction;
        if (direction === 'center') {
            conversion = '50%';
        }
        if (direction === 'right' || direction === 'left' || direction === 'center') {
            push({
                message: `should convert "${direction}" to "${conversion}"`,
                fixture: `${direction}`,
                expected: `${conversion}`,
            });
        }
        push({
            message: `should convert "${direction} center" to "${conversion}"`,
            fixture: `${direction} center`,
            expected: `${conversion}`,
        });
        if (direction === 'center') {
            return;
        }
        push({
            message: `should convert "center ${direction}" to "${conversion}"`,
            fixture: `center ${direction}`,
            expected: `${conversion}`,
        });
        directions.slice(0, -1).filter(d => {
            if (
                d === direction ||
                (~hkeys.indexOf(d) && ~hkeys.indexOf(direction)) ||
                (~vkeys.indexOf(d) && ~vkeys.indexOf(direction))
            ) {
                return false;
            }
            return true;
        }).forEach(other => {
            let result;
            if (~Object.keys(horizontal).indexOf(direction)) {
                result = horizontal[direction] + ' ' + vertical[other];
            } else {
                result = horizontal[other] + ' ' + vertical[direction];
            }
            push({
                message: `should convert "${direction} ${other}" to "${result}"`,
                fixture: `${direction} ${other}`,
                expected: `${result}`,
            }, {
                message: `should not convert the three value syntax "${direction} ${other} 60px"`,
                fixture: `${direction} ${other} 60px`,
                expected: `${direction} ${other} 60px`,
            });
            if (property === 'background:') {
                push({
                    message: `should convert "${direction} ${other}"/50% 50% to "${result}/50% 50%"`,
                    fixture: `${direction} ${other}/50% 50%`,
                    expected: `${result}/50% 50%`,
                });
            }
        });
    });

    return Promise.all(tests);
}

test(
    suite,
    'background:',
    'url(http://example.com/testing/test.png) no-repeat ',
    ' #fff'
);

test(
    suite,
    'background-position:'
);

test(
    suite,
    'background:',
    '#000 url(cat.jpg) '
);

test(
    suite,
    'perspective-origin:'
);

test(
    suite,
    '-webkit-perspective-origin:'
);


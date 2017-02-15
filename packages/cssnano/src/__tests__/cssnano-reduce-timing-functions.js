import test from 'ava';
import processCss from './_processCss';

function testTimingFunction (t, fixture, expected) {
    return Promise.all([
        processCss(t, `animation:fade 3s ${fixture}`, `animation:fade 3s ${expected}`),
        processCss(t, `animation-timing-function:${fixture}`, `animation-timing-function:${expected}`),
        processCss(t, `transition:color 3s ${fixture}`, `transition:color 3s ${expected}`),
        processCss(t, `transition-timing-function:${fixture}`, `transition-timing-function:${expected}`),
    ]);
}

function testPassthrough (t, fixture) {
    return testTimingFunction(t, fixture, fixture);
}

test(
    testTimingFunction,
    'cubic-bezier(0.25, 0.1, 0.25, 1)',
    'ease'
);

test(
    testTimingFunction,
    'cubic-bezier(0, 0, 1, 1)',
    'linear'
);

test(
    testTimingFunction,
    'cubic-bezier(0.42, 0, 1, 1)',
    'ease-in'
);

test(
    testTimingFunction,
    'cubic-bezier(0, 0, 0.58, 1)',
    'ease-out'
);

test(
    testTimingFunction,
    'cubic-bezier(0.42, 0, 0.58, 1)',
    'ease-in-out'
);

test(
    testTimingFunction,
    'steps(1, start)',
    'step-start'
);

test(
    testPassthrough,
    'steps(1)'
);

test(
    testTimingFunction,
    'steps(5, start)',
    'steps(5,start)'
);

test(
    testTimingFunction,
    'steps(10, end)',
    'steps(10)'
);

test(
    testPassthrough,
    'steps(15)'
);

test(
    testPassthrough,
    'var(--anim1)'
);

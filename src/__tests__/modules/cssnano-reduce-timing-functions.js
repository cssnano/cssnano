const tests = [];

const mappings = {
    ease:              'cubic-bezier(0.25, 0.1, 0.25, 1)',
    linear:            'cubic-bezier(0, 0, 1, 1)',
    'ease-in':         'cubic-bezier(0.42, 0, 1, 1)',
    'ease-out':        'cubic-bezier(0, 0, 0.58, 1)',
    'ease-in-out':     'cubic-bezier(0.42, 0, 0.58, 1)',
    'step-start':      'steps(1, start)',
    'steps(1)':        'steps(1)',
    'steps(5,start)':  'steps(5, start)',
    'steps(10)':       'steps(10, end)',
    'steps(15)':       'steps(15)',
    'var(--anim1)':    'var(--anim1)'
};

Object.keys(mappings).forEach(mapping => {
    tests.push({
        message: `should handle ${mapping} (animation)`,
        fixture: `animation:fade 3s ${mappings[mapping]}`,
        expected: `animation:fade 3s ${mapping}`
    }, {
        message: `should handle ${mapping} (animation-timing-function)`,
        fixture: `animation-timing-function:${mappings[mapping]}`,
        expected: `animation-timing-function:${mapping}`
    }, {
        message: `should handle ${mapping} (transition)`,
        fixture: `transition:color 3s ${mappings[mapping]}`,
        expected: `transition:color 3s ${mapping}`
    }, {
        message: `should handle ${mapping} (transition-timing-function)`,
        fixture: `transition-timing-function:${mappings[mapping]}`,
        expected: `transition-timing-function:${mapping}`
    });
});

module.exports.name = 'cssnano/reduce-timing-functions';
module.exports.tests = tests;

const tests = [{
    message: 'should pass through two value syntax',
    fixture: 'background:space round',
    expected: 'background:space round',
}];

const mappings = {
    'repeat-x': 'repeat no-repeat',
    'repeat-y': 'no-repeat repeat',
    repeat: 'repeat repeat',
    space: 'space space',
    round: 'round round',
    'no-repeat': 'no-repeat no-repeat',
};

Object.keys(mappings).forEach(mapping => {
    tests.push({
        message: `should handle ${mapping} (background)`,
        fixture: `background:#000 url(cat.jpg) ${mappings[mapping]} 50%`,
        expected: `background:#000 url(cat.jpg) ${mapping} 50%`,
    }, {
        message: `should handle ${mapping} (background-repeat)`,
        fixture: `background-repeat:${mappings[mapping]}`,
        expected: `background-repeat:${mapping}`,
    }, {
        message: `should handle multiple instances (background)`,
        fixture: `background-repeat:#000 url(cat.jpg) ${mappings[mapping]} 50%,#000 url(cat.jpg) ${mappings[mapping]} 50%`,
        expected: `background-repeat:#000 url(cat.jpg) ${mapping} 50%,#000 url(cat.jpg) ${mapping} 50%`,
    }, {
        message: `should handle multiple instances (background-repeat)`,
        fixture: `background-repeat:${mappings[mapping]},${mappings[mapping]}`,
        expected: `background-repeat:${mapping},${mapping}`,
    });
});

module.exports.name = 'cssnano/reduce-background-repeat';
module.exports.tests = tests;

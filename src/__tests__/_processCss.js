import cssnano from '..';

export default function processCss (t, fixture, expected, options = {}) {
    return cssnano.process(fixture, options).then(({css}) => {
        t.deepEqual(css, expected);
    });
}

import test from 'ava';
import webpack from 'webpack';
import conf from './_webpack.config';

// test.cb

test.skip('cssnano should be consumed by webpack', t => {
    webpack(conf, (err, stats) => {
        if (err) {
            t.fail();
            throw err;
        }

        t.falsy(stats.hasErrors(), 'should not report any error');
        t.falsy(stats.hasWarnings(), 'should not report any warning');
        t.end();
    });
});

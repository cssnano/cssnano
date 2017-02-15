const write = require('fs').writeFileSync;
const join = require('path').join;
const postcss = require('postcss');
const frameworks = require('css-frameworks');
const nano = require('../../../dist');
const formatter = require('./formatter');

const base = join(__dirname, '../integrations');

Object.keys(frameworks).forEach(f => {
    postcss([ nano(), formatter ]).process(frameworks[f]).then((res) => {
        write(join(base, f + '.css'), res.css);
    });
});

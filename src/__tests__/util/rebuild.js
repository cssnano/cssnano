const nano = require('../../../dist');
const write = require('fs').writeFileSync;
const postcss = require('postcss');
const formatter = require('./formatter');
const path = require('path');
const base = path.join(__dirname, '../integrations');

const frameworks = require('css-frameworks');

Object.keys(frameworks).forEach(f => {
    postcss([ nano(), formatter ]).process(frameworks[f]).then(res => {
        write(path.join(base, f + '.css'), res.css);
    });
});

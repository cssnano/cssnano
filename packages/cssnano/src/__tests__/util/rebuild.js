import {writeFileSync as write} from 'fs';
import {join} from 'path';
import postcss from 'postcss';
import frameworks from '../../../../../util/frameworks';
import nano from '../../';
import formatter from './formatter';

const base = join(__dirname, '../integrations');

Object.keys(frameworks).forEach(f => {
    postcss([ nano(), formatter ]).process(frameworks[f]).then((res) => {
        write(join(base, f + '.css'), res.css);
    });
});

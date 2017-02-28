import fs from 'fs';
import {join} from 'path';

function base (filepath = '') {
    return join(
        __dirname,
        '../frameworks',
        filepath
    );
}

export default fs.readdirSync(base()).reduce((list, framework) => {
    list[framework.split('.')[0]] = fs.readFileSync(base(framework), 'utf8');
    return list;
}, {});

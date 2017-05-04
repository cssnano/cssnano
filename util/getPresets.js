import {basename} from 'path';

export default function getPresets (packages) {
    return packages.filter(p => !basename(p).indexOf('cssnano-preset-'));
}

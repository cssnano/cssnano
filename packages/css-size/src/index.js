import nano from 'cssnano';
import prettyBytes from 'pretty-bytes';
import {sync as gzip} from 'gzip-size';
import Table from 'cli-table';
import round from 'round-precision';

const cssSize = (css, opts) => {
    css = css.toString();
    return nano.process(css, opts).then(result => {
        let original = gzip(css);
        let minified = gzip(result.css);

        return {
            original: prettyBytes(original),
            minified: prettyBytes(minified),
            difference: prettyBytes(original - minified),
            percent: round((minified / original) * 100, 2) + '%',
        };
    });
};

export function table (css, opts) {
    let output = new Table();
    return cssSize(css, opts).then(result => {
        output.push.apply(output, Object.keys(result).map((key, i) => {
            let label = key.slice(0, 1).toUpperCase() + key.slice(1);
            if (i < 2) {
                label += ' (gzip)';
            }
            let row = {};
            row[label] = result[key];
            return row;
        }));
        return output.toString();
    });
};

export default cssSize;

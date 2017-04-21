import nano from 'lerna:cssnano';
import prettyBytes from 'pretty-bytes';
import {sync as gzip} from 'gzip-size';
import {sync as brotli} from 'brotli-size';
import Table from 'cli-table';
import round from 'round-precision';

const getBinarySize = (string) => {
    return Buffer.byteLength(string, 'utf8');
};

const percentDifference = (original, minified) => {
    return round((minified / original) * 100, 2) + '%';
};

const cssSize = (css, opts, processor) => {
    processor = processor || nano.process.bind(nano);
    css = css.toString();
    return processor(css, opts).then(result => {
        let originalUncompressed = getBinarySize(css);
        let minifiedUncompressed = getBinarySize(result.css);

        let originalGzip = gzip(css);
        let minifiedGzip = gzip(result.css);

        let originalBrotli = brotli(css);
        let minifiedBrotli = brotli(result.css);

        return {
            uncompressed: {
                original: prettyBytes(originalUncompressed),
                processed: prettyBytes(minifiedUncompressed),
                difference: prettyBytes(originalUncompressed - minifiedUncompressed),
                percent: percentDifference(originalUncompressed, minifiedUncompressed),
            },
            gzip: {
                original: prettyBytes(originalGzip),
                processed: prettyBytes(minifiedGzip),
                difference: prettyBytes(originalGzip - minifiedGzip),
                percent: percentDifference(originalGzip, minifiedGzip),
            },
            brotli: {
                original: prettyBytes(originalBrotli),
                processed: prettyBytes(minifiedBrotli),
                difference: prettyBytes(originalBrotli - minifiedBrotli),
                percent: percentDifference(originalBrotli, minifiedBrotli),
            },
        };
    });
};

const tableize = (data) => {
    return {
        head: ["", "Uncompressed", "Gzip", "Brotli"],
        rows: [
            {Original:   [
                data.uncompressed.original,
                data.gzip.original,
                data.brotli.original ]},
            {Processed:  [
                data.uncompressed.processed,
                data.gzip.processed,
                data.brotli.processed ]},
            {Difference: [
                data.uncompressed.difference,
                data.gzip.difference,
                data.brotli.difference ]},
            {Percent:    [
                data.uncompressed.percent,
                data.gzip.percent,
                data.brotli.percent ]},
        ],
    };
};

export function table (css, opts, processor) {
    return cssSize(css, opts, processor).then(data => {
        let result = tableize(data);
        let output = new Table({head: result.head});
        output.push.apply(output, result.rows);
        return output.toString();
    });
};

export default cssSize;

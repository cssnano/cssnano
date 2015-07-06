'use strict';

import postcss from 'postcss';
import reporter from 'postcss-reporter';
import browserslist from 'browserslist';
import formatter from './formatter';

// plugins
import important from './plugins/important';
import leadingStar from './plugins/leadingStar';
import leadingUnderscore from './plugins/leadingUnderscore';
import mediaSlash0 from './plugins/mediaSlash0';
import mediaSlash9 from './plugins/mediaSlash9';
import starHtml from './plugins/starHtml';
import trailingSlashComma from './plugins/trailingSlashComma';

let plugins = [
    important,
    leadingStar,
    leadingUnderscore,
    mediaSlash0,
    mediaSlash9,
    starHtml,
    trailingSlashComma
];

let stylehacks = postcss.plugin('stylehacks', (opts = {}) => {
    let b = opts.browsers;
    let browsers = (b instanceof Array) ? b : browserslist(b);

    return (css, result) => {
        plugins.forEach(Plugin => {
            let hack = new Plugin(css, result);
            let applied = browsers.some(browser => {
                return hack.targets.some(target => {
                    return browser === target;
                });
            });
            if (applied) {
                return;
            }
            if (opts.lint) {
                return hack.detectAndWarn();
            }
            return hack.detectAndResolve();
        });
    }
});

stylehacks.process = (css, opts = {}) => {
    opts.reporter = {};
    opts.reporter.formatter = formatter;
    opts.map = opts.map || (opts.sourcemap ? true : null);
    let processor = postcss([ stylehacks(opts) ]);
    if (opts.lint && !opts.silent) {
        processor.use(reporter(opts.reporter));
    }
    return processor.process(css, opts);
}

export default stylehacks;

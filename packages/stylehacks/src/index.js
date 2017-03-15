import postcss from 'postcss';
import browserslist from 'browserslist';
import plugins from './plugins';

const stylehacks = postcss.plugin('stylehacks', (opts = {}) => {
    return (css, result) => {
        const resultOpts = result.opts;
        const browsers = browserslist(null, {
            stats: resultOpts && resultOpts.stats,
            path: resultOpts && resultOpts.from,
            env: resultOpts && resultOpts.env,
        });
        const processors = plugins.reduce((list, Plugin) => {
            const hack = new Plugin(result);
            const applied = browsers.some(browser => {
                return hack.targets.some(target => browser === target);
            });
            if (applied) {
                return list;
            }
            return [...list, hack];
        }, []);
        css.walk(node => {
            processors.forEach(proc => {
                if (!~proc.nodeTypes.indexOf(node.type)) {
                    return;
                }
                if (opts.lint) {
                    return proc.detectAndWarn(node);
                }
                return proc.detectAndResolve(node);
            });
        });
    };
});

stylehacks.detect = node => {
    return plugins.some(Plugin => {
        const hack = new Plugin();
        return hack.any(node);
    });
};

export default stylehacks;

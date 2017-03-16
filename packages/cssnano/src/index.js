import postcss from 'postcss';
import cosmiconfig from 'cosmiconfig';
import isResolvable from 'is-resolvable';
import defaultPreset from 'lerna:cssnano-preset-default';

const cssnano = 'cssnano';

const explorer = cosmiconfig(cssnano, {
    rc: false,
    argv: false,
});

function initializePlugin (plugin, css, result) {
    if (Array.isArray(plugin)) {
        const [processor, opts] = plugin;
        if (
            typeof opts === 'undefined' ||
            (typeof opts === 'object' && !opts.exclude)
        ) {
            return Promise.resolve(
                processor(opts)(css, result)
            );
        }
    } else {
        return Promise.resolve(
            plugin()(css, result)
        );
    }
    // Handle excluded plugins
    return Promise.resolve();
}

function fromFile (css, result) {
    const filePath = css.source.input && css.source.input.file || process.cwd();
    result.messages.push({
        type: 'debug',
        plugin: cssnano,
        message: `Using config relative to "${filePath}"`,
    });
    return filePath;
}

function resolvePreset (config) {
    const {preset} = config;
    // For JS setups where we invoked the preset already
    if (typeof preset === 'object' && preset.plugins) {
        return Promise.resolve(preset.plugins);
    }
    // Provide an alias for the default preset, as it is built-in.
    if (preset === 'default') {
        return Promise.resolve(defaultPreset(config.presetOptions).plugins);
    }
    // For non-JS setups; we'll need to invoke the preset ourselves.
    if (typeof preset === 'function') {
        return Promise.resolve(preset(config.presetOptions).plugins);
    }
    // Try loading a preset from node_modules
    if (isResolvable(preset)) {
        return Promise.resolve(require(preset)(config.presetOptions).plugins);
    }
    // Try loading a preset from node_modules (sugar)
    if (isResolvable(`cssnano-preset-${preset}`)) {
        return Promise.resolve(require(`cssnano-preset-${preset}`)(config.presetOptions).plugins);
    }
    // If all else fails, we probably have a typo in the config somewhere
    throw new Error(`Cannot load preset "${preset}". Please check your configuration for errors and try again.`);
}

/*
 * cssnano will look for configuration firstly as options passed
 * directly to it, and failing this it will use cosmiconfig to
 * load an external file.
 */

function resolveConfig (css, result, options) {
    if (options.preset) {
        return resolvePreset(options);
    }
    return explorer.load(fromFile(css, result)).then(config => {
        if (config === null) {
            return resolvePreset({preset: 'default'});
        }
        return resolvePreset(config);
    });
}

export default postcss.plugin(cssnano, (options = {}) => {
    return (css, result) => {
        return resolveConfig(css, result, options).then((plugins) => {
            return plugins.reduce((promise, plugin) => {
                return promise.then(initializePlugin.bind(null, plugin, css, result));
            }, Promise.resolve());
        });
    };
});

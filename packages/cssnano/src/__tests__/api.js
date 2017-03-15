import postcss from 'postcss';
import ava from 'ava';
import nano from '..';
import {usePostCSSPlugin} from '../../../../util/testHelpers';

function pluginMacro (t, instance) {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#fff}';

    return instance.process(css).then((result) => {
        t.deepEqual(result.css, min);
    });
}

ava('can be used as a postcss plugin', pluginMacro, postcss().use(nano()));
ava('can be used as a postcss plugin (2)', pluginMacro, postcss([nano()]));
ava('can be used as a postcss plugin (3)', pluginMacro, postcss(nano));

ava(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    nano()
);

ava('should work with sourcemaps', t => {
    return nano.process('h1{z-index:1}', {map: {inline: true}}).then(({css}) => {
        const hasMap = /sourceMappingURL=data:application\/json;base64/.test(css);
        t.truthy(hasMap);
    });
});

import browserslist from "browserslist";
import postcss from "postcss";
import valueParser, {stringify} from "postcss-value-parser";
import colormin from "./colours";

function walk (parent, callback) {
    parent.nodes.forEach((node, index) => {
        const bubble = callback(node, index, parent);

        if (node.nodes && bubble !== false) {
            walk(node, callback);
        }
    });
}

/*
 * IE 8 & 9 do not properly handle clicks on elements
 * with a `transparent` `background-color`.
 *
 * https://developer.mozilla.org/en-US/docs/Web/Events/click#Internet_Explorer
 *
 * Firefox Quantum (57) and above has a bug where it will render a black box on inputs
 * when background is set to `transparent !important` in Windows High Contrast Mode.
 *
 * https://github.com/cssnano/cssnano/issues/715
 */

function hasTransparentBug (browser) {

    const browsersWithTransparentBug = ["ie 8", "ie 9"]
    const browserVersionNumber = Number(browser.split(' ').pop());
    const firefoxQuantum = 57;
    //const firefoxTransparentBugFixedVersion; //TODO: Waiting on this bug to be fixed https://bugzilla.mozilla.org/show_bug.cgi?id=1536616

    if (browser.includes('firefox')){
        if (browserVersionNumber >= firefoxQuantum) { // && browserVersionNumber < firefoxTransparentBugFixedVersion) {
            browsersWithTransparentBug.push(browser);
        }
    }

    return ~browsersWithTransparentBug.indexOf(browser);
}

export default postcss.plugin("postcss-colormin", () => {
    return (css, result) => {
        const resultOpts = result.opts || {};
        const browsers = browserslist(null, {
            stats: resultOpts.stats,
            path: __dirname,
            env: resultOpts.env,
        });
        const isLegacy = browsers.some(hasTransparentBug);
        const colorminCache = {};
        const cache = {};

        css.walkDecls(decl => {
            if (
                /^(composes|font|filter|-webkit-tap-highlight-color)/i.test(
                    decl.prop
                )
            ) {
                return;
            }

            if (cache[decl.value]) {
                decl.value = cache[decl.value];

                return;
            }

            const parsed = valueParser(decl.value);

            walk(parsed, (node, index, parent) => {
                if (node.type === "function") {
                    if (/^(rgb|hsl)a?$/i.test(node.value)) {
                        const {value} = node;

                        node.value = colormin(
                            stringify(node),
                            isLegacy,
                            colorminCache
                        );
                        node.type = "word";

                        const next = parent.nodes[index + 1];

                        if (
                            node.value !== value &&
                            next &&
                            (next.type === "word" || next.type === "function")
                        ) {
                            parent.nodes.splice(index + 1, 0, {
                                type: "space",
                                value: " ",
                            });
                        }
                    } else if (node.value.toLowerCase() === "calc") {
                        return false;
                    }
                } else if (node.type === "word") {
                    node.value = colormin(node.value, isLegacy, colorminCache);
                }
            });

            const optimizedValue = parsed.toString();

            decl.value = optimizedValue;
            cache[decl.value] = optimizedValue;
        });
    };
});

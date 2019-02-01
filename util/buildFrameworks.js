import {join} from "path";
import glob from "glob";
import fs from "fs-extra";
import postcss from "postcss";
import cssnano from "../packages/cssnano";
import frameworks from "./frameworks";

function rebuild (pkg) {
    return Object.keys(frameworks).forEach(framework => {
        const presetModule = require(pkg);
        const preset = presetModule();

        return postcss([cssnano({preset})])
            .process(frameworks[framework])
            .then(result => {
                return fs.writeFile(
                    `${pkg}/src/__tests__/integrations/${framework}.css`,
                    result.css
                );
            });
    });
}

glob(`${join(__dirname, "../packages")}/cssnano-preset-*`, (err, packages) => {
    if (err) {
        throw err;
    }
    packages.forEach(rebuild);
});

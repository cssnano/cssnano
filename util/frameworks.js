import fs from "fs";
import {join, basename} from "path";

function base (filepath = "") {
    return join(__dirname, "../frameworks", filepath);
}

export default fs.readdirSync(base()).reduce((list, framework) => {
    list[basename(framework, ".css")] = fs.readFileSync(
        base(framework),
        "utf8"
    );

    return list;
}, {});

import builder from "phenomic/lib/builder";
import store from "../web_modules/app/store";
import config from "./config.js";

const exports = {
    metadata: require.resolve("../web_modules/app/metadata"),
    routes: require.resolve("../web_modules/app/routes"),
};

builder({
    config,
    exports,
    store,
});

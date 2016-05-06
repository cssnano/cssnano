import phenomicStatic from "phenomic/lib/static";
import metadata from "../web_modules/app/metadata";
import routes from "../web_modules/app/routes";
import store from "../web_modules/app/store";

module.exports = (options) =>
    phenomicStatic({
        ...options,
        metadata,
        routes,
        store,
    });

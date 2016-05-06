import "whatwg-fetch";
import phenomicClient from "phenomic/lib/client";
import metadata from "../web_modules/app/metadata";
import routes from "../web_modules/app/routes";
import store from "../web_modules/app/store";

phenomicClient({
    metadata,
    routes,
    store,
});

// md files → JSON && generate collection + hot loading for dev
let mdContext = require.context("../content", true, /\.md$/);
mdContext.keys().forEach(mdContext);
if (module.hot) {
    const mdHotUpdater = require("phenomic/lib/client/hot-md").default;
    module.hot.accept(mdContext.id, () => {
        mdContext = require.context("../content", true, /\.md$/);
        const requireUpdate = mdHotUpdater(mdContext, window.__COLLECTION__, store);
        mdContext.keys().forEach(requireUpdate);
    });
}

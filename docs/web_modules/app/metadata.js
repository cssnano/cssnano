import camel from 'camelcase';
import {phenomic} from "../../package.json";
import cssnano from '../../../package.json';
import meta from '../../../metadata';

meta.modules.forEach(module => {
    module.shortName = camel(module.name.replace('postcss', ''));
});

meta.modules = meta.modules.sort((a, b) => {
    if (a.shortName < b.shortName) {
        return -1;
    }
    if (b.shortName < a.shortName) {
        return 1;
    }
    return 0;
});

const pkg = {
    ...cssnano,
    twitter: 'cssnano_',
    phenomic
};

export default {
    ...meta,
    pkg,
    favicons: [{
        rel: "icon",
        type: "image/png",
        href: "/assets/favicon.png"
    }, {
        rel: "icon",
        type: "image/svg",
        href: "/assets/favicon.svg"
    }]
};

import {phenomic} from '../package.json';
import cssnano from '../../packages/cssnano/package.json';
import meta from '../../metadata.toml';

const pkg = {
    ...cssnano,
    twitter: 'cssnano_',
    phenomic
};

export default {
    pkg,
    modules: meta,
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

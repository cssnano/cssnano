import rawCache from './rawCache.js';
import getArguments from './getArguments.js';
import sameParent from './sameParent.js';

const cssnanoUtils = { rawCache, getArguments, sameParent };

const moduleExports = cssnanoUtils;

export { moduleExports as default, moduleExports as 'module.exports' };

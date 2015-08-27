'use strict';

import valueParser from 'postcss-value-parser';

export default (node) => {
	return valueParser(node.value).nodes[0].type;
}
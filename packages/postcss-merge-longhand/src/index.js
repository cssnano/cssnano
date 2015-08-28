'use strict';

import postcss from 'postcss';
import margin from './lib/decl/margin';
import padding from './lib/decl/padding';
import border from './lib/decl/border';

const processors = [
  margin,
  padding,
  border
];

export default postcss.plugin('postcss-merge-longhand', () => {
  return css => {
    css.eachRule(rule => {
      processors.forEach(processor => processor.explode(rule));
      processors.slice().reverse().forEach(processor => processor.merge(rule));
    });
  };
});

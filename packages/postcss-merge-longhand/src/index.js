'use strict';

import postcss from 'postcss';
import margin from './lib/decl/margin';
import padding from './lib/decl/padding';
import border from './lib/decl/border';
import borderTop from './lib/decl/border-top';
import borderRight from './lib/decl/border-right';
import borderBottom from './lib/decl/border-bottom';
import borderLeft from './lib/decl/border-left';

const processors = [
  margin,
  padding,
  border,
  borderTop,
  borderRight,
  borderBottom,
  borderLeft
];

export default postcss.plugin('postcss-merge-longhand', () => {
  return css => {
    css.eachRule(rule => {
      processors.forEach(processor => processor.explode(rule));
      processors.slice().reverse().forEach(processor => processor.merge(rule));
    });
  };
});

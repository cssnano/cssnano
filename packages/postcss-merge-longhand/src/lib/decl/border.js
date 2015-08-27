import {list} from 'postcss';
import hasAllProps from '../hasAllProps';
import getLastNode from '../getLastNode';
import minifyTrbl from '../minifyTrbl';
import parseTrbl from '../parseTrbl';
import clone from '../clone';
import numValues from '../numValues';
import canMerge from '../canMerge';

let wsc = ['border-width', 'border-style', 'border-color'];
let trbl = ['border-top', 'border-right', 'border-bottom', 'border-left'];

export default {
  explode: (rule) => {
    rule.eachDecl('border', decl => {
      trbl.forEach(prop => {
        let node = clone(decl);
        node.prop = prop;
        rule.insertAfter(decl, node);
      });

      decl.removeSelf();
    });
  },
  merge: (rule) => {
    let decls = rule.nodes.filter(node => node.prop && ~trbl.indexOf(node.prop));
    while (decls.length) {
      let lastNode = decls[decls.length - 1];
      let props = decls.filter(node => node.important == lastNode.important);
      if (hasAllProps.apply(this, [props].concat(trbl))) {
        let rules = trbl.map(prop => getLastNode(props, prop));
        wsc.forEach((prop, index) => {
          let values = rules.map(node => list.space(node.value)[index]);
          let decl = clone(lastNode);
          decl.prop = prop;
          decl.value = values.join(' ');
          rule.insertAfter(lastNode, decl);
        });
        props.forEach(prop => prop.removeSelf());
      }
      decls = decls.filter(node => !~props.indexOf(node));
    }


    decls = rule.nodes.filter(node => node.prop && ~wsc.indexOf(node.prop));
    decls.forEach(node => node.value = minifyTrbl(node.value));

    while (decls.length) {
      let lastNode = decls[decls.length - 1];
      let valueLength = numValues(lastNode);
      let props = decls.filter(node =>
        node.important == lastNode.important &&
        numValues(node) == valueLength
      );

      if (hasAllProps.apply(this, [props].concat(wsc)) && canMerge.apply(this, props)) {
        let values = wsc.map(prop => getLastNode(props, prop).value);
        let shorthand = clone(lastNode);
        shorthand.prop = 'border';
        shorthand.value = values.join(' ');
        rule.insertAfter(lastNode, shorthand);
        props.forEach(prop => prop.removeSelf());
      }
      decls = decls.filter(node => !~props.indexOf(node));
    }
  }
};

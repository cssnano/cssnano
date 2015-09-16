'use strict';
import clone from '../clone';
import {list} from 'postcss';
import parseTrbl from '../parseTrbl';
import hasAllProps from '../hasAllProps';
import getLastNode from '../getLastNode';
import minifyTrbl from '../minifyTrbl';
import canMerge from '../canMerge';

let wsc = ['width', 'style', 'color'];
let tlbr = ['top', 'left', 'bottom', 'right'];
let defaults = ['medium', 'none', 'currentColor'];

export default {
	explode: rule => {
		// border -> border-tlbr
		rule.walkDecls('border', decl => {
			tlbr.forEach(direction => {
				let node = clone(decl);
				node.prop = `border-${direction}`;
				rule.insertAfter(decl, node);
			});
			decl.remove();
		});

		// border-tlbr -> border-tlbr-wsc
		tlbr.forEach(direction => {
			rule.walkDecls(`border-${direction}`, decl => {
				let values = list.space(decl.value);
				wsc.forEach((d, i) => {
					let node = clone(decl);
					node.prop = `border-${direction}-${d}`;
					node.value = values[i] !== undefined ? values[i] : defaults[i];
					rule.insertAfter(decl, node);
				});
				decl.remove();
			});
		});

		// border-wsc -> border-tlbr-wsc
		wsc.forEach((d, i) => {
			rule.walkDecls(`border-${d}`, decl => {
				let values = parseTrbl(decl.value);
				values.forEach((value, i) => {
					let node = clone(decl);
					let direction = tlbr[i];
					node.prop = `border-${direction}-${d}`;
					node.value = value;
					rule.insertAfter(decl, node);
				});
				decl.remove();
			});
		});
	},
	merge: rule => {
		// border-tlbr-wsc -> border-tlbr
		tlbr.forEach(direction => {
			let names = wsc.map(d => `border-${direction}-${d}`);
			let decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
			while (decls.length) {
				let lastNode = decls[decls.length - 1];
				let props = decls.filter(node => node.important === lastNode.important);
				if (hasAllProps.apply(this, [props].concat(names)) && canMerge.apply(this, props)) {
					let rules = names.map(prop => getLastNode(props, prop));
					let values = rules.map(node => node.value);
					let value = values.join(' ');
					let decl = clone(lastNode);
					decl.prop = `border-${direction}`;
					decl.value = value;
					rule.insertAfter(lastNode, decl);
					rules.forEach(prop => prop.remove());
				}
				decls = decls.filter(node => !~props.indexOf(node));
			}
		});

		// border-tlbr-wsc -> border-wsc
		wsc.forEach(d => {
			let names = tlbr.map(direction => `border-${direction}-${d}`);
			let decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
			while (decls.length) {
				let lastNode = decls[decls.length - 1];
				let props = decls.filter(node => node.important === lastNode.important);
				if (hasAllProps.apply(this, [props].concat(names))) {
					let rules = names.map(prop => getLastNode(props, prop));
					let value = rules.map(node => node.value).join(' ');
					let decl = clone(lastNode);
					decl.prop = `border-${d}`;
					decl.value = minifyTrbl(value);
					rule.insertAfter(lastNode, decl);
					props.forEach(prop => prop.remove());
				}
				decls = decls.filter(node => !~props.indexOf(node));
			}
		});

		// border-tlbr -> border
		let names = tlbr.map(direction => `border-${direction}`);
		let decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
		while (decls.length) {
			let lastNode = decls[decls.length - 1];
			let props = decls.filter(node => node.important === lastNode.important && node.value === lastNode.value);
			if (hasAllProps.apply(this, [props].concat(names)) && canMerge.apply(this, props)) {
				let values = list.space(lastNode.value);
				let value = values.concat(['']).reduceRight((prev, cur, i) => {
					if (prev === '' && cur === defaults[i]) return prev;
					return cur + " " + prev;
				}).trim();
				if (value === '') value = defaults[0];
				let decl = clone(lastNode);
				decl.prop = `border`;
				decl.value = value;
				rule.insertAfter(lastNode, decl);
				props.forEach(prop => prop.remove());
			}
			decls = decls.filter(node => !~props.indexOf(node));
		}

		// border-tlbr -> border-wsc
		decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
		while (decls.length) {
			let lastNode = decls[decls.length - 1];
			let props = decls.filter(node => node.important === lastNode.important);
			if (hasAllProps.apply(this, [props].concat(names))) {
				let rules = names.map(prop => getLastNode(props, prop));
				wsc.forEach((d, i) => {
					let value = rules.map(node => list.space(node.value)[i]);
					let decl = clone(lastNode);
					decl.prop = `border-${d}`;
					decl.value = minifyTrbl(value);
					rule.insertAfter(lastNode, decl);
				});
				props.forEach(prop => prop.remove());
			}
			decls = decls.filter(node => !~props.indexOf(node));
		}
	}
};

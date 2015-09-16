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
				let rules = names.map(prop => getLastNode(props, prop)).filter(Boolean);
				if (hasAllProps.apply(this, [rules].concat(names)) && canMerge.apply(this, rules)) {
					let values = rules.map(node => node.value);
					let value = values.join(' ');
					let decl = clone(lastNode);
					decl.prop = `border-${direction}`;
					decl.value = value;
					rule.insertAfter(lastNode, decl);
					rules.forEach(prop => prop.remove());
				}
				decls = decls.filter(node => !~rules.indexOf(node));
			}
		});

		// border-tlbr-wsc -> border-wsc
		wsc.forEach(d => {
			let names = tlbr.map(direction => `border-${direction}-${d}`);
			let decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
			while (decls.length) {
				let lastNode = decls[decls.length - 1];
				let props = decls.filter(node => node.important === lastNode.important);
				let rules = names.map(prop => getLastNode(props, prop)).filter(Boolean);
				if (hasAllProps.apply(this, [props].concat(names))) {
					let value = rules.map(node => node.value).join(' ');
					let decl = clone(lastNode);
					decl.prop = `border-${d}`;
					decl.value = minifyTrbl(value);
					rule.insertAfter(lastNode, decl);
					rules.forEach(prop => prop.remove());
				}
				decls = decls.filter(node => !~rules.indexOf(node));
			}
		});

		// border-tlbr -> border-wsc
		let names = tlbr.map(direction => `border-${direction}`);
		let decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
		while (decls.length) {
			let lastNode = decls[decls.length - 1];
			let props = decls.filter(node => node.important === lastNode.important);
			let rules = names.map(prop => getLastNode(props, prop)).filter(Boolean);
			if (hasAllProps.apply(this, [props].concat(names))) {
				wsc.forEach((d, i) => {
					let value = rules.map(node => list.space(node.value)[i]);
					let decl = clone(lastNode);
					decl.prop = `border-${d}`;
					decl.value = minifyTrbl(value);
					rule.insertAfter(lastNode, decl);
				});
				props.forEach(prop => prop.remove());
			}
			decls = decls.filter(node => !~rules.indexOf(node));
		}

		// border-wsc -> border
		// border-wsc -> border + border-color
		// border-wsc -> border + border-dir
		names = wsc.map(d => `border-${d}`);
		decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
		while (decls.length) {
			let lastNode = decls[decls.length - 1];
			let props = decls.filter(node => node.important === lastNode.important);
			if (hasAllProps.apply(this, [props].concat(names))) {
				let width = getLastNode(props, names[0]);
				let style = getLastNode(props, names[1]);
				let color = getLastNode(props, names[2]);

				if (list.space(width.value).length === 1 && list.space(style.value).length === 1) {
					let values;
					let del = props;
					if (list.space(color.value).length === 1 && color.value !== 'inherit') {
						values = [width, style, color].map(node => node.value);
					}
					else {
						values = [width, style].map(node => node.value);
						del = del.filter(node => node.prop !== names[2]);
					}

					let value = values.concat(['']).reduceRight((prev, cur, i) => {
						if (prev === '' && cur === defaults[i]) return prev;
						return cur + " " + prev;
					}).trim() || defaults[0];

					let decl = clone(lastNode);
					decl.prop = `border`;
					decl.value = value;
					rule.insertBefore(color, decl);
					del.forEach(prop => prop.remove());
				}
				else {
					let values = [width, style, color].map(node => parseTrbl(node.value));
					let mapped = [0, 1, 2, 3].map(i => {
						let vals = [values[0][i], values[1][i], values[2][i]];
						return vals.concat(['']).reduceRight((prev, cur, i) => {
							if (prev === '' && cur === defaults[i]) return prev;
							return cur + " " + prev;
						}).trim() || defaults[0];
					});

					let canMerge = (mapped[0] == mapped[1] && mapped[1] == mapped[2])
						|| (mapped[1] == mapped[2] && mapped[2] == mapped[3])
						|| (mapped[2] == mapped[3] && mapped[3] == mapped[0])
						|| (mapped[3] == mapped[0] && mapped[0] == mapped[1]);

					if (canMerge) {
						let reduced = mapped.reduce((a, b) => {
							a = Array.isArray(a) ? a : [a];
							if (!~a.indexOf(b)) a.push(b);
							return a;
						});

						let first = mapped.indexOf(reduced[0]) !== mapped.lastIndexOf(reduced[0]);
						let borderValue = first ? reduced[0] : reduced[1];
						let offValue = first ? reduced[1] : reduced[0];
						let direction = tlbr[mapped.indexOf(offValue)];

						let border = clone(lastNode);
						border.prop = `border`;
						border.value = borderValue;
						rule.insertAfter(lastNode, border);

						let offBorder = clone(lastNode);
						offBorder.prop = `border-${direction}`;
						offBorder.value = offValue;
						rule.insertAfter(border, offBorder);

						[width, style, color].forEach(prop => prop.remove());
					}
				}
			}
			decls = decls.filter(node => !~props.indexOf(node));
		}
	}
};

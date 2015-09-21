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
		wsc.forEach(d => {
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
					let value = rules.map(node => node.value).join(' ');
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

				if (hasAllProps.apply(this, [props].concat(names))) {
					let rules = names.map(prop => getLastNode(props, prop));
					let values = rules.map(node => parseTrbl(node.value));
					let mapped = [0, 1, 2, 3].map(i => [values[0][i], values[1][i], values[2][i]].join(' '));
					let closeEnough = (mapped[0] === mapped[1] && mapped[1] === mapped[2]) ||
						(mapped[1] === mapped[2] && mapped[2] === mapped[3]) ||
						(mapped[2] === mapped[3] && mapped[3] === mapped[0]) ||
						(mapped[3] === mapped[0] && mapped[0] === mapped[1]);

					let reduced = mapped.reduce((a, b) => {
						a = Array.isArray(a) ? a : [a];
						if (!~a.indexOf(b)) {
							a.push(b);
						}
						return a;
					});

					if (closeEnough && canMerge.apply(this, rules)) {
						let first = mapped.indexOf(reduced[0]) !== mapped.lastIndexOf(reduced[0]);
						let borderValue = first ? reduced[0] : reduced[1];

						let border = clone(lastNode);
						border.prop = `border`;
						border.value = borderValue;
						rule.insertAfter(lastNode, border);

						if (reduced[1]) {
							let offValue = first ? reduced[1] : reduced[0];
							let direction = tlbr[mapped.indexOf(offValue)];

							let offBorder = clone(lastNode);
							offBorder.prop = `border-${direction}`;
							offBorder.value = offValue;
							rule.insertAfter(border, offBorder);
						}
						props.forEach(prop => prop.remove());
					} else if (reduced.length === 1) {
						values = [width, style].map(node => node.value);
						let decl = clone(lastNode);
						decl.prop = `border`;
						decl.value = values.join(' ');
						rule.insertBefore(color, decl);
						props.filter(node => node.prop !== names[2]).forEach(prop => prop.remove());
					}
				}
			}
			decls = decls.filter(node => !~props.indexOf(node));
		}

		names = tlbr.map(direction => `border-${direction}`);
		rule.walkDecls('border', decl => {
			let next = decl.next();
			if (next && next.type === 'decl') {
				var index = names.indexOf(next.prop);
				if (index > -1) {
					let values = list.space(decl.value);
					let dirValues = list.space(next.value);

					if ( values[0] === dirValues[0] && values[1] === dirValues[1] && values[2] && dirValues[2]) {
						let colors = parseTrbl(values[2]);
						colors[index] = dirValues[2];
						values.pop();
						let borderValue = values.join(' ');
						let colorValue = minifyTrbl(colors);

						var origLength = decl.value.length + next.prop.length + next.value.length;
						var newLength = borderValue.length + 12 + colorValue.length;

						if (newLength < origLength) {
							decl.value = borderValue;
							next.prop = `border-color`;
							next.value = colorValue;
						}
					}
				}
			}
		});

		// clean-up values
		rule.walkDecls(/^border(-(top|right|bottom|left))?/, decl => {
			decl.value = list.space(decl.value).concat(['']).reduceRight((prev, cur, i) => {
				if (prev === '' && cur === defaults[i]) {
					return prev;
				}
				return cur + " " + prev;
			}).trim() || defaults[0];
		});
		rule.walkDecls(/^border(-(top|right|bottom|left))?(-(width|style|color))/, decl => {
			decl.value = minifyTrbl(decl.value);
		});
	}
};

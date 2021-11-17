"use strict";

const Input = require("postcss/lib/input");
const Document = require("./document");

const reNewLine = /\r?\n|\r/g;

class Locations {
	constructor(source) {
		let match;
		const lines = [];
		reNewLine.lastIndex = 0;
		while ((match = reNewLine.exec(source))) {
			lines.push(match.index);
		}
		lines.push(source.length);

		this.lines = lines;
		this.source = source;
	}

	getOffsetFromLoc(loc) {
		const lineIndex = loc.line - 2;
		return (lineIndex >= 0 ? this.lines[lineIndex] : -1) + loc.column;
	}

	getLocFromOffset(offset) {
		const lines = this.lines;
		for (let index = 0; index < lines.length; index++) {
			const lineEndIndex = lines[index];
			if (lineEndIndex >= offset) {
				const before = this.lines[index - 1];
				return {
					line: index + 1,
					column: offset - (before != null ? before : -1),
				};
			}
		}
		const before = this.lines[this.lines.length - 2];
		return {
			line: lines.length,
			column: offset - (before != null ? before : -1),
		};
	}
}

class LocalFixer {
	constructor(locations, style) {
		const { line, column } = locations.getLocFromOffset(style.startIndex);
		this.line = line - 1;
		this.column = column - 1;
		this.style = style;
		this.locations = locations;
	}

	fixLocation(object) {
		if (object) {
			if (object.line === 1) {
				object.column += this.column;
			}
			object.line += this.line;
			if (typeof object.offset === "number") {
				object.offset = this.locations.getOffsetFromLoc(object);
			}
			if (typeof object.endLine === "number") {
				if (object.endLine === 1) {
					object.endColumn += this.column;
				}
				object.endLine += this.line;
			}
		}
	}

	node(node) {
		this.fixLocation(node.source.start);
		this.fixLocation(node.source.end);
	}

	root(root) {
		this.node(root);
		root.walk((node) => {
			this.node(node);
		});
	}

	error(error) {
		if (error && error.name === "CssSyntaxError") {
			this.fixLocation(error);
			this.fixLocation(error.input);
			error.message = error.message.replace(
				/:\d+:\d+:/,
				`:${error.line}:${error.column}:`
			);
		}
		return error;
	}

	*parse(opts) {
		const style = this.style;
		const syntax = style.syntax;
		let root;
		try {
			root = syntax.parse(
				style.content,
				Object.assign(
					{},
					opts,
					{
						map: false,
					},
					style.opts
				)
			);
		} catch (error) {
			this.error(error);

			throw error;
		}

		if (root.type === "document") {
			for (const rootNode of root.nodes) {
				this.root(rootNode);
				patchRoot(rootNode, syntax);
				yield {
					root: rootNode,
					endOffset: this.getRootEndOffset(rootNode),
				};
			}
		} else {
			this.root(root);
			root.source.inline = Boolean(style.inline);
			root.source.lang = style.lang;
			root.source.syntax = syntax;
			patchRoot(root, syntax);
			yield { root, endOffset: this.getRootEndOffset(root) };
		}
	}

	getRootEndOffset(root) {
		const loc = new Locations(root.source.input.css).getLocFromOffset(
			root.source.input.css.length
		);
		if (loc.line === 1) {
			loc.column += root.source.start.column - 1;
		}
		loc.line += root.source.start.line - 1;
		const endOffset = this.locations.getOffsetFromLoc(loc);

		return endOffset;
	}
}

function docFixer(source, opts) {
	const locations = new Locations(source);
	return {
		parseStyle(style) {
			return new LocalFixer(locations, style).parse(opts);
		},
		getOffsetFromLoc(loc) {
			if (typeof loc.offset === "number") {
				return loc.offset;
			}
			return locations.getOffsetFromLoc(loc);
		},
	};
}

function parseStyles(source, opts, styles) {
	const document = new Document();

	let index = 0;
	if (styles.length) {
		const { parseStyle, getOffsetFromLoc } = docFixer(source, opts);
		styles
			.sort((a, b) => a.startIndex - b.startIndex)
			.forEach((style) => {
				for (const { root, endOffset } of parseStyle(style)) {
					if (style.blockInfo && style.blockInfo.callbackRoot) {
						style.blockInfo.callbackRoot(root);
					}
					root.raws.codeBefore = source.slice(
						index,
						getOffsetFromLoc(root.source.start)
					);

					// Note: Stylelint is still using this property.
					try {
						Object.defineProperty(root.raws, "beforeStart", {
							configurable: true,
							get() {
								return root.raws.codeBefore;
							},
							set(value) {
								root.raws.codeBefore = value;
							},
						});
					} catch {
						// ignore
					}

					index = endOffset;

					root.document = document;
					if (root.raws.codeAfter) {
						root.raws.codeAfter = ""; // reset
					}
					document.nodes.push(root);
				}
			});
	}

	const last = document.nodes[document.nodes.length - 1];
	if (last) {
		last.raws.codeAfter = index ? source.slice(index) : source;
	}
	document.source = {
		input: new Input(source, opts),
		start: {
			line: 1,
			column: 1,
		},
		opts,
	};
	return document;
}

module.exports = parseStyles;

function patchRoot(root, syntax) {
	const originalToString = root.toString;
	try {
		Object.defineProperty(root, "toString", {
			configurable: true,
			enumerable: false,
			value(stringifier) {
				return originalToString.call(this, stringifier || syntax);
			},
		});
	} catch {
		// ignore
	}
}

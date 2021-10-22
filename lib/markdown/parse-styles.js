"use strict";

const Input = require("postcss/lib/input");
const Document = require("./document");

const reNewLine = /\r?\n|\r/g;

class LocalFixer {
	constructor(lines, style) {
		let line = 0;
		let column = style.startIndex;
		lines.some((lineEndIndex, lineNumber) => {
			if (lineEndIndex >= style.startIndex) {
				line = lineNumber;
				if (lines[line - 1] != null) {
					column = style.startIndex - lines[line - 1] - 1;
				}
				return true;
			}
			return false;
		});

		this.line = line;
		this.column = column;
		this.style = style;
	}

	object(object) {
		if (object) {
			if (object.line === 1) {
				object.column += this.column;
			}
			object.line += this.line;
			if (typeof object.offset === "number") {
				object.offset += this.style.startIndex;
			}
		}
	}

	node(node) {
		this.object(node.source.start);
		this.object(node.source.end);
	}

	root(root) {
		this.node(root);
		if (root.type === "document") {
			for (const n of root.nodes) {
				this.root(n);
			}
		} else {
			root.walk((node) => {
				this.node(node);
			});
		}
	}

	error(error) {
		if (error && error.name === "CssSyntaxError") {
			this.object(error);
			this.object(error.input);
			error.message = error.message.replace(
				/:\d+:\d+:/,
				`:${error.line}:${error.column}:`
			);
		}
		return error;
	}

	parse(opts) {
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
		this.root(root);

		root.source.inline = Boolean(style.inline);
		root.source.lang = style.lang;
		root.source.syntax = syntax;
		patchRoot(root, syntax);
		return root;
	}
}

function docFixer(source, opts) {
	let match;
	const lines = [];
	reNewLine.lastIndex = 0;
	while ((match = reNewLine.exec(source))) {
		lines.push(match.index);
	}
	lines.push(source.length);
	return {
		parseStyle(style) {
			return new LocalFixer(lines, style).parse(opts);
		},
		getOffsetFromLoc(loc) {
			if (typeof loc.offset === "number") {
				return loc.offset;
			}
			const lineIndex = loc.line - 2;
			return (lineIndex >= 0 ? lines[lineIndex] : 0) + loc.column;
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
				const blockRoot = parseStyle(style);
				if (blockRoot) {
					for (const root of blockRoot.type === "document"
						? blockRoot.nodes
						: [blockRoot]) {
						root.raws.codeBefore = source.slice(
							index,
							getOffsetFromLoc(root.source.start)
						);

						// Note: Stylelint is still using this property.
						try {
							Object.defineProperty(root.raws, "beforeStart", {
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

						index =
							getOffsetFromLoc(root.source.start) +
							root.source.input.css.length;

						root.document = document;
						if (root.raws.codeAfter) {
							root.raws.codeAfter = ""; // reset
						}
						document.nodes.push(root);
					}
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
	Object.defineProperty(root, "toString", {
		enumerable: false,
		value(stringifier) {
			return originalToString.call(this, stringifier || syntax);
		},
	});
}

"use strict";

const postcssStringify = require("postcss/lib/stringify");
const Document = require("./markdown/document");

module.exports = stringify;

class CustomAppender {
	constructor(baseBuilder) {
		this.baseBuilder = baseBuilder;

		this.replacers = new Set();
		this.lastIsEndOfLine = false;

		this.append = this.append.bind(this);
	}

	append(origStr, ...args) {
		let str = origStr;
		for (const replacer of this.replacers) {
			str = replacer(str);
		}

		if (this.lastIsEndOfLine && /^\s*$/u.test(str)) {
			// Keep lastIsEndOfLine
		} else if (/\n\s*$/u.test(str)) {
			this.lastIsEndOfLine = true;
		} else {
			this.lastIsEndOfLine = false;
		}
		return this.baseBuilder(str, ...args);
	}

	appendCodeBefore(codeBefore, ...args) {
		this.append(codeBefore, ...args);
		if (!codeBefore) {
			return;
		}
		const lastSpaces = /\s*$/u.exec(codeBefore)[0];

		const hasLf = lastSpaces.includes("\n");
		if (hasLf) {
			return;
		}
		const lastChar = codeBefore[codeBefore.length - lastSpaces.length - 1];
		const isHTML = lastChar && /["'=>]/u.test(lastChar);
		if (isHTML) {
			return;
		}
		// Avoid concatenating with start quote.
		const avoidConcatQuoteReplacer = (str) => {
			if (!str) {
				return str;
			}
			this.removeReplacer(avoidConcatQuoteReplacer);
			const hasLf = /^\s*\n/.test(str);
			if (hasLf) {
				return str;
			}
			// Avoid concatenating with start quote.
			return `\n${str}`;
		};

		this.addReplacer(avoidConcatQuoteReplacer);
	}

	appendCodeAfter(codeAfter, ...args) {
		if (!this.lastIsEndOfLine) {
			// Avoid concatenating with end quote.
			const avoidConcatQuoteReplacer = (str) => {
				if (!str || /^[^\S\n]*$/u.test(str)) {
					return str;
				}
				this.removeReplacer(avoidConcatQuoteReplacer);
				const firstSpaces = /^\s*/u.exec(str)[0];
				const hasLf = firstSpaces.includes("\n");
				if (hasLf) {
					return str;
				}
				const firstChar = str[firstSpaces.length];
				const maybeHTML = firstChar && /["'/<]/u.test(firstChar);
				if (maybeHTML) {
					return str;
				}
				// Avoid concatenating with end quote.
				return `\n${str}`;
			};

			this.addReplacer(avoidConcatQuoteReplacer);
		}
		this.append(codeAfter, ...args);
	}

	addReplacer(replacer) {
		this.replacers.add(replacer);
	}

	removeReplacer(replacer) {
		this.replacers.delete(replacer);
	}
}

function stringify(node, builder) {
	if (!(node instanceof Document)) {
		const syntax = node.source.syntax || node.root().source.syntax;
		if (syntax && syntax.stringify) {
			syntax.stringify(node, builder);
		} else {
			postcssStringify(node, builder);
		}
		return;
	}

	if (node.nodes.length) {
		const customAppender = new CustomAppender(builder);
		node.nodes.forEach((root) => {
			customAppender.appendCodeBefore(root.raws.codeBefore, root, "codeBefore");

			const mdBlockquote = root.raws.mdBlockquote;

			let callbackAfter;
			if (mdBlockquote) {
				const blockquoteMarkerReplacer =
					buildBlockquoteMarkerReplacer(mdBlockquote);

				customAppender.addReplacer(blockquoteMarkerReplacer);

				callbackAfter = () => {
					customAppender.removeReplacer(blockquoteMarkerReplacer);
				};
			}

			if (root.source.syntax) {
				root.source.syntax.stringify(root, customAppender.append);
			} else {
				postcssStringify(root, customAppender.append);
			}
			if (callbackAfter) callbackAfter();

			customAppender.appendCodeAfter(
				root.raws.codeAfter || "",
				root,
				"codeAfter"
			);
		});
	} else {
		// If it do not have root, it will output the input.
		builder(node.source.input.css);
	}
}

function buildBlockquoteMarkerReplacer(mdBlockquote) {
	const baseMarker = mdBlockquote.baseMarker || "> ";
	const markers = mdBlockquote.markers || [];

	let index = 0;
	let needMark = true;
	return (origStr) => {
		if (!origStr) {
			return origStr;
		}
		const lines = origStr.split("\n");
		let str = "";
		const first = lines.shift();
		if (needMark) {
			str += replaceMarkerForLine(first);
			needMark = false;
		} else {
			str += first;
		}
		const last = lines.pop();

		for (const line of lines) {
			str += `\n${replaceMarkerForLine(line)}`;
		}

		if (last && stripMarker(last)) {
			str += `\n${replaceMarkerForLine(last)}`;
		} else {
			if (last != null) {
				str += "\n";
				needMark = true;
			}
		}
		return str;
	};

	function replaceMarkerForLine(line) {
		const lineContent = stripMarker(line);

		const lineIndex = index++;

		if (lineContent) {
			return baseMarker + lineContent;
		}
		return markers[lineIndex] || baseMarker;
	}

	function stripMarker(line) {
		return line.replace(new RegExp(`^\\s{0,${baseMarker.length}}`, "u"), "");
	}
}

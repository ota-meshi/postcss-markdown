"use strict";

const postcssStringify = require("postcss/lib/stringify");
const Document = require("./markdown/document");

module.exports = stringify;

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
		node.nodes.forEach((root) => {
			const replacers = new Set();
			let beforeIsEndOfLine = false;

			function customBuilder(origStr, ...args) {
				let str = origStr;
				for (const replacer of replacers) {
					str = replacer(str);
				}

				if (beforeIsEndOfLine && /^\s*$/u.test(str)) {
					// Keep beforeIsEndOfLine
				} else if (/\n\s*$/u.test(str)) {
					beforeIsEndOfLine = true;
				} else {
					beforeIsEndOfLine = false;
				}
				return builder(str, ...args);
			}

			customBuilder(root.raws.codeBefore, root, "codeBefore");

			if (root.raws.codeBefore) {
				const endOfBefore = />?\s*$/u.exec(root.raws.codeBefore)[0];
				const hasLf = endOfBefore.includes("\n");
				const isTagEnd = endOfBefore.includes(">");
				if (!hasLf && !isTagEnd) {
					// Avoid concatenating with start quote.
					const appended = false;

					// eslint-disable-next-line func-style -- ignore
					const avoidConcatQuoteReplacer = (str) => {
						if (appended || !str) {
							return str;
						}
						replacers.delete(avoidConcatQuoteReplacer);
						const hasLf = /^\s*/.exec(str)[0].includes("\n");
						return hasLf ? str : `\n${str}`;
					};
					replacers.add(avoidConcatQuoteReplacer);
				}
			}

			const mdBlockquote = root.raws.mdBlockquote;
			// eslint-disable-next-line func-style -- ignore
			let callbackAfter = () => {
				/* noop */
			};
			if (mdBlockquote) {
				const baseMarker = mdBlockquote.baseMarker || "> ";
				const markers = mdBlockquote.markers || [];

				let index = 0;

				// eslint-disable-next-line func-style -- ignore
				const stripMarker = (line) => {
					return line.replace(
						new RegExp(`^\\s{0,${baseMarker.length}}`, "u"),
						""
					);
				};
				// eslint-disable-next-line func-style -- ignore
				const processLineMark = (line) => {
					const lineContent = stripMarker(line);

					const lineIndex = index++;

					if (lineContent) {
						return baseMarker + lineContent;
					}
					return markers[lineIndex] || baseMarker;
				};

				let needMark = true;
				// eslint-disable-next-line func-style -- ignore
				const blockquoteMarkerReplacer = (origStr) => {
					if (!origStr) {
						return origStr;
					}
					const lines = origStr.split("\n");
					let str = "";
					const first = lines.shift();
					if (needMark) {
						str += processLineMark(first);
						needMark = false;
					} else {
						str += first;
					}
					const last = lines.pop();

					for (const line of lines) {
						str += `\n${processLineMark(line)}`;
					}

					if (last && stripMarker(last)) {
						str += `\n${processLineMark(last)}`;
					} else {
						if (last != null) {
							str += "\n";
							needMark = true;
						}
					}
					return str;
				};
				replacers.add(blockquoteMarkerReplacer);

				callbackAfter = () => {
					replacers.delete(blockquoteMarkerReplacer);
				};
			}

			if (root.source.syntax) {
				root.source.syntax.stringify(root, customBuilder);
			} else {
				postcssStringify(root, customBuilder);
			}
			callbackAfter();

			if (root.raws.codeAfter) {
				if (!beforeIsEndOfLine) {
					const startOfAfter = /^[\s>]*<?/u.exec(root.raws.codeAfter)[0];
					const hasLf = startOfAfter.includes("\n");
					const isTagStart = startOfAfter.includes("<");
					if (!hasLf && !isTagStart) {
						// Avoid concatenating with end quote.
						customBuilder("\n");
					}
				}
			}
			customBuilder(root.raws.codeAfter || "", root, "codeAfter");
		});
	} else {
		// If it do not have root, it will output the input.
		builder(node.source.input.css);
	}
}

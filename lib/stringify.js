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
			let buildHook = null;
			let beforeIsEndOfLine = false;

			function customBuilder(str, ...args) {
				if (buildHook) buildHook(str);

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
					buildHook = (str) => {
						if (appended || !str) {
							return;
						}
						const hasLf = /^\s*/.exec(str)[0].includes("\n");
						if (!hasLf) {
							builder("\n");
							beforeIsEndOfLine = true;
						}
						buildHook = null;
					};
				}
			}
			if (root.source.syntax) {
				root.source.syntax.stringify(root, customBuilder);
			} else {
				postcssStringify(root, customBuilder);
			}
			if (root.raws.codeAfter) {
				if (!beforeIsEndOfLine) {
					const startOfAfter = /^\s*<?/u.exec(root.raws.codeAfter)[0];
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

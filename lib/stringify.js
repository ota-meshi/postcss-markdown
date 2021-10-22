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
			builder(root.raws.codeBefore, root, "codeBefore");

			const hasBeforeLf =
				root.raws.codeBefore &&
				/\s*$/.exec(root.raws.codeBefore)[0].includes("\n");

			const wrappedBuilder = hasBeforeLf
				? builder
				: (() => {
						let appended = false;
						return (str, ...args) => {
							if (appended || !str) {
								return builder(str, ...args);
							}
							const hasLf = /^\s*/.exec(str)[0].includes("\n");
							if (!hasLf) {
								builder("\n");
							}
							appended = true;
							return builder(str, ...args);
						};
				  })();
			if (root.source.syntax) {
				root.source.syntax.stringify(root, wrappedBuilder);
			} else {
				postcssStringify(root, wrappedBuilder);
			}
			wrappedBuilder(root.raws.codeAfter || "", root, "codeAfter");
		});
	} else {
		// If it do not have root, it will output the input.
		builder(node.source.input.css);
	}
}

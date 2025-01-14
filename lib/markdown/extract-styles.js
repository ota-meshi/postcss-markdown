"use strict";

const fromMarkdown = require("mdast-util-from-markdown");
const frontmatter = require("mdast-util-frontmatter");
const syntax = require("micromark-extension-frontmatter");
const buildSyntaxResolver = require("../syntax/build-syntax-resolver");

function extractStyles(source, opts) {
	const resolveSyntax = buildSyntaxResolver(opts.config);

	const htmlInMd = (opts.config && opts.config.htmlInMd) !== false;

	const ast = fromMarkdown(source, {
		extensions: [syntax(["yaml", "toml"])],
		mdastExtensions: [frontmatter.fromMarkdown(["yaml", "toml"])],
	});
	const styles = [];

	const ignoreStatus = new Map();

	function addStyle(style, parent) {
		if (ignoreStatus.get(parent)) {
			if (style.isMarkdown) {
				return;
			}
		}
		const syntax = resolveSyntax(style.lang);
		if (!syntax) {
			return;
		}
		style.syntax = syntax;
		styles.push(style);
	}

	function processBlock(block, parent) {
		/** @type {string | null} */
		const lang = block.lang;
		if (!lang) {
			return;
		}
		let startIndex =
			source.indexOf(block.lang, block.position.start.offset) +
			block.lang.length;
		startIndex = source.indexOf("\n", startIndex) + 1;

		const blockInfo = getBlockInfo(block, startIndex, source);
		if (!blockInfo) {
			return;
		}
		addStyle(
			{
				startIndex,
				isMarkdown: true,
				content: blockInfo.content,
				lang: lang.toLowerCase(),
				blockInfo,
			},
			parent,
		);
	}

	function processHtml(nodes, parent) {
		if (
			nodes.every(
				(node) => node.type === "text" || isHtmlComment(node.value || ""),
			)
		) {
			// all comment
			return;
		}

		const startIndex = nodes[0].position.start.offset;

		addStyle(
			{
				startIndex,
				isMarkdown: false,
				content: source.slice(
					startIndex,
					nodes[nodes.length - 1].position.end.offset,
				),
				lang: "html",
			},
			parent,
		);
	}

	visit(ast, (node, parent, childIndex) => {
		if (node.type === "code") {
			processBlock(node, parent);
		} else if (node.type === "html" || node.type === "text") {
			if (htmlInMd) {
				const next = parent.children[childIndex + 1];
				if (!next || (next.type !== "html" && next.type !== "text")) {
					const nodes = [node];
					for (let index = childIndex - 1; index >= 0; index--) {
						const prev = parent.children[index];
						if (!prev || (prev.type !== "html" && prev.type !== "text")) {
							break;
						}
						nodes.unshift(prev);
					}
					processHtml(nodes, parent);
				}
			}
			if (node.value) {
				const comment = pickEndHtmlComment(node.value);
				if (comment != null) {
					const match = /(?:^|\s+)postcss-(\w+)(?:\s+|$)/i.exec(comment);
					if (match) {
						const directive = match[1].toLowerCase();
						if (directive === "ignore") {
							ignoreStatus.set(parent, true);
							return;
						}
					}
				}
			}
		}
		ignoreStatus.delete(parent);
	});

	return styles;
}

module.exports = extractStyles;

function visit(node, callback) {
	const nodes = [{ node, parent: null, index: 0 }];
	while (nodes.length) {
		const data = nodes.pop();
		callback(data.node, data.parent, data.index);
		const children = data.node.children || [];
		for (let index = children.length - 1; index >= 0; index--) {
			nodes.push({ node: children[index], parent: data.node, index });
		}
	}
}

/**
 * If the code block is in a parseable format, it returns that information.
 */
function getBlockInfo(block, startIndex, source) {
	const baseContent = source
		.slice(startIndex, block.position.end.offset)
		.replace(/[\t >]*`*$/, "");

	const simpleifiedBlock = simplifyCode(block.value);

	// Parse before block
	const beforeBlock = parseBeforeBlock(block, source);

	const matchBlockquoteCandidate = /^[\s>]+/.exec(beforeBlock);
	if (!matchBlockquoteCandidate || !matchBlockquoteCandidate[0].includes(">")) {
		if (simpleifiedBlock === simplifyCode(baseContent)) {
			return { type: "simple-block", content: baseContent };
		}
		// Cannot parses
		return null;
	}

	const baseBlockquoteMarker =
		matchBlockquoteCandidate[0] +
		beforeBlock.slice(matchBlockquoteCandidate[0].length).replace(/\S/g, " ");

	const blockquoteMarkers = [];
	const lines = baseContent.split("\n");
	let newContent = "";
	for (let index = 0; index < lines.length; index++) {
		const parsedLine = parseBlockLine(baseBlockquoteMarker, lines[index]);
		if (!parsedLine) {
			// Unknown leading marker
			return null;
		}
		if (index > 0) {
			newContent += "\n";
		}
		newContent += parsedLine.line;

		blockquoteMarkers.push(parsedLine.marker);
	}
	if (simpleifiedBlock === simplifyCode(newContent)) {
		return {
			type: "blockquote",
			content: newContent,
			callbackRoot(root) {
				root.raws.mdBlockquote = {
					baseMarker: baseBlockquoteMarker,
					markers: blockquoteMarkers,
				};
			},
			blockquoteMarker: {
				marker: baseBlockquoteMarker,
				markers: blockquoteMarkers,
			},
		};
	}
	// Cannot parses
	return null;
}

/**
 * Parses one line of the block.
 */
function parseBlockLine(beforeBlock, line) {
	if (!line) {
		return {
			type: "empty",
			marker: "",
			line: "",
		};
	}
	let marker = "";
	let indent = "";
	for (let index = 0; index < beforeBlock.length; index++) {
		const base = beforeBlock[index];
		if (index < line.length) {
			const ch = line[index];
			if (base !== ch) {
				return null;
			}
			marker += ch;
			indent += /\S/u.test(ch) ? " " : ch;
		} else {
			if (/\S/u.test(base)) {
				return null;
			}
			return { type: "blank", marker, line: "" };
		}
	}
	const after = line.slice(beforeBlock.length);
	if (!after) {
		return {
			type: "blank",
			marker,
			line: "",
		};
	}
	return {
		type: "line",
		marker,
		line: indent + after,
	};
}

/**
 * Parses before the code block.
 * It probably contains indents or ">".
 */
function parseBeforeBlock(block, source) {
	let beforeBlock = "";
	for (let index = block.position.start.offset - 1; index >= 0; index--) {
		const c = source[index];
		if (c === "\n") {
			break;
		}
		beforeBlock = c + beforeBlock;
	}
	return beforeBlock;
}

function simplifyCode(s) {
	return s.replace(/\s+/g, " ").trim();
}

/**
 * @param {string} str
 * @returns {string | null}
 */
function pickEndHtmlComment(str) {
	if (!str.endsWith("-->")) {
		return null;
	}
	const index = str.lastIndexOf("<!--");
	if (index < 0) {
		return null;
	}

	return str.slice(index + 4, -3);
}

function isHtmlComment(str) {
	const comment = pickEndHtmlComment(str);
	if (comment == null) {
		return false;
	}
	return str === `<!--${comment}-->`;
}

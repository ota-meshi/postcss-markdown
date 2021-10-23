"use strict";

const fromMarkdown = require("mdast-util-from-markdown");
const buildSyntaxResolver = require("../syntax/build-syntax-resolver");

function extractStyles(source, opts) {
	const resolveSyntax = buildSyntaxResolver(opts.config);

	const htmlInMd = (opts.config && opts.config.htmlInMd) !== false;

	const ast = fromMarkdown(source);
	const styles = [];

	const ignoreStatus = new Map();

	function addStyle(style, parent) {
		if (ignoreStatus.get(parent)) {
			if (style.isMarkdown || /^<style/iu.test(style.content)) {
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

		const baseContent = source
			.slice(startIndex, block.position.end.offset)
			.replace(/[\t >]*`*$/, "");

		const blockInfo = getBlockInfo(block, baseContent);
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
			parent
		);

		function getBlockInfo(block, content) {
			const simpleifiedBlock = simplifyCode(block.value);
			if (simpleifiedBlock === simplifyCode(content)) {
				return { type: "simple-block", content };
			}

			let beforeBlock = "";
			for (let index = block.position.start.offset - 1; index >= 0; index--) {
				const c = source[index];
				if (c === "\n") {
					break;
				}
				beforeBlock = c + beforeBlock;
			}

			if (!/^[\s>]*$/u.test(beforeBlock)) {
				// Cannot parses
				return null;
			}
			const blockquoteMarkLength = beforeBlock.trimEnd().length;

			function processLine(line) {
				if (!line) {
					return { type: "empty", marker: "", line: "" };
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
						if (index < blockquoteMarkLength) {
							return null;
						}
						return { type: "blank", marker, line: "" };
					}
				}
				const after = line.slice(beforeBlock.length);
				if (!after) {
					return { type: "blank", marker, line: "" };
				}
				return { type: "line", marker, line: indent + after };
			}

			const blockquoteMarkers = [];
			const lines = content.split("\n");
			let newContent = "";
			for (let index = 0; index < lines.length; index++) {
				const mark = processLine(lines[index]);
				if (mark) {
					if (index > 0) {
						newContent += "\n";
					}
					newContent += mark.line;
				} else {
					// Cannot parses
					return null;
				}
				blockquoteMarkers.push(mark.marker);
			}
			if (simpleifiedBlock === simplifyCode(newContent)) {
				return {
					type: "blockquote",
					content: newContent,
					callbackRoot(root) {
						root.raws.mdBlockquoteMarker = {
							base: beforeBlock,
							markers: blockquoteMarkers,
						};
					},
					blockquoteMarker: { marker: beforeBlock, markers: blockquoteMarkers },
				};
			}
			// Cannot parses
			return null;
		}

		function simplifyCode(s) {
			return s.replace(/\s+/g, " ").trim();
		}
	}

	function processHtml(node, parent) {
		const startIndex = node.position.start.offset;

		addStyle(
			{
				startIndex,
				isMarkdown: false,
				content: source.slice(startIndex, node.position.end.offset),
				lang: "html",
			},
			parent
		);
	}

	visit(ast, (node, parent) => {
		if (node.type === "code") {
			processBlock(node, parent);
		} else if (node.type === "html") {
			if (node.value) {
				const comment = /^<!--([\s\S]*)-->$/u.exec(node.value);
				if (comment) {
					const commentValue = comment[1];
					if (commentValue.trim() === "postcss-ignore") {
						ignoreStatus.set(parent, true);
						return;
					}
				} else {
					if (htmlInMd) {
						processHtml(node, parent);
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
	const nodes = [{ node, parent: null }];
	while (nodes.length) {
		const data = nodes.pop();
		callback(data.node, data.parent);
		const children = data.node.children || [];
		for (let index = children.length - 1; index >= 0; index--) {
			nodes.push({ node: children[index], parent: data.node });
		}
	}
}

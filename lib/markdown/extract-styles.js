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
		styles.push(style);
	}

	function processBlock(block, parent) {
		/** @type {string | null} */
		const lang = block.lang;
		if (!lang) {
			return;
		}
		const syntax = resolveSyntax(lang);
		if (!syntax) {
			return;
		}
		let startIndex =
			source.indexOf(block.lang, block.position.start.offset) +
			block.lang.length;
		startIndex = source.indexOf("\n", startIndex) + 1;

		const content = source
			.slice(startIndex, block.position.end.offset)
			.replace(/[\t ]*`*$/, "");
		if (
			block.value.replace(/\s+/g, " ").trim() !==
			content.replace(/\s+/g, " ").trim()
		) {
			return;
		}
		addStyle(
			{
				startIndex,
				isMarkdown: true,
				content,
				lang: lang.toLowerCase(),
				syntax,
			},
			parent
		);
	}

	function processHtml(node, parent) {
		const syntax = resolveSyntax("html");
		if (!syntax) {
			return;
		}
		const startIndex = node.position.start.offset;

		addStyle(
			{
				startIndex,
				isMarkdown: false,
				content: source.slice(startIndex, node.position.end.offset),
				lang: "html",
				syntax,
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

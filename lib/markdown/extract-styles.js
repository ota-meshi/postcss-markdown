"use strict";

const remarkParse = require("remark-parse");
const unified = require("unified");
const buildSyntaxResolver = require("../syntax/build-syntax-resolver");

const remarkParser = unified().use(remarkParse);

function extractStyles(source, opts) {
	const resolveSyntax = buildSyntaxResolver(opts.config);

	const htmlInMd = (opts.config && opts.config.htmlInMd) !== false;

	const ast = remarkParser().parse(source);
	const styles = [];
	visit(ast, (node, parent) => {
		if (node.type === "code") {
			if (parent !== ast) {
				// Currently it only supports root level blocks.
				return;
			}
			const block = node;
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
			if (block.value) {
				startIndex = source.indexOf(block.value, startIndex);
			} else {
				startIndex = source.indexOf("\n", startIndex) + 1;
			}
			styles.push({
				startIndex,
				isMarkdown: true,
				content: source
					.slice(startIndex, block.position.end.offset)
					.replace(/[\t ]*`*$/, ""),
				lang: lang.toLowerCase(),
				syntax,
			});
			return;
		}
		if (node.type === "html") {
			if (!node.value) {
				return;
			}
			if (htmlInMd && /^<style/iu.test(node.value)) {
				const syntax = resolveSyntax("html");
				if (!syntax) {
					return;
				}
				const startIndex = node.position.start.offset;
				styles.push({
					startIndex,
					isMarkdown: false,
					content: source.slice(startIndex, node.position.end.offset),
					lang: "html",
					syntax,
				});
			}
		}
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

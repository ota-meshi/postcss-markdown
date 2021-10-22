"use strict";

const parse = require("./parse");
const stringify = require("./stringify");

function postcssMarkdown(config) {
	const syntax = {
		parse: (source, opts) =>
			parse(String(source), { config, syntax, ...(opts || {}) }),
		stringify,
	};
	return syntax;
}

const defaultSyntax = postcssMarkdown();
postcssMarkdown.parse = defaultSyntax.parse;
postcssMarkdown.stringify = defaultSyntax.stringify;

module.exports = postcssMarkdown;

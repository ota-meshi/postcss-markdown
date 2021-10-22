"use strict";

const extract = require("./markdown/extract-styles");
const parseStyles = require("./markdown/parse-styles");

module.exports = function parse(source, opts) {
	const document = parseStyles(source, opts, extract(source, opts));
	document.source.lang = "markdown";
	document.source.syntax = opts.syntax;
	return document;
};

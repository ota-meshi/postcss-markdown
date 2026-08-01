import extract from "./markdown/extract-styles.js";
import parseStyles from "./markdown/parse-styles.js";

export default function parse(source, opts) {
	const document = parseStyles(source, opts, extract(source, opts));
	document.source.lang = "markdown";
	document.source.syntax = opts.syntax;
	return document;
}

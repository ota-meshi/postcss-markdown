import parse from "./parse.js";
import stringify from "./stringify.js";

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

export default postcssMarkdown;
export { postcssMarkdown as "module.exports" };

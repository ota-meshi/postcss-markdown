import { parse as postcssParse, stringify as postcssStringify } from "postcss";
import postcssSafeParser from "postcss-safe-parser";

export const cssSyntax = {
	parse: postcssParse,
	stringify: postcssStringify,
};
export const cssSafeSyntax = {
	parse: postcssSafeParser,
	stringify: postcssStringify,
};

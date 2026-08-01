import { createRequire } from "module";
import path from "path";
import postcssSafeParser from "postcss-safe-parser";
import { cssSyntax, cssSafeSyntax } from "./syntaxes.js";

const defaultRules = [
	{
		test: /^sass$/i,
		lang: "sass",
	},
	{
		test: /^scss$/i,
		lang: "scss",
	},
	{
		test: /^less$/i,
		lang: "less",
	},
	{
		test: /^s(?:ugar)?ss$/i,
		lang: "sugarss",
	},
	{
		test: /^styl(?:us)?$/i,
		lang: "stylus",
	},
	{
		test: /^p(?:ost)?css$/i,
		lang: "css",
	},
];
const defaultSyntaxes = {
	sass: "postcss-sass",
	scss: "postcss-scss",
	less: "postcss-less",
	sugarss: "sugarss",
	stylus: "postcss-styl",
	html: "postcss-html",
	vue: "postcss-html",
	svelte: "postcss-html",
	xml: "postcss-html",
};

export default function buildSyntaxResolver(config) {
	const { rules = [], htmlInMd: _htmlInMd, ...syntaxes } = config || {};
	const allRules = [...rules, ...defaultRules];

	const definedLangs = new Set([
		"css",
		...rules.map((rule) => rule.lang),
		...Object.keys(syntaxes),
	]);

	return function resolve(baseLang) {
		let lang = baseLang || "css";

		const cwd = process.cwd();
		const placeholderFilePath = path.join(cwd, `__placeholder__.${lang}`);

		for (const rule of allRules) {
			const regex = new RegExp(rule.test);
			if (regex.test(lang) || regex.test(placeholderFilePath)) {
				lang = rule.lang;
				break;
			}
		}
		lang = lang.toLowerCase();
		const syntax = syntaxes[lang] || defaultSyntaxes[lang];
		if (syntax) {
			if (typeof syntax === "string") {
				const syntaxModule = loadFromString(syntax);
				if (syntaxModule) {
					return syntaxModule;
				}
				if (definedLangs.has(lang)) {
					throw new Error(
						`Cannot resolve module "${syntax}". It's likely that the module isn't installed correctly. Try reinstalling by running the \`npm install ${syntax}@latest --save-dev\``,
					);
				}
			}
			if (syntax === postcssSafeParser) {
				return cssSafeSyntax;
			}
			if (typeof syntax.parse === "function") {
				return syntax;
			}
		}

		if (!definedLangs.has(lang)) {
			return null;
		}

		return cssSyntax;
	};
}

const localRequire = createRequire(import.meta.url);

const standardModuleResolvers = {
	"postcss-sass": () => localRequire("postcss-sass"),
	"postcss-scss": () => localRequire("postcss-scss"),
	"postcss-less": () => localRequire("postcss-less"),
	sugarss: () => localRequire("sugarss"),
	"postcss-styl": () => localRequire("postcss-styl"),
	"postcss-html": () => localRequire("postcss-html"),
};

function loadFromString(syntax) {
	if (syntax === "postcss") {
		return cssSyntax;
	}
	if (syntax === "postcss-safe-parser") {
		return cssSafeSyntax;
	}

	try {
		const cwd = process.cwd();
		const relativeTo = path.join(cwd, "__placeholder__.js");
		return createRequire(relativeTo)(syntax);
	} catch (error) {
		if (!isModuleNotFoundError(error)) {
			throw error;
		}
		// ignore
	}

	if (standardModuleResolvers[syntax]) {
		try {
			return standardModuleResolvers[syntax]();
		} catch (error) {
			if (!isModuleNotFoundError(error)) {
				throw error;
			}
			// ignore
		}
	}

	return null;
}

function isModuleNotFoundError(error) {
	return (
		error && typeof error === "object" && error.code === "MODULE_NOT_FOUND"
	);
}

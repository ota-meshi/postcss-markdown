"use strict";

const path = require("path");
const postcssSafeParser = require("postcss-safe-parser");
const { cssSyntax, cssSafeSyntax } = require("./syntaxes");

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

module.exports = function buildSyntaxResolver(config) {
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
};

const standardModuleResolvers = {
	// eslint-disable-next-line node/no-missing-require -- ignore
	"postcss-sass": () => require("postcss-sass"),
	// eslint-disable-next-line node/no-unpublished-require -- ignore
	"postcss-scss": () => require("postcss-scss"),
	// eslint-disable-next-line node/no-unpublished-require -- ignore
	"postcss-less": () => require("postcss-less"),
	// eslint-disable-next-line node/no-unpublished-require -- ignore
	sugarss: () => require("sugarss"),
	// eslint-disable-next-line node/no-unpublished-require -- ignore
	"postcss-styl": () => require("postcss-styl"),
	// eslint-disable-next-line node/no-unpublished-require -- ignore
	"postcss-html": () => require("postcss-html"),
};

function loadFromString(syntax) {
	if (syntax === "postcss") {
		return cssSyntax;
	}
	if (syntax === "postcss-safe-parser") {
		return cssSafeSyntax;
	}

	try {
		const m = require("module");
		const cwd = process.cwd();
		const relativeTo = path.join(cwd, "__placeholder__.js");
		// eslint-disable-next-line node/no-unsupported-features/node-builtins -- ignore
		return m.createRequire(relativeTo)(syntax);
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

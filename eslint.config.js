import myPlugin from "@ota-meshi/eslint-plugin";

export default [
	{
		ignores: ["coverage", ".nyc_output", ".claude"],
	},
	...myPlugin.config({
		node: true,
		json: true,
		yaml: true,
		packageJson: true,
		prettier: true,
	}),
	{
		rules: {
			"jsdoc/require-jsdoc": "off",
			"no-warning-comments": "warn",
			"no-lonely-if": "off",
			"new-cap": "off",
			"no-shadow": "off",
			"prefer-const": "error",
		},
	},
	{
		files: ["test/**/*.js"],
		rules: {
			"no-console": "off",
		},
	},
];

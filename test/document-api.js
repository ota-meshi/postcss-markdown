"use strict";

const expect = require("chai").expect;

const postcss = require("postcss");
const syntax = require("../");

describe("api tests", () => {
	it("stringify for append node", () => {
		const md = [
			//
			"```css",
			"a {",
			"\tdisplay: flex;",
			"}",
			"```",
		].join("\n");
		return postcss([
			function (root) {
				root.append({
					selector: "b",
				});
			},
		])
			.process(md, {
				syntax,
				from: "append.md",
			})
			.then((result) => {
				expect(result.root.source).to.haveOwnProperty("lang", "markdown");
				expect(result.content).to.equal(
					[
						//
						"```css",
						"a {",
						"\tdisplay: flex;",
						"}",
						"b {}",
						"```",
					].join("\n")
				);
			});
	});

	it("stringify for prepend node", () => {
		const md = [
			//
			"```css",
			"a {",
			"\tdisplay: flex;",
			"}",
			"```",
		].join("\n");
		return postcss([
			function (root) {
				root.prepend({
					selector: "b",
				});
			},
		])
			.process(md, {
				syntax,
				from: "prepend.md",
			})
			.then((result) => {
				expect(result.root.source).to.haveOwnProperty("lang", "markdown");
				expect(result.content).to.equal(
					[
						//
						"```css",
						"b {}",
						"a {",
						"\tdisplay: flex;",
						"}",
						"```",
					].join("\n")
				);
			});
	});

	it("stringify for insertBefore node", () => {
		function insertBeforePlugin() {
			return {
				postcssPlugin: "insertBeforePlugin",
				Root(root) {
					root.insertBefore(
						root.last,
						postcss.rule({
							selector: "b",
						})
					);
				},
			};
		}

		insertBeforePlugin.postcss = true;
		const md = [
			"```css",
			"a {",
			"\tdisplay: flex;",
			"}",
			"```",
			"```css",
			"a {",
			"\tdisplay: flex;",
			"}",
			"```",
		].join("\n");
		return postcss([insertBeforePlugin])
			.process(md, {
				syntax,
				from: "insertBefore.md",
			})
			.then((result) => {
				expect(result.root.source).to.haveOwnProperty("lang", "markdown");
				expect(result.content).to.equal(
					[
						"```css",
						"",
						"b {}",
						"a {",
						"\tdisplay: flex;",
						"}",
						"```",
						"```css",
						"",
						"b {}",
						"a {",
						"\tdisplay: flex;",
						"}",
						"```",
					].join("\n")
				);
			});
	});

	it("stringify for insertAfter node", () => {
		function insertAfterPlugin() {
			return {
				postcssPlugin: "insertAfterPlugin",
				Root(root) {
					root.insertAfter(
						root.first,
						postcss.rule({
							selector: "b",
						})
					);
				},
			};
		}

		insertAfterPlugin.postcss = true;
		const md = [
			//
			"```css",
			"a {",
			"\tdisplay: flex;",
			"}",
			"```",
			"```css",
			"a {",
			"\tdisplay: flex;",
			"}",
			"```",
		].join("\n");
		return postcss([insertAfterPlugin])
			.process(md, {
				syntax,
				from: "insertAfter.md",
			})
			.then((result) => {
				expect(result.root.source).to.haveOwnProperty("lang", "markdown");
				expect(result.content).to.equal(
					[
						"```css",
						"a {",
						"\tdisplay: flex;",
						"}b {}",
						"```",
						"```css",
						"a {",
						"\tdisplay: flex;",
						"}b {}",
						"```",
					].join("\n")
				);
			});
	});

	it("stringify for unshift node", () => {
		function unshiftNodePlugin() {
			return {
				postcssPlugin: "unshiftNodePlugin",
				Root(root) {
					root.nodes = [...postcss.parse("b {}").nodes, ...root.nodes];
				},
			};
		}

		unshiftNodePlugin.postcss = true;
		const md = [
			//
			"```css",
			"a {",
			"\tdisplay: flex;",
			"}",
			"```",
		].join("\n");
		return postcss([unshiftNodePlugin])
			.process(md, {
				syntax,
				from: "unshift.md",
			})
			.then((result) => {
				expect(result.root.source).to.haveOwnProperty("lang", "markdown");
				expect(result.content).to.equal(
					[
						//
						"```css",
						"b {}a {",
						"\tdisplay: flex;",
						"}",
						"```",
					].join("\n")
				);
			});
	});

	it("stringify for push node", () => {
		function pushNodePlugin() {
			return {
				postcssPlugin: "pushNodePlugin",
				Root(root) {
					root.nodes = [...root.nodes, ...postcss.parse("b {}").nodes];
				},
			};
		}

		pushNodePlugin.postcss = true;

		const md = [
			//
			"```css",
			"a {",
			"\tdisplay: flex;",
			"}",
			"```",
		].join("\n");

		return postcss([pushNodePlugin])
			.process(md, {
				syntax,
				from: "push.md",
			})
			.then((result) => {
				expect(result.root.source).to.haveOwnProperty("lang", "markdown");
				expect(result.content).to.equal(
					[
						//
						"```css",
						"a {",
						"\tdisplay: flex;",
						"}b {}",
						"```",
					].join("\n")
				);
			});
	});

	it("stringify for nodes array", () => {
		function nodesArrayPlugin() {
			return {
				postcssPlugin: "nodesArrayPlugin",
				Root(root) {
					root.nodes = postcss.parse("b {}").nodes;
				},
			};
		}

		nodesArrayPlugin.postcss = true;

		const md = [
			//
			"```css",
			"",
			"",
			"```",
		].join("\n");
		return postcss([nodesArrayPlugin])
			.process(md, {
				syntax,
				from: "push.md",
			})
			.then((result) => {
				expect(result.root.source).to.haveOwnProperty("lang", "markdown");
				expect(result.content).to.equal(
					[
						//
						"```css",
						"b {}",
						"",
						"```",
					].join("\n")
				);
			});
	});

	it("stringify for nodes array", () => {
		function nodesArrayPlugin() {
			return {
				postcssPlugin: "nodesArrayPlugin",
				Root(root) {
					root.nodes = postcss.parse("b {}").nodes;
				},
			};
		}

		nodesArrayPlugin.postcss = true;

		const md = "<style></style>";
		return postcss([nodesArrayPlugin])
			.process(md, {
				syntax,
				from: "push.md",
			})
			.then((result) => {
				expect(result.root.source).to.haveOwnProperty("lang", "markdown");
				expect(result.content).to.equal(
					[
						//
						"<style>",
						"b {}</style>",
					].join("\n")
				);
			});
	});
});

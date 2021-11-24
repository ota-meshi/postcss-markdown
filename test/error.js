"use strict";

const path = require("path");
const expect = require("chai").expect;
const syntax = require("../");

describe("error tests", () => {
	it("single line syntax error", () => {
		const md = [
			//
			"<style>a {</style>",
		].join("\n");
		expect(() => {
			syntax.parse(md, {
				from: "SyntaxError.vue",
			});
		})
			.to.throw(/SyntaxError.vue:1:8: Unclosed block\b/)
			.with.include({ line: 1, column: 8 })
			.have.property("input")
			.include({ line: 1, column: 8 });

		const md2 = [
			//
			"<style>foo foo</style>",
		].join("\n");
		expect(() => {
			syntax.parse(md2, {
				from: "SyntaxError.vue",
			});
		})
			.to.throw(/SyntaxError.vue:1:8: Unknown word\b/)
			.with.include({ line: 1, column: 8, endLine: 1, endColumn: 11 })
			.have.property("input")
			.include({ line: 1, column: 8, endLine: 1, endColumn: 11 });
	});

	it("multi line syntax error", () => {
		const md = [
			//
			"",
			"",
			"<style>a {</style>",
		].join("\n");
		expect(() => {
			syntax.parse(md, {
				from: "SyntaxError.html",
			});
		})
			.to.throw(/SyntaxError.html:3:8: Unclosed block\b/)
			.with.include({ line: 3, column: 8 })
			.have.property("input")
			.include({ line: 3, column: 8 });
	});
	it("multi line syntax error with block", () => {
		const md = [
			//
			"```css",
			"a {",
			"```",
		].join("\n");
		expect(() => {
			syntax.parse(md, {
				from: "SyntaxError.html",
			});
		})
			.to.throw(/SyntaxError.html:2:1: Unclosed block\b/)
			.with.include({ line: 2, column: 1 })
			.have.property("input")
			.include({ line: 2, column: 1 });

		const md2 = [
			//
			"```css",
			"foo foo",
			"```",
		].join("\n");
		expect(() => {
			syntax.parse(md2, {
				from: "SyntaxError.html",
			});
		})
			.to.throw(/SyntaxError.html:2:1: Unknown word\b/)
			.with.include({ line: 2, column: 1, endLine: 2, endColumn: 4 })
			.have.property("input")
			.include({ line: 2, column: 1, endLine: 2, endColumn: 4 });
	});
	it("require error", () => {
		const md = [
			//
			"```foo",
			"Unknown",
			"```",
		].join("\n");
		const parser = syntax({
			foo: path.join(__dirname, "./error-test-module.txt"),
		});
		expect(() =>
			parser.parse(md, {
				from: "markdown.md",
			})
		).to.throw("TEST");
	});
	it("define rules option", () => {
		const md = [
			//
			"```foo",
			"// comment",
			"```",
		].join("\n");
		const parser = syntax({
			rules: [
				{
					test: /^foo$/,
					lang: "foo",
				},
			],
		});
		expect(() =>
			parser.parse(md, {
				from: "markdown.md",
			})
		).to.throw("Unknown word");
	});
	it("define syntax option", () => {
		const md = [
			//
			"```foo",
			"// comment",
			"```",
		].join("\n");
		const parser = syntax({
			foo: "postcss-foo",
		});
		expect(() =>
			parser.parse(md, {
				from: "markdown.md",
			})
		).to.throw('Cannot resolve module "postcss-foo"');
	});
});

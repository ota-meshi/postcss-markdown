"use strict";

const expect = require("chai").expect;
const syntax = require("../");

describe("syntax option tests", () => {
	it("syntax option", () => {
		const md = [
			"```s",
			".foo",
			"  color red",
			"```",
			"```css",
			"// comment",
			".foo { color: pink; }",
			"  .bar {}",
			"```",
		].join("\n");
		const document = syntax({
			s: require("postcss-styl"),
			css: require("postcss-scss"),
		}).parse(md, {
			from: "markdown.md",
		});
		expect(document.source).to.haveOwnProperty("lang", "markdown");
		expect(document.nodes).to.have.lengthOf(2);
		expect(document.nodes[0].source).to.haveOwnProperty("lang", "s");
		expect(document.nodes[0].nodes.map(simplNode)).to.deep.equals([
			{
				type: "rule",
				nodes: [{ type: "decl" }],
			},
		]);
		expect(document.nodes[1].source).to.haveOwnProperty("lang", "css");
		expect(document.nodes[1].nodes.map(simplNode)).to.deep.equals([
			{ type: "comment" },
			{
				type: "rule",
				nodes: [{ type: "decl" }],
			},
			{ type: "rule", nodes: [] },
		]);
		expect(document.toString()).to.equal(md);
	});
	it("syntax option for HTML", () => {
		const md = [
			"```html",
			"<style lang='s'>",
			".foo",
			"  color red",
			"</style>",
			"```",
			"",
			"<style lang='css'>",
			"// comment",
			".foo { color: pink;// comment",
			"}",
			"  .bar {}",
			"</style>",
		].join("\n");
		const document = syntax({
			s: require("postcss-styl"),
			css: require("postcss-scss"),
		}).parse(md, {
			from: "markdown.md",
		});
		expect(document.source).to.haveOwnProperty("lang", "markdown");
		expect(document.nodes).to.have.lengthOf(2);
		expect(document.nodes[0].source).to.haveOwnProperty("lang", "s");
		expect(document.nodes[0].nodes.map(simplNode)).to.deep.equals([
			{
				type: "rule",
				nodes: [{ type: "decl" }],
			},
		]);
		expect(document.nodes[1].source).to.haveOwnProperty("lang", "css");
		expect(document.nodes[1].nodes.map(simplNode)).to.deep.equals([
			{ type: "comment" },
			{
				type: "rule",
				nodes: [{ type: "decl" }, { type: "comment" }],
			},
			{ type: "rule", nodes: [] },
		]);
		expect(document.toString()).to.equal(md);
	});
	it("not define syntax option", () => {
		const md = [
			//
			"```foo",
			"// comment",
			"```",
		].join("\n");
		const parser = syntax();
		const document = parser.parse(md, {
			from: "markdown.md",
		});
		expect(document.source).to.haveOwnProperty("lang", "markdown");
		expect(document.nodes).to.have.lengthOf(0);
		expect(document.toString()).to.equal(md);
	});
});

function simplNode(node) {
	const ret = {
		type: node.type,
	};
	if (node.nodes) {
		ret.nodes = node.nodes.map(simplNode);
	}
	return ret;
}

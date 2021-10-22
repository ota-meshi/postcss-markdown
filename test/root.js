"use strict";

const expect = require("chai").expect;
const syntax = require("../");

describe("Root node tests", () => {
	it("toString", () => {
		const markdown = [
			"```stylus",
			"a",
			"  display flex",
			".b",
			"  color red",
			"  .c",
			"    color red",
			"```",
		].join("\n");
		const document = syntax.parse(markdown, {
			from: "stylus.markdown",
		});
		expect(document.source).to.haveOwnProperty("lang", "markdown");
		expect(document.nodes).to.have.lengthOf(1);
		expect(document.nodes[0].toString()).equal(
			[
				"a",
				"  display flex",
				".b",
				"  color red",
				"  .c",
				"    color red",
				"",
			].join("\n")
		);
	});
});

"use strict";

const path = require("path");
const expect = require("chai").expect;
const syntax = require("../");

describe("error tests", () => {
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
});
